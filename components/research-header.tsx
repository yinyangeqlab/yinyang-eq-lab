// Full-document links retain access checks and listening-page beforeunload guards.
import { AudioLines, ChartNoAxesColumn, UsersRound } from "lucide-react";
import "./research-header.css";

export type ResearchSection = "rankings" | "targets" | "community";
const sections = [
  { id: "rankings", href: "/shootout?tab=rankings", label: "Rankings", Icon: ChartNoAxesColumn },
  { id: "targets", href: "/curve-credits", label: "Targets & credits", Icon: AudioLines },
  { id: "community", href: "/community-preferences", label: "Community preferences", Icon: UsersRound },
] as const;

export default function ResearchHeader({ section }: { section: ResearchSection }) {
  return <header className="research-area-heading">
    <div className="research-area-title"><div><h1>Research</h1><p>Shared rankings, target creators and the community research pilot.</p></div><a className="research-terms-link" href="/glossary">Terms &amp; definitions</a></div>
    <nav aria-label="Research sections">{sections.map(({ id, href, label, Icon }) => <a key={id} href={href} aria-current={section === id ? "page" : undefined}><Icon size={17} aria-hidden="true"/><span>{label}</span></a>)}</nav>
  </header>;
}
