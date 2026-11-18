// Full-document links retain access checks and listening-page beforeunload guards.
import { AudioLines, ChartNoAxesColumn, UsersRound } from "lucide-react";
import { FITTER_GUIDE_PATH } from "@/lib/share-pages.mjs";
import "./research-header.css";

export type ResearchSection = "rankings" | "targets" | "community";
const sections = [
  { id: "rankings", href: "/shootout?tab=rankings", label: "Rankings", title: "Public EQ Rankings", description: "Explore preferences from blind listening comparisons.", Icon: ChartNoAxesColumn },
  { id: "targets", href: "/curve-credits", label: "Targets & Credits", title: "Targets & Credits", description: "Find the sources and creators behind the headphone targets.", Icon: AudioLines },
  { id: "community", href: "/community-preferences", label: "Community Preferences", title: "Community Preferences", description: "Take part in the optional listening research pilot.", Icon: UsersRound },
] as const;

export default function ResearchHeader({ section }: { section: ResearchSection }) {
  const current = sections.find(item => item.id === section)!;
  return <header className="research-area-heading">
    <div className="research-area-title"><div><h1>{current.title}</h1><p>{current.description}</p></div><div className="research-reference-links"><a href={FITTER_GUIDE_PATH}>EQ Fitter Benchmark</a><a href="/glossary">Glossary</a></div></div>
    {section === "rankings" && <p className="research-history-link"><a href="/listeners/yinyangeq">YinYangEQ’s published listening history</a></p>}
    <nav aria-label="Research sections">{sections.map(({ id, href, label, Icon }) => <a key={id} href={href} aria-current={section === id ? "page" : undefined}><Icon size={17} aria-hidden="true"/><span>{label}</span></a>)}</nav>
  </header>;
}
