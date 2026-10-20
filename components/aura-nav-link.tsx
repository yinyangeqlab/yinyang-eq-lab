import { House, LibraryBig, Music2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import "./aura-nav-link.css";

const icons = { welcome: House, tuning: SlidersHorizontal, library: LibraryBig };

export function OwnerUtilityLink() {
  return <a className="owner-utility-link" href="/owner-research">
    <ShieldCheck aria-hidden="true" />
    <span>Admin view</span>
  </a>;
}

export default function AuraNavLink({ href, label, kind }: {
  href: string;
  label: string;
  kind: keyof typeof icons;
}) {
  const Icon = icons[kind];
  return <a className="top-note owner-link aura-nav" href={href} data-kind={kind}>
    <span className="aura-nav-halo" aria-hidden="true" />
    <span className="aura-nav-ripple" aria-hidden="true" />
    <span className="aura-nav-note note-one" aria-hidden="true"><Music2 /></span>
    <span className="aura-nav-note note-two" aria-hidden="true"><Music2 /></span>
    <span className="aura-nav-note note-three" aria-hidden="true"><Music2 /></span>
    <span className="aura-nav-icon" aria-hidden="true"><Icon /></span>
    <span className="aura-nav-label">{label}</span>
    <span className="aura-nav-eq" aria-hidden="true"><i /><i /><i /><i /><i /></span>
  </a>;
}
