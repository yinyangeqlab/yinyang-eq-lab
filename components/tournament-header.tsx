import { OwnerUtilityLink } from "./aura-nav-link";
import SiteUtilityLinks from "./site-utility-links";

export default function TournamentHeader({ activeTab }: { activeTab?: string }) {
  return <header className="topbar compact-header"><a className="brand" href="/home" aria-label="YinYang EQ League home"><span className="brand-icon" aria-hidden="true"/><span className="brand-name">YinYang <span className="brand-light">EQ League</span></span></a>
    <nav className="personal-topnav" aria-label="Main navigation">{[["shootout","Tournament"],["rankings","Research Rankings"],["music","Song Suggestions"],["upload","Upload Target"],["measurements","Measurements"],["profile","My Results"]].map(([tab,label]) => <a key={tab} className={tab === activeTab ? "active" : ""} aria-current={tab === activeTab ? "page" : undefined} href={`/shootout?tab=${tab}`}>{label}</a>)}</nav>
    <SiteUtilityLinks/><OwnerUtilityLink/>
  </header>;
}
