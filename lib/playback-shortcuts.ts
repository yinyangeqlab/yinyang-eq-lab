/**
 * Decides whether a playback shortcut should run for a key press. The old rule ignored every key while any button, link,
 * select or slider had focus, so shortcuts went silent after a mouse click left focus on a button. The rule here only
 * steps aside where the key already means something: typing, native menus, sliders/radios for the arrow keys, and Space
 * on a button the person focused with the keyboard.
 */
export type ShortcutScope = "everywhere" | "player" | "off";
export type ShortcutTarget = { closest(selector: string): unknown } | null;
export type ShortcutKey = { code: string; key: string; shiftKey: boolean };
/** mouseFocused: the focused control got focus from a mouse/touch press, not from Tab or another key. Browsers flip :focus-visible on at the first key press, so the page tracks this itself. */
export type ShortcutContext = { scope: ShortcutScope; singleKey: boolean; modalOpen: boolean; regionActive: boolean; mouseFocused: boolean };
export type ShortcutDecision = { run: boolean; blurTarget?: boolean };

/** Controls that consume ordinary typing. */
const TYPING = "input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), textarea, select, [contenteditable]:not([contenteditable=false]), [role='textbox'], [role='combobox'], [role='listbox'], [role='spinbutton'], [role='searchbox'], [role='dialog']";
/** Controls that use the arrow keys (and Space) themselves. */
const ARROW_USERS = "input[type=range], input[type=radio], [role='slider'], [role='radio'], [role='tab'], [role='menuitem'], [role='option']";
/** Controls where Space already selects (sliders ignore Space, so it still toggles playback there). */
const SPACE_USERS = "input[type=radio], [role='radio'], [role='tab'], [role='menuitem'], [role='option']";
/** Controls that Space or Enter activates. */
const ACTIVATABLE = "button, a[href], summary, [role='button'], input[type=checkbox], input[type=button], input[type=submit], input[type=file]";
/** Parts of the page the "player area only" scope treats as the playback region. */
export const SHORTCUT_REGION = ".music-panel, .compare-group, .personal-duel, .shootout-compare";

export function shortcutDecision(target: ShortcutTarget, press: ShortcutKey, context: ShortcutContext): ShortcutDecision {
  if (context.scope === "off" || context.modalOpen) return { run: false };
  if (context.scope === "player" && !context.regionActive) return { run: false };
  const inside = (selector: string) => !!target && !!target.closest(selector);
  if (inside(TYPING)) return { run: false };
  const isSpace = press.code === "Space" && !press.shiftKey;
  const isArrow = press.key === "ArrowLeft" || press.key === "ArrowRight";
  const letter = press.key.toLowerCase();
  const isSide = !press.shiftKey && ["a", "b", "s", "1", "2"].includes(letter);
  if (!isSpace && !isArrow && !isSide) return { run: false };
  if (isSide && !context.singleKey) return { run: false };
  if (isArrow && inside(ARROW_USERS)) return { run: false };
  if (isSpace) {
    if (inside(SPACE_USERS)) return { run: false };
    if (inside(ACTIVATABLE)) {
      // A button the person reached with the keyboard keeps Space as "press". One left focused by a mouse click does not.
      if (!context.mouseFocused) return { run: false };
      return { run: true, blurTarget: true };
    }
  }
  return { run: true };
}
