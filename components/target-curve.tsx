"use client";
import { useId } from "react";
import type { Point } from "@/lib/curves";
function curveReference(points: Point[]) {
  if (!points.length) return 0;
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  if (sorted[0][0] >= 1000) return sorted[0][1];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] >= 1000) {
      const [lowHz, lowDb] = sorted[i - 1], [highHz, highDb] = sorted[i];
      const fraction = highHz === lowHz ? 0 : Math.log(1000 / lowHz) / Math.log(highHz / lowHz);
      return lowDb + (highDb - lowDb) * fraction;
    }
  }
  return sorted[sorted.length - 1][1];
}

const CURVE_VIEW = { min: 55, max: 95 } as const;

export default function Curve({ points, color }: { points: Point[]; color: string }) {
  const reference = curveReference(points);
  const plotX = (hz: number) => 64 + Math.log10(hz / 20) / 3 * 482;
  const plotY = (db: number) => 17 + (CURVE_VIEW.max - db) * 176 / (CURVE_VIEW.max - CURVE_VIEW.min);
  const alignedPoints: Point[] = points.map(([hz, db]) => [hz, db - reference + 75]);
  const fallbackPoint: Point = [20, 75];
  const safePoints = alignedPoints.length ? alignedPoints : [fallbackPoint];
  const path = safePoints.map(([hz, db], i) => `${i ? "L" : "M"}${plotX(hz)},${plotY(db)}`).join(" ");
  const lowPoint = safePoints.reduce((low, point) => point[1] < low[1] ? point : low, safePoints[0] ?? fallbackPoint);
  const highPoint = safePoints.reduce((high, point) => point[1] > high[1] ? point : high, safePoints[0] ?? fallbackPoint);
  const anchorX = plotX(1000);
  const anchorY = plotY(75);
  const clipId = useId();
  return <svg className="curve" viewBox="0 0 560 210" preserveAspectRatio="none" role="img" aria-label={`Frequency response curve, 1 kHz at 75 dB, displayed from ${CURVE_VIEW.min} to ${CURVE_VIEW.max} dB; arrows mark values outside this view`}>
    <defs><clipPath id={clipId}><rect x="64" y="17" width="482" height="176" /></clipPath></defs>
    <line x1="54" x2="54" y1="17" y2="193" stroke="#71838d" strokeWidth="1" />
    {[17, anchorY, 193].map(y => <line key={y} x1="51" x2="57" y1={y} y2={y} stroke="#71838d" strokeWidth="1" />)}
    <path d={path} clipPath={`url(#${clipId})`} fill="none" stroke={color} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    <circle cx={anchorX} cy={anchorY} r="4" fill={color} stroke="#090e12" strokeWidth="1.5" />
    {lowPoint[1] < CURVE_VIEW.min && <text x={plotX(lowPoint[0])} y="190" textAnchor="middle" fill={color} fontSize="15" fontWeight="900">↓</text>}
    {highPoint[1] > CURVE_VIEW.max && <text x={plotX(highPoint[0])} y="31" textAnchor="middle" fill={color} fontSize="15" fontWeight="900">↑</text>}
    <text x="46" y="20" textAnchor="end" fill="#8fa3ad" fontSize="10" fontWeight="700">{CURVE_VIEW.max} dB</text>
    <text x="46" y={anchorY + 4} textAnchor="end" fill="#b9cbd2" fontSize="11" fontWeight="700">75 dB</text>
    <text x="46" y="197" textAnchor="end" fill="#8fa3ad" fontSize="10" fontWeight="700">{CURVE_VIEW.min} dB</text>
  </svg>;
}
