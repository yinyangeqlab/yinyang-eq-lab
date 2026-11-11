export default function PlaybackEdgeToggle({ expanded, playing, onToggle, label = "playback panel", controls }: {
  expanded: boolean;
  playing: boolean;
  onToggle: () => void;
  label?: string;
  controls?: string;
}) {
  return <button
    type="button"
    className="edge-panel-toggle"
    aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
    aria-expanded={expanded}
    aria-controls={controls}
    onClick={onToggle}
  >
    <span className="edge-spectrum" aria-hidden="true"><i/><i/><i/><i/></span>
    <span className="alpha-edge-label">{expanded ? "Hide playback" : `Playback · ${playing ? "playing" : "paused"}`}</span>
    <span className="edge-collapse-arrow" aria-hidden="true">›</span>
  </button>;
}
