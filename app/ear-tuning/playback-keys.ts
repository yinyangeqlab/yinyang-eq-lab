import type { KeyboardEvent } from "react";
import { EAR_HIGH_HZ, EAR_LOW_HZ, type EarSweep } from "@/lib/ear-tuning-audio";
import { shortcutDecision } from "@/lib/playback-shortcuts";
import { usePlaybackShortcutContext } from "@/lib/use-playback-shortcut-context";

export function frequencyForKey(key: string, hz: number, fine: boolean, range = { from: EAR_LOW_HZ, to: EAR_HIGH_HZ }) {
  const step = fine ? 1 / 96 : 1 / 12;
  let next: number;
  switch (key) {
    case "ArrowLeft":
    case "ArrowDown": next = hz * 2 ** -step; break;
    case "ArrowRight":
    case "ArrowUp": next = hz * 2 ** step; break;
    case "PageDown": next = hz / 2; break;
    case "PageUp": next = hz * 2; break;
    case "Home": next = range.from; break;
    case "End": next = range.to; break;
    default: return null;
  }
  // Move by at least one hertz even when a fine step rounds back to the current frequency.
  const rounded = next === hz ? hz : next < hz ? Math.min(hz - 1, Math.round(next)) : Math.max(hz + 1, Math.round(next));
  return Math.min(range.to, Math.max(range.from, rounded));
}

type Actions = {
  toggle?: () => void;
  reference?: () => void;
  mystery?: () => void;
  frequency?: { hz: number; range?: EarSweep; seek: (hz: number) => void };
};

export function useEarPlaybackKeys(region: string, { toggle, reference, mystery, frequency }: Actions) {
  const shortcutContext = usePlaybackShortcutContext(`[data-ear-player="${region}"]`);
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    const arrow = event.key.startsWith("Arrow");
    if (event.repeat && !arrow) return;
    const context = shortcutContext();
    const target = event.target instanceof Element ? event.target : null;
    if (!context.regionActive || !target || target.closest("input[type=range], input[type=radio]")) return;
    const shortcutKey = event.key === "ArrowUp" ? "ArrowRight" : event.key === "ArrowDown" ? "ArrowLeft" : event.key;
    if (!shortcutDecision(target, { code: event.code, key: shortcutKey, shiftKey: event.shiftKey }, context).run) return;
    const next = arrow && frequency ? frequencyForKey(event.key, frequency.hz, event.shiftKey, frequency.range) : null;
    const action = event.code === "Space" ? toggle : key === "a" ? reference : key === "b" ? mystery : undefined;
    if (next === null && !action) return;
    event.preventDefault();
    event.stopPropagation();
    if (next !== null) frequency?.seek(next);
    else action?.();
  };
}
