/** Drop mounted account/playback state after an ownership or privacy transition. */
export function navigateFresh(destination: string) {
  window.location.assign(destination);
}
