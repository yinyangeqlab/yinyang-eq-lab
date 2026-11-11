/** Browser entry point for the offline renderer. It is never routed by the app. */
import { createRoot } from "react-dom/client";
import { WelcomeFlights } from "../../components/welcome-landscape";
import { createWallpaperFlightPainter } from "../../components/welcome-flight-model";
import { createWelcomeFlight } from "../../lib/welcome-flight-path";
import { createLandscapeRenderer, LANDSCAPE_CYCLE_SECONDS } from "../../lib/welcome-landscape";

declare global {
  interface Window {
    wallpaperFrame?: (seconds: number, still?: boolean) => string | void;
    wallpaperError?: string;
  }
}

const flightSeconds = 2 * LANDSCAPE_CYCLE_SECONDS;
const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
async function waitForFlights() {
  for (let frame = 0; frame < 120; frame++) {
    const rigs = document.querySelectorAll<HTMLElement>("[data-flight-ready]");
    if (rigs.length === 2) return rigs;
    await nextFrame();
  }
  throw Error("Flight artwork did not mount");
}

async function mount() {
  const stage = document.querySelector<HTMLElement>("main")!;
  if (location.search !== "?flights") {
    const canvas = document.createElement("canvas");
    stage.appendChild(canvas);
    const image = new Image();
    image.src = "/brand-landscape.webp";
    await image.decode();
    const engine = createLandscapeRenderer(canvas, image, () => {}, { maxWidth: innerWidth, maxHeight: innerHeight });
    if (!engine) throw Error("Landscape WebGL renderer unavailable");
    engine.load();
    if (canvas.width !== innerWidth || canvas.height !== innerHeight) throw Error("Capture surface is the wrong size");
    window.wallpaperFrame = (seconds, still) => {
      engine.renderAt(seconds);
      return (still ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", .95)).split(",")[1];
    };
    return;
  }

  createRoot(stage).render(<div className="welcome-art"><WelcomeFlights running={false}/></div>);
  const rigs = await waitForFlights();
  await Promise.all(Array.from(stage.querySelectorAll<SVGImageElement>("image"), element => {
    const image = new Image();
    image.src = element.href.baseVal;
    return image.decode();
  }));
  await nextFrame();

  const tracks = Array.from(rigs, rig => {
    const headphones = rig.classList.contains("welcome-landscape-headphones");
    const kind = headphones ? "headphones" : "iems";
    for (const animation of rig.getAnimations()) animation.cancel();
    const { keyframes } = createWelcomeFlight(headphones, false, () => .5);
    const flight = rig.animate(keyframes, { duration: 1000, fill: "both" });
    flight.pause();
    const canvas = rig.querySelector<HTMLCanvasElement>("canvas")!;
    const paintDevice = createWallpaperFlightPainter(canvas, kind);
    const rug = rig.querySelector<SVGSVGElement>(".welcome-flight-art")!;
    rug.pauseAnimations();
    const clothPeriod = headphones ? 3.8 : 4.7;
    const animations = rig.getAnimations({ subtree: true }).filter(animation => animation !== flight);
    animations.forEach(animation => animation.pause());

    return (seconds: number) => {
      const progress = seconds / flightSeconds;
      flight.currentTime = 1000 * ((progress + (headphones ? .24 : .27)) % 1);
      rug.setCurrentTime(progress * Math.round(flightSeconds / clothPeriod) * clothPeriod);
      for (const animation of animations) {
        const duration = Number(animation.effect?.getTiming().duration);
        if (duration > 0) animation.currentTime = progress * Math.max(1, Math.round(flightSeconds * 1000 / duration)) * duration;
      }
      paintDevice(progress);
    };
  });
  window.wallpaperFrame = seconds => tracks.forEach(track => track(seconds));
}

void mount().catch(error => { window.wallpaperError = String(error); });
