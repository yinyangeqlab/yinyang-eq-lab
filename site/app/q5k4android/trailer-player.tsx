import { ShareCompanion } from "./share-button";

export function TrailerPlayer({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? "h1" : "h2";
  return <section id="trailer" className="companion-trailer" aria-labelledby="trailer-title">
    <video controls playsInline preload="none" width="1080" height="1920"
      poster="/android/companion-btfo.webp" aria-label="YinYang EQ Companion trailer set to BTFO by Jason J. Chevallier">
      <source src="/android/companion-btfo.mp4?v=205" type="video/mp4" media="(max-width: 767px)" />
      <source src="/android/companion-btfo-hd.mp4?v=205" type="video/mp4" />
      <track kind="captions" src="/android/companion-btfo.vtt?v=205" srcLang="en" label="English" />
      <a href="/android/companion-btfo.mp4?v=205">Watch the MP4</a>
    </video>
    <div>
      <Heading id="trailer-title">Watch the Companion in action</Heading>
      <p>Create and compare EQs offline using your own measurements. Import and export presets, sync your collection, and try blind A/B.</p>
      <p className="trailer-duration">60 seconds · “BTFO” by Jason J. Chevallier</p>
      <ShareCompanion trailer />
      {standalone && <a className="companion-guide-link" href="/q5k4android">Explore the app and download App Manager</a>}
    </div>
  </section>;
}
