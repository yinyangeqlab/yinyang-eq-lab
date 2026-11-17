import { OwnerUtilityLink } from "./aura-nav-link";
import SiteUtilityLinks from "./site-utility-links";

export default function TournamentHeader(_props: { activeTab?: string }) {
  return <header className="topbar compact-header personal-utility-header" role="group" aria-label="Listening data controls">
    <SiteUtilityLinks/><OwnerUtilityLink/>
  </header>;
}
