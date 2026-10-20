import { LogOut } from "lucide-react";

export default function AdminPageHeader() {
  return <div className="owner-top">
    <a className="owner-back-link" href="/home" aria-label="YinYang EQ League home"><img src="/brand-avatar-aligned.webp" alt="" /> YinYang EQ League</a>
    <nav aria-label="Main navigation"><a href="/">Welcome</a><a href="/shootout">Tournament</a><a href="/preference-tuning">Preference Tuning</a><a href="/music-library">Listening pool</a><span aria-current="page">Admin view</span></nav>
    <form className="admin-signout" method="post" action="/admin-logout"><button type="submit" title="Sign out of admin on this browser"><LogOut size={17} aria-hidden="true"/><span>Sign Out</span></button></form>
  </div>;
}
