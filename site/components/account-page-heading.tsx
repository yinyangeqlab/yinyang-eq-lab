import type {ReactNode} from 'react';
import './account-presentation.css';

/** Presentation only: account identity, permissions and saves stay in their existing components. */
export default function AccountPageHeading({eyebrow,title,children,backHref='/my-data',backLabel='My data',actions}:{eyebrow:string;title:string;children:ReactNode;backHref?:string;backLabel?:string;actions?:ReactNode}){
 return <header className="account-page-heading">
  <a className="account-back" href={backHref}><span aria-hidden="true">←</span> {backLabel}</a>
  <div className="account-heading-row"><div><span className="account-eyebrow">{eyebrow}</span><h1>{title}</h1><div className="account-heading-copy">{children}</div></div>{actions&&<div className="account-heading-actions">{actions}</div>}</div>
 </header>;
}

export function AccountSectionLinks({links}:{links:{href:string;label:string}[]}){
 return <nav className="account-section-links" aria-label="Page sections">{links.map(link=><a key={link.href} href={link.href}>{link.label}<span aria-hidden="true">↗</span></a>)}</nav>;
}
