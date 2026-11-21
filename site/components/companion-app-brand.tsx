import './companion-app-brand.css';

export function CompanionAppIcons() {
  return <div className="companion-app-icons">
    <figure><img src="/android/companion.svg" alt="" width="104" height="104"/><figcaption>Companion</figcaption></figure>
    <figure><img src="/android/manager.svg" alt="" width="104" height="104"/><figcaption>App Manager</figcaption></figure>
  </div>;
}

export function DownloadAppManager({ className, describedBy }: { className: string; describedBy?: string }) {
  return <a href="/android/download" className={className + ' android-download'} aria-describedby={describedBy}>
    <img src="/android/manager.svg" width="23" height="23" alt=""/>
    Download App Manager
  </a>;
}
