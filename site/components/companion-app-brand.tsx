import './companion-app-brand.css';

export function CompanionAppIcons() {
  return <div className="companion-app-icons">
    <figure><img src="/android/manager.svg" alt="" width="104" height="104"/><figcaption>App Manager</figcaption></figure>
    <figure><img src="/android/companion.svg" alt="" width="104" height="104"/><figcaption>Companion</figcaption></figure>
  </div>;
}

export function DownloadAppManager({ className }: { className: string }) {
  return <a href="/android/download" className={className + ' android-download'}>
    <svg viewBox="0 0 28 28" width="23" height="23" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <path d="M6.1 10.9a7.9 7.9 0 0 1 15.8 0Z"/>
        <path d="M6.1 12h15.8v8.5c0 1.1-.9 2-2 2H8.1c-1.1 0-2-.9-2-2Z"/>
        <rect x="2" y="11.6" width="3.1" height="8.2" rx="1.55"/><rect x="22.9" y="11.6" width="3.1" height="8.2" rx="1.55"/>
        <rect x="8.7" y="20.3" width="3.3" height="6" rx="1.65"/><rect x="16" y="20.3" width="3.3" height="6" rx="1.65"/>
      </g>
      <path d="m8.8 5.1-1.7-2.8m12.1 2.8 1.7-2.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.25"/>
      <g fill="#ace9de"><circle cx="10.8" cy="7.6" r=".8"/><circle cx="17.2" cy="7.6" r=".8"/></g>
    </svg>
    Download App Manager
  </a>;
}
