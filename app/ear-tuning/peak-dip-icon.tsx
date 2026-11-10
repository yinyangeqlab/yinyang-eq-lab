export default function PeakDipIcon({ kind }: { kind: "peak" | "dip" }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={kind === "peak" ? "M2 17c4 0 5-2 6.8-5.8C10 8.5 10.7 7 12 7s2 1.5 3.2 4.2C17 15 18 17 22 17"
      : "M2 7c4 0 5 2 6.8 5.8C10 15.5 10.7 17 12 17s2-1.5 3.2-4.2C17 9 18 7 22 7"}/>
  </svg>;
}
