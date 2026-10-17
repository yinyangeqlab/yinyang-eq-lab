export type Point = [number, number];

export function parseCurve(input: string, normalize = true): Point[] {
  if (input.length > 4_000_000) throw new Error("File is too large (4 MB maximum).");
  const points: Point[] = [];
  for (const line of input.split(/\r?\n/)) {
    const cells = line.trim().split(/[\s,;\t]+/);
    if (cells.length < 2) continue;
    const frequency = Number(cells[0]);
    const gain = Number(cells[1]);
    if (!Number.isFinite(frequency) || !Number.isFinite(gain)) continue;
    if (frequency >= 20 && frequency <= 20000 && gain >= -200 && gain <= 200) {
      points.push([frequency, gain]);
    }
  }
  points.sort((a, b) => a[0] - b[0]);
  const unique = points.filter((point, index) => index === 0 || point[0] !== points[index - 1][0]);
  if (unique.length < 10) throw new Error("Add at least 10 frequency/gain rows between 20 Hz and 20 kHz.");
  let reduced = unique;
  if (unique.length > 2000) {
    let cursor = 0;
    const low = unique[0][0], high = unique[unique.length - 1][0];
    reduced = Array.from({ length: 2000 }, (_, i) => {
      const hz = low * (high / low) ** (i / 1999);
      while (cursor < unique.length - 2 && unique[cursor + 1][0] < hz) cursor++;
      const [x0, y0] = unique[cursor], [x1, y1] = unique[cursor + 1];
      return [hz, y0 + (y1 - y0) * Math.log(hz / x0) / Math.log(x1 / x0)] as Point;
    });
  }
  const at = (hz: number) => { if(hz<=unique[0][0]) return unique[0][1]; for (let i=1;i<unique.length;i++) if (unique[i][0] >= hz) { const [x0,y0]=unique[i-1], [x1,y1]=unique[i]; return y0+(y1-y0)*Math.log(hz/x0)/Math.log(x1/x0); } return unique[unique.length-1][1]; };
  const reference = at(1000);
  return reduced.map(([hz,gain]) => [hz, +(gain-(normalize ? reference : 0)).toFixed(4)]);
}
