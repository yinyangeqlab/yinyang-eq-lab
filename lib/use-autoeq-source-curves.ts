"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { autoEqRevision, parseLocalAutoEqFile, sharedAutoEqTarget } from "@/lib/autoeq-target-sources";
import { curveVersion } from "@/lib/curve-version";
import type { Point } from "@/lib/curves";

type LoadState = { points?: Point[]; error?: true };
const targets = new Map<string, LoadState>();
const files = new Map<string, Promise<Point[][]>>();
const listeners = new Set<() => void>();
let version = 0;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => version;
const serverSnapshot = () => 0;

function publish(id: string, state: LoadState) {
  targets.set(id, state);
  version++;
  for (const listener of listeners) listener();
}

function loadFile(file: string) {
  const cached = files.get(file);
  if (cached) return cached;
  const request = (async () => {
    const url = `https://raw.githubusercontent.com/jaakkopasanen/AutoEq/${autoEqRevision}/targets/${encodeURIComponent(file)}`;
    const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", signal: AbortSignal.timeout(10_000) });
    if (!response.ok || Number(response.headers.get("Content-Length")) > 200_000) throw Error("Target source is unavailable.");
    const bytes = await response.arrayBuffer();
    return (await parseLocalAutoEqFile({ name: file, size: bytes.byteLength, arrayBuffer: async () => bytes })).map(row => row.points);
  })();
  files.set(file, request);
  void request.catch(() => { if (files.get(file) === request) files.delete(file); });
  return request;
}

function load(id: string, retry = false) {
  const source = sharedAutoEqTarget(id);
  if (!source || targets.has(id) && !(retry && targets.get(id)?.error)) return;
  publish(id, {});
  void loadFile(source.file).then(async variants => {
    // The source file hash and the parsed curve hash are separate checks.
    // Choose by column order; equal curves in different columns still retain separate IDs.
    const points = variants[source.column];
    if (!points || await curveVersion(points) !== source.version) throw Error("Curve fingerprint mismatch.");
    publish(id, { points });
  }).catch(() => publish(id, { error: true }));
}

export function useAutoEqSourceCurves(ids: readonly (string | null | undefined)[]) {
  const key = [...new Set(ids.filter((id): id is string => !!id && !!sharedAutoEqTarget(id)))].sort().join(",");
  const revision = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  useEffect(() => { if (key) for (const id of key.split(",")) load(id); }, [key]);
  return useMemo(() => {
    const selected = key ? key.split(",") : [];
    return {
      error: selected.some(id => targets.get(id)?.error),
      ready: selected.every(id => !!targets.get(id)?.points),
      retry: () => { for (const id of selected) load(id, true); },
      resolve<T extends { id: string; points: Point[] }>(target: T): T {
        const points = selected.includes(target.id) ? targets.get(target.id)?.points : undefined;
        return points ? { ...target, points } : target;
      },
    };
  // Each publish invalidates the relevant cache view, even if the IDs are unchanged.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision]);
}
