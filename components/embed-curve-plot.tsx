import { BAND_HZ } from "@/lib/embed-shootout";
import { TARGET_COLORS, bandX, smoothPoints } from "@/components/embed-common";

type Series = { name: string; bands: readonly number[] };

/** Frequency-response plot of one-third-octave band gains. Curves draw on once when it mounts. */
export default function CurvePlot({ series, label }: { series: Series[]; label: string }) {
  const W = 640, H = 260, left = 38, right = 14, top = 14, bottom = 28, plotW = W - left - right, plotH = H - top - bottom;
  const peak = Math.max(6, Math.ceil(Math.max(...series.flatMap(s => s.bands.map(Math.abs))) / 3) * 3);
  const y = (db: number) => top + plotH / 2 - db / peak * (plotH / 2);
  const ticks = [-peak, -peak / 2, 0, peak / 2, peak];
  const freqTicks: [number, string][] = [[BAND_HZ.indexOf(100), "100"], [BAND_HZ.indexOf(1000), "1k"], [BAND_HZ.indexOf(10000), "10k"]];
  return <svg className="es-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
    <title>{label}</title>
    <defs><filter id="es-plot-glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
    {ticks.map(t => <g key={t}><line x1={left} x2={W - right} y1={y(t)} y2={y(t)} className={t === 0 ? "es-plot-zero" : "es-plot-grid"} /><text x={left - 6} y={y(t) + 4} textAnchor="end" className="es-plot-label">{t > 0 ? `+${t}` : t}</text></g>)}
    {freqTicks.map(([index, text]) => <g key={text}><line x1={left + bandX(index, plotW)} x2={left + bandX(index, plotW)} y1={top} y2={top + plotH} className="es-plot-grid" /><text x={left + bandX(index, plotW)} y={H - 8} textAnchor="middle" className="es-plot-label">{text}</text></g>)}
    <text x={W - right} y={H - 8} textAnchor="end" className="es-plot-label">Hz</text>
    {series.map((item, index) => <path key={item.name} d={smoothPoints(item.bands.map((db, band) => [left + bandX(band, plotW), y(db)] as [number, number]))}
      className="es-plot-line" pathLength={1} style={{ stroke: TARGET_COLORS[index], animationDelay: `${index * 160}ms` }} filter="url(#es-plot-glow)" />)}
  </svg>;
}
