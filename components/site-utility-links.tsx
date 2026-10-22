"use client";

/** Destination navigation lives in the shared shell. Keep the real data editor one click away. */
export default function SiteUtilityLinks({onReviewData}:{onReviewData?:()=>void}) {
 return <div className="topbar-utilities alpha-sharing-utility"><div className="topbar-actions" role="group" aria-label="Data agreement and sharing">{onReviewData ? <button type="button" className="vote-data-review-link" onClick={onReviewData}>Data choices</button> : <a className="vote-data-review-link" href="/my-data">Data choices</a>}</div></div>;
}
