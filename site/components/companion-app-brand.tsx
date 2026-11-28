import { buildLabel } from '@/lib/release-info';
import './companion-app-brand.css';

const managerIconSrc = `/android/manager.svg?v=${buildLabel}`;
export const phoneEqIconSrc = `/android/phone-eq.png?v=${buildLabel}`;

export function CompanionAppIcons() {
  return <div className="companion-app-icons">
    <figure><img src="/android/companion.svg" alt="" width="104" height="104"/><figcaption>Companion</figcaption></figure>
    <figure><img src={managerIconSrc} alt="" width="104" height="104"/><figcaption>App Manager</figcaption></figure>
    <a href="/android#phone-eq"><figure><img src={phoneEqIconSrc} alt="" width="180" height="180"/><figcaption>Phone EQ</figcaption></figure></a>
  </div>;
}

export function DownloadAppManager({ className, describedBy }: { className: string; describedBy?: string }) {
  return <a href="/android/download" className={className + ' android-download'} aria-describedby={describedBy}>
    <img src={managerIconSrc} width="23" height="23" alt=""/>
    Download App Manager
  </a>;
}
