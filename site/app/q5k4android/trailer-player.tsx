import { ShareCompanion } from "./share-button";

export function TrailerPlayer({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? "h1" : "h2";
  return <section id="trailer" className="companion-trailer" aria-labelledby="trailer-title">
    <video controls playsInline preload="none" width="720" height="1280"
      poster="/android/companion-tour.webp" aria-label="YinYang Companion walkthrough with instrumental music">
      <source src="/android/companion-tour.mp4" type="video/mp4" />
      <track kind="captions" src="/android/companion-tour.vtt" srcLang="en" label="English" />
      <a href="/android/companion-tour.mp4">Watch the MP4</a>
    </video>
    <div>
      <Heading id="trailer-title">Watch the Companion in action</Heading>
      <p>Follow an EQ from the website into the Android editor, see all four themes, and watch App Manager install an update.</p>
      <p className="trailer-duration">58 seconds · Instrumental soundtrack</p>
      <ShareCompanion trailer />
      {standalone && <a className="companion-guide-link" href="/q5k4android">Explore the app and download App Manager</a>}
    </div>
  </section>;
}
