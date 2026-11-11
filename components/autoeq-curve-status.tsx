"use client";

export default function AutoEqCurveStatus({ ready, error, retry }: { ready: boolean; error: boolean; retry: () => void }) {
  if (ready) return null;
  return <div role="status">{error ? <>Could not load the AutoEq curve from its source. <button type="button" onClick={retry}>Retry loading</button></> : "Loading the AutoEq curve from its source…"}</div>;
}
