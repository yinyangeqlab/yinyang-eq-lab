// Render the homepage scene offline. Requires Chromium/Playwright and FFmpeg with libx264 and libvpx-vp9.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { link, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { LANDSCAPE_CYCLE_SECONDS } from "../lib/welcome-landscape.ts";
import { wallpaperDirectory, wallpaperFilename, wallpaperFormats, wallpaperManifest, wallpaperScenes, wallpaperSizes } from "../lib/welcome-wallpapers.ts";
import { packageOfflineWallpapers } from "./wallpapers/package-offline.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(root, "public");
const destination = join(publicDir, wallpaperDirectory.slice(1));
const browserModule = process.argv.find(arg => arg.startsWith("--browser-module="))?.slice(17);
const resume = process.argv.find(arg => arg.startsWith("--resume="))?.slice(9);
const addFormats = process.argv.includes("--add-formats");
const offlineOnly = process.argv.includes("--offline-only");
const fps = 24;
const landscapeFrames = LANDSCAPE_CYCLE_SECONDS * fps;
const stillFrame = Math.round(1.5 * fps);
const [full, hd] = wallpaperSizes;
const viewport = { width: full.width, height: full.height };
const overlayClip = { x: 0, y: 0, width: full.width, height: Math.ceil(.51 * full.height) };
const artworkFiles = ["brand-landscape.webp", "welcome-headphone-carpet.webp", "welcome-iem-carpet.webp"];
const captureInputs = [
  "app/welcome.css", "components/welcome-landscape.tsx", "components/welcome-flight-model.tsx",
  "lib/welcome-flight-path.ts", "lib/welcome-landscape.ts", "scripts/wallpapers/scene.tsx",
  ...artworkFiles.map(name => "public/" + name),
];

