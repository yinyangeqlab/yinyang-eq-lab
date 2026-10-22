import { OwnerUtilityLink } from "./aura-nav-link";
import SiteUtilityLinks from "./site-utility-links";

export default function TournamentHeader({ activeTab: _activeTab }: { activeTab?: string }) {
  return <header className="topbar compact-header personal-utility-header" aria-label="Listening data controls">
    <SiteUtilityLinks/><OwnerUtilityLink/>
  </header>;
}
