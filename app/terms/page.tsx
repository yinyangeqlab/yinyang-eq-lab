import type { Metadata } from "next";
import Link from "next/link";
import { shareMetadata } from "@/lib/share-metadata";
import "../my-data/style.css";

export const metadata: Metadata = shareMetadata("/terms");

export default function TermsPage() {
  return (
    <main className="my-data">
      <nav aria-label="Related pages">
        <Link href="/privacy">Privacy notice</Link>
        <Link href="/my-data">My data</Link>
        <Link href="/version">Version &amp; Release Notes</Link>
      </nav>
      <header>
        <h1>Terms of Use</h1>
        <p>Effective <time dateTime="2026-11-11">November 11, 2026</time>.</p>
        <p>YinYang EQ is an open source listening project operated by Yin Yang EQ Lab.</p>
      </header>

      <section id="your-work">
        <h2>Your work and its sources</h2>
        <p>You keep any rights you have in your contributions. The Lab and other creators keep their rights in the material they provide. Editing a curve or downloading an EQ based on it does not give you rights in the underlying curve, recording, or other source material. Follow the relevant license and share only material you have permission to share.</p>
        <p>Use the download controls to export your EQs, measurements, and results in the formats each tool supports. You can also ask us for a copy of data we hold about you.</p>
      </section>

      <section id="sharing">
        <h2>What sharing allows</h2>
        <p>When you submit material, you give the Lab limited permission to store and process it for the feature you chose. If you send a target for public review, we may review it and, if approved, make the curve and its credit available for shared comparisons and rankings. You can withdraw a pending target or request removal of an approved target.</p>
      </section>

      <section id="research">
        <h2>Research and data choices</h2>
        <p>Research participation requires your opt-in. We explain what a feature collects and how we use it. Some shared listening features require participation. We run the site and use submitted data for the purposes described in the relevant notice, subject to your choices and applicable law.</p>
        <p>You can withdraw a research choice at any time in <Link href="/my-data">My data</Link>. That stops future collection for that choice. You can delete earlier linked submissions separately. The <Link href="/privacy">Privacy notice</Link> explains retention and the limits that apply to backups and finalized group results.</p>
      </section>

      <section id="rankings">
        <h2>Rankings and corrections</h2>
        <p><Link href="/shootout?tab=rankings">Research Rankings</Link> estimate the preferences of participating listeners from eligible blind comparisons. The rankings page explains the scoring method and its limits. New comparisons, deletions, moderation, target revisions, and changes to the method can move standings. We may exclude spam, manipulated results, or entries that do not meet the eligibility rules.</p>
        <p>We’ll record significant corrections and scoring changes in the <Link href="/version">release notes</Link>, with the date, what changed, and the effect on published results where we can describe it without identifying participants.</p>
      </section>

      <section id="changes">
        <h2>Changes to the site and these terms</h2>
        <p>We update the site as it develops, including routine fixes and urgent security or reliability updates. For planned changes that materially affect how you use the site, we’ll give advance notice when practical. If a feature that holds your work is going away, we’ll give you a chance to export it when practical.</p>
        <p>When these terms change, we’ll post a dated summary and the effective date. We’ll explain material changes before they apply to you. If an opt-in feature needs to collect new kinds of participant data, or if we want to use earlier submissions for a materially different purpose, we’ll update the relevant notice and ask for a fresh opt-in first. Earlier submissions stay under the permissions you gave unless you choose to extend them.</p>
      </section>

      <section id="contact">
        <h2>Requests and questions</h2>
        <p>To request access, a copy, a correction, or deletion of your data, or to suggest changes to these terms, email <a href="mailto:yinyangeqlab@gmail.com">yinyangeqlab@gmail.com</a>.</p>
      </section>
    </main>
  );
}