async function startCaptureServer() {
  const entry = await build({
    entryPoints: [join(root, "scripts/wallpapers/scene.tsx")],
    tsconfig: join(root, "tsconfig.json"), bundle: true, write: false, format: "esm", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const html = '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/welcome.css"><style>html,body{margin:0;overflow:hidden}main{position:relative;width:100vw;height:100vh;container-type:inline-size}main>canvas{width:100%;height:100%;display:block}main>.welcome-art{background:transparent;z-index:0}</style><main></main><script type="module" src="/capture.js"></script>';
  const routes = new Map([
    ["/", ["text/html", html]],
    ["/capture.js", ["text/javascript", entry.outputFiles[0].contents]],
    ["/welcome.css", ["text/css", await readFile(join(root, "app/welcome.css"))]],
  ]);
  for (const name of artworkFiles) {
    routes.set("/" + name, ["image/webp", await readFile(join(publicDir, name))]);
  }
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const asset = routes.get(path);
    if (request.method !== "GET" || !asset) { response.writeHead(404).end(); return; }
    response.writeHead(200, { "Content-Type": asset[0] }).end(asset[1]);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

const framePath = (folder, type, index, extension) =>
  join(folder, `${type}-${String(index).padStart(4, "0")}.${extension}`);

async function saveFrame(path, bytes) {
  await writeFile(path + ".partial", bytes);
  await rename(path + ".partial", path);
}

async function captureFrames(folder) {
  const moduleUrl = browserModule ? pathToFileURL(resolve(browserModule)).href : "playwright";
  const { chromium } = await import(moduleUrl);
  const server = await startCaptureServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function captureBatch(query, work) {
    const browser = await chromium.launch({
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: "no-preference" });
      await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await page.goto(origin + "/" + query);
      await page.waitForFunction(() => window.wallpaperFrame || window.wallpaperError);
      const error = await page.evaluate(() => window.wallpaperError);
      if (error) throw Error(error);
      await work(page);
    } finally {
      await browser.close();
    }
  }
  // Release Chromium's 4K frame buffers between batches, including on software WebGL.
  async function capture(query, count, needed, draw) {
    for (let start = 0; start < count; start += 48) {
      const end = Math.min(count, start + 48);
      const pending = Array.from({ length: end - start }, (_, index) => start + index).filter(needed);
      if (pending.length) await captureBatch(query, async page => {
        for (const index of pending) await draw(page, index);
      });
      console.log(`${query ? "Flying artwork" : "Landscape"}: ${end}/${count} frames`);
    }
  }

  const scenic = index => framePath(folder, "landscape", index, "jpg");
  const flying = index => framePath(folder, "flights", index, "png");
  const still = join(folder, "still-landscape.png");
  const drawStill = async page => {
    const png = await page.evaluate(seconds => window.wallpaperFrame(seconds, true), stillFrame / fps);
    await saveFrame(still, Buffer.from(png, "base64"));
  };
  const drawFlight = async (page, index) => {
    await page.evaluate(seconds => { window.wallpaperFrame(seconds); }, index / fps);
    await saveFrame(flying(index), await page.screenshot({ clip: overlayClip, omitBackground: true }));
  };
  try {
    if (addFormats) {
      await captureBatch("", drawStill);
      await captureBatch("?flights", page => drawFlight(page, stillFrame));
      return;
    }
    await capture("", landscapeFrames, index => !existsSync(scenic(index)) || index === stillFrame && !existsSync(still), async (page, index) => {
      if (!existsSync(scenic(index))) {
        const jpeg = await page.evaluate(seconds => window.wallpaperFrame(seconds), index / fps);
        await saveFrame(scenic(index), Buffer.from(jpeg, "base64"));
      }
      if (index === stillFrame && !existsSync(still)) await drawStill(page);
    });
    await capture("?flights", 2 * landscapeFrames, index => !existsSync(flying(index)), drawFlight);
  } finally {
    server.close();
  }
}

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-filter_complex_threads", "2", ...args], { stdio: "inherit" });
}

function encodeMp4(folder, scene) {
  const withFlights = scene === "flying-gear";
  const input = ["-framerate", String(fps), "-i", join(folder, "landscape-%04d.jpg")];
  if (withFlights) input.push("-framerate", String(fps), "-i", join(folder, "flights-%04d.png"));
  const timeline = withFlights
    ? "[0:v][1:v]overlay=format=rgb:shortest=1[scene];[scene]"
    : "[0:v]";
  const color = "out_color_matrix=bt709:out_range=tv";
  const filters = `${timeline}split[hi][low];[hi]scale=${full.width}:${full.height}:${color},format=yuv420p[4k];[low]scale=${hd.width}:${hd.height}:flags=lanczos:${color},format=yuv420p[1080p]`;
  const video = wallpaperSizes.flatMap(size => {
    const rate = size.id === "4k" ? "6500k" : "3000k";
    return ["-map", `[${size.id}]`, "-an", "-c:v", "libx264", "-threads", "4", "-preset", "fast", "-crf", "18",
      "-frames:v", String(landscapeFrames * (withFlights ? 2 : 1)),
      "-maxrate", rate, "-bufsize", rate, "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
      "-movflags", "+faststart", join(folder, wallpaperFilename(scene, size.id, "mp4"))];
  });
  ffmpeg([...input, "-filter_complex", filters, ...video]);
}

function encodeStill(folder, scene, extension) {
  const stillInput = ["-i", join(folder, "still-landscape.png")];
  const withFlights = scene === "flying-gear";
  if (withFlights) stillInput.push("-i", framePath(folder, "flights", stillFrame, "png"));
  const stillPlate = withFlights ? "[0:v][1:v]overlay=format=rgb[scene];[scene]" : "[0:v]";
  const quality = extension === "jpg" ? ["-q:v", "2"] : ["-pix_fmt", "rgb24"];
  ffmpeg([...stillInput, "-filter_complex", `${stillPlate}split[full][half];[half]scale=${hd.width}:${hd.height}:flags=lanczos[hd]`,
    ...[["full", full], ["hd", hd]].flatMap(([label, size]) => [
      "-map", `[${label}]`, "-frames:v", "1", "-threads", "2", ...quality, "-update", "1", join(folder, wallpaperFilename(scene, size.id, extension)),
    ])]);
}

function encodeWebm(folder, scene, size) {
  const rate = size.id === "4k" ? "3800k" : "1600k";
  ffmpeg(["-threads", "2", "-i", join(folder, wallpaperFilename(scene, size.id, "mp4")),
    "-an", "-c:v", "libvpx-vp9", "-deadline", "good", "-cpu-used", "5", "-row-mt", "1",
    "-tile-columns", "2", "-threads", "4", "-crf", "26", "-b:v", rate, "-g", "120",
    join(folder, wallpaperFilename(scene, size.id, "webm"))]);
  console.log(`Encoded ${scene} ${size.label} WebM`);
}

async function verifyDownloads(folder) {
  const sizes = {};
  const codecs = { mp4: "h264", webm: "vp9", jpg: "mjpeg", png: "png" };
  for (const scene of wallpaperScenes) {
    for (const size of wallpaperSizes) {
      for (const { extension } of wallpaperFormats) {
        const name = wallpaperFilename(scene.id, size.id, extension);
        const path = join(folder, name);
        const { streams, format } = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path]));
        const [stream] = streams;
        const expectedFrames = scene.id === "flying-gear" ? 2 * landscapeFrames : landscapeFrames;
        const video = extension === "mp4" || extension === "webm";
        if (streams.length !== 1 || stream.width !== size.width || stream.height !== size.height || stream.codec_name !== codecs[extension] ||
          (extension === "mp4" && Number(stream.nb_frames) !== expectedFrames) ||
          (video && (stream.avg_frame_rate !== `${fps}/1` || !(Math.abs(Number(format.duration) - expectedFrames / fps) < 1 / fps)))) {
          throw Error(`Unexpected resolution, duration, or encoding: ${name}`);
        }
        const { size: bytes } = await stat(path);
        if (!bytes || bytes >= 25 * 1024 * 1024) throw Error(`Invalid static asset size: ${name}`);
        sizes[name] = bytes;
      }
    }
  }
  return sizes;
}

