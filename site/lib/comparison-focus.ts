/** Restore a removed comparison control without moving the listener's viewport. */
export function focusComparisonPlayback(root: Pick<ParentNode, "querySelector">, options: FocusOptions = { preventScroll: true }): boolean {
  const control = root.querySelector<HTMLButtonElement>('.listening-band .strip-play:not(:disabled), .listening-band .deck-play:not(:disabled)');
  if (!control) return false;
  control.focus(options);
  return true;
}
