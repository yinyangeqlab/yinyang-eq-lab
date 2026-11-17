import Link from "next/link";
import { shareMetadata } from "@/lib/share-metadata";
import "./style.css";

export const metadata = shareMetadata("/about");

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-welcome" aria-labelledby="about-title">
        <div className="about-welcome-copy">
          <p className="about-kicker">About us · YinYang EQ</p>
          <h1 id="about-title">Find what sounds right to you.</h1>
          <p className="about-intro">
            Welcome to YinYang EQ, a listening lab for anyone curious about how their headphones sound.
            Start with a song you know, switch between two sound settings, and hear what changes.
          </p>
          <p className="about-intro">
            You can compare settings, tune a sound of your own, or explore what other listeners prefer.
            The final call is always yours.
          </p>
          <div className="about-actions">
            <Link href="/listen" className="about-primary">Choose how to listen <span aria-hidden="true">→</span></Link>
            <Link href="/#how-it-works">See how it works</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
