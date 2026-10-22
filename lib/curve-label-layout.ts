// Presentation geometry only. Curve samples and pointer coordinates stay separate.
export type LabelBox = { x: number; y: number; width: number; height: number };
type HorizontalLabel = { x: number; width: number };
type MarkerLabel = HorizontalLabel & { y: number };
type Bounds = { left: number; right: number; top: number; bottom: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const overlaps = (a: LabelBox, b: LabelBox, gap = 4) =>
  a.x < b.x + b.width + gap && a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;

// Preserve frequency order while putting only colliding region headings on a new row.
export function packRegionLabels(labels: HorizontalLabel[], left: number, right: number) {
  const rowEnds: number[] = [];
  return labels.map(label => {
    const width = Math.min(label.width, right - left);
    const x = clamp(label.x, left + width / 2, right - width / 2);
    let row = rowEnds.findIndex(end => end + 6 <= x - width / 2);
    if (row < 0) row = rowEnds.length;
    rowEnds[row] = x + width / 2;
    return { x, row };
  });
}

// Keep tags near their real points, with leader lines when labels need to move.
export function placeMarkerLabels(markers: MarkerLabel[], bounds: Bounds): LabelBox[] {
  const placed: LabelBox[] = [];
  const height = 18;
  for (const marker of markers) {
    const width = Math.min(marker.width, bounds.right - bounds.left);
    const x = clamp(marker.x - width / 2, bounds.left, bounds.right - width);
    const belowFirst = marker.y < bounds.top + 30;
    const candidates: LabelBox[] = [];
    const add = (y: number) => candidates.push({ x, y: clamp(y, bounds.top, bounds.bottom - height), width, height });
    for (let row = 0; row < 8; row++) {
      const above = marker.y - 28 - row * 22, below = marker.y + 10 + row * 22;
      if (belowFirst) { add(below); add(above); } else { add(above); add(below); }
    }
    const coversPoint = (box: LabelBox) => markers.some(point => overlaps(box, { x: point.x - 6, y: point.y - 6, width: 12, height: 12 }, 1));
    const free = candidates.find(box => !coversPoint(box) && placed.every(other => !overlaps(box, other)));
    // Tiny custom chart heights may not fit all tags; choose the least crowded slot.
    const penalty = (box: LabelBox) => placed.filter(other => overlaps(box, other)).length * 10 + Number(coversPoint(box));
    const best = free ?? candidates.reduce((a, b) => penalty(a) <= penalty(b) ? a : b);
    placed.push(best);
  }
  return placed;
}
