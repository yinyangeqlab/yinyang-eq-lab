import { LogOut } from "lucide-react";

export default function AdminPageHeader() {
  return <div className="owner-top">
    {/* eslint-disable-next-line @next/next/no-img-element -- This small fixed local brand asset uses the existing static asset pipeline; preserve its CSS sizing. */}
    <a className="owner-back-link" href="/home" aria-label="YinYang EQ home"><img src="/brand-avatar-aligned.webp" alt="" /> YinYang EQ</a>
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Use full-document navigation so access checks and unsaved-listening beforeunload guards run. */}
    <nav aria-label="Main navigation"><a href="/">Welcome</a><a href="/shootout">Tournament</a><a href="/preference-tuning">Preference Tuning</a><a href="/music-library">Listening pool</a><span aria-current="page">Admin view</span></nav>
    <form className="admin-signout" method="post" action="/admin-logout"><button type="submit" title="Sign out of admin on this browser"><LogOut size={17} aria-hidden="true"/><span>Sign Out</span></button></form>
  </div>;
}