async function installDownloads(folder, sizes, existing = {}) {
  await mkdir(destination, { recursive: true });
  for (const name of Object.keys(sizes)) await rename(join(folder, name), join(destination, name));
  await writeFile(join(folder, wallpaperManifest), JSON.stringify({ ...existing, ...sizes }, null, 2) + "\n");
  await rename(join(folder, wallpaperManifest), join(destination, wallpaperManifest));
  console.log(`Verified ${Object.keys(sizes).length} downloads in ${destination}`);
}

const scratch = join(root, "artifacts");
await mkdir(scratch, { recursive: true });
if (resume && !/^wallpaper-render-[a-z0-9]+$/i.test(resume)) throw Error("Supply an existing wallpaper-render directory name");
if (resume && addFormats) throw Error("Use --resume for a full render or --add-formats for existing wallpapers");
if (offlineOnly && (resume || addFormats)) throw Error("Use --offline-only with an existing set of still and video wallpapers");

async function buildOfflineOnly() {
  const existing = await verifyDownloads(destination);
  const folder = await mkdtemp(join(scratch, "wallpaper-offline-"));
  try {
    await installDownloads(folder, await packageOfflineWallpapers(root, folder), existing);
  } finally {
    await rm(folder, { recursive: true });
  }
}

async function renderWallpapers() {
  const folder = resume ? join(scratch, resume) : await mkdtemp(join(scratch, "wallpaper-render-"));
  const fingerprint = createHash("sha256").update(JSON.stringify({ viewport, fps, landscapeFrames, stillFrame }));
  for (const path of captureInputs) fingerprint.update(await readFile(join(root, path)));
  const stamp = fingerprint.digest("hex");
  const captureStamp = join(folder, "capture.sha256");
  if (resume && (await readFile(captureStamp, "utf8")).trim() !== stamp) throw Error("Artwork or capture inputs changed. Start a new render.");
  if (!resume) await writeFile(captureStamp, stamp + "\n");
  console.log(`Rendering homepage wallpapers in ${folder}`);
  await captureFrames(folder);
  if (!addFormats) {
    encodeMp4(folder, "landscape");
    // Repeat the scenic cycle behind the slower flight without buffering 4K frames.
    for (let index = 0; index < landscapeFrames; index++) {
      const repeated = framePath(folder, "landscape", index + landscapeFrames, "jpg");
      if (!existsSync(repeated)) await link(framePath(folder, "landscape", index, "jpg"), repeated);
    }
    encodeMp4(folder, "flying-gear");
  }
  for (const { id } of wallpaperScenes) {
    if (addFormats) {
      for (const size of wallpaperSizes) for (const extension of ["mp4", "jpg"]) {
        const name = wallpaperFilename(id, size.id, extension);
        await link(join(destination, name), join(folder, name));
      }
    } else encodeStill(folder, id, "jpg");
    encodeStill(folder, id, "png");
    for (const size of wallpaperSizes) encodeWebm(folder, id, size);
  }
  await installDownloads(folder, { ...await verifyDownloads(folder), ...await packageOfflineWallpapers(root, folder) });
  await rm(folder, { recursive: true });
}

if (offlineOnly) await buildOfflineOnly();
else await renderWallpapers();
