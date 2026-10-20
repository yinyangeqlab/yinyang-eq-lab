"use client";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import AuraNavLink from "./aura-nav-link";

export default function SiteUtilityLinks({ onReviewData }: { onReviewData?: () => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className={`topbar-utilities${open ? " is-open" : ""}`}>
    <button type="button" className="utility-menu-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>Site links &amp; sharing <ChevronDown size={15} aria-hidden="true"/></button>
    <div id={id} className="topbar-actions" role="group" aria-label="Site links and data notice">
      <AuraNavLink href="/" label="Welcome" kind="welcome"/>
      <AuraNavLink href="/preference-tuning" label="Preference Tuning" kind="tuning"/>
      <AuraNavLink href="/music-library" label="Listening Pool" kind="library"/>
      {onReviewData ? <button type="button" className="vote-data-review-link" onClick={onReviewData}>Data Agreement &amp; Sharing</button> : <a className="vote-data-review-link" href="/my-data">Data Agreement &amp; Sharing</a>}
    </div>
  </div>;
}
