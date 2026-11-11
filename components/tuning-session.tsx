"use client";
import dynamic from "next/dynamic";
import { useState } from "react";

// The editor is only downloaded once Tuning is first opened. After that the one instance (one <audio>, one Web Audio graph) stays mounted.
const TuningEditor = dynamic(() => import("../app/preference-tuning/editor"), {
  loading: () => <p role="status" style={{ padding: 24 }}>Loading Tuning…</p>,
});

const TUNING_ROUTE = "/preference-tuning";

/**
 * Keeps the Tuning session alive across client navigation. Render it exactly once, at a position in a shared layout
 * that never remounts, and pass the current pathname (usePathname()).
 *
 * On /preference-tuning it shows the full editor; the route's own page must render nothing. On every other route the
 * editor stays mounted but hidden, and its mini-player appears once a song is loaded.
 *
 * A reload, another tab or a full-document navigation unmounts it and ends the session.
 */
export default function TuningSession({ pathname }: { pathname: string | null }) {
  const onTuning = pathname === TUNING_ROUTE || pathname === `${TUNING_ROUTE}/`;
  const [opened, setOpened] = useState(onTuning);
  if (onTuning && !opened) setOpened(true);
  if (!opened && !onTuning) return null;
  return <TuningEditor visible={onTuning}/>;
}
