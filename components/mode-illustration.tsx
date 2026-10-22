import "./mode-illustration.css";

type ModeKind = "personal" | "blind" | "open";

/** Decorative SVG only. The surrounding link/button owns every action and label. */
export default function ModeIllustration({ kind, compact = false }: { kind: ModeKind; compact?: boolean }) {
  return <span className={`mode-illustration mode-illustration--${kind}${compact ? " mode-illustration--compact" : ""}`} aria-hidden="true">
    <svg viewBox="0 0 160 120" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {kind === "personal" ? <>
        <circle className="mode-art-orbit-guide" cx="80" cy="60" r="48"/>
        <ellipse className="mode-art-orbit-guide mode-art-orbit-ellipse" cx="80" cy="60" rx="69" ry="28" transform="rotate(-18 80 60)"/>
        <g className="mode-art-orbit mode-art-orbit-outer">
        <circle className="mode-art-orbit-planet" cx="80" cy="12" r="9"/>
        <path className="mode-art-orbit-signal" d="M75 12h2l2-4 2 8 2-4h2"/>
        </g>
        <g className="mode-art-orbit mode-art-orbit-inner">
        <circle className="mode-art-orbit-planet mode-art-orbit-planet-small" cx="122" cy="83" r="7"/>
        <path className="mode-art-orbit-signal" d="M119 83h1l1-3 2 6 1-3h1"/>
        </g>
        <g className="mode-art-orbit mode-art-orbit-third">
        <circle className="mode-art-orbit-planet mode-art-orbit-planet-small" cx="38" cy="83" r="6"/>
        <path className="mode-art-orbit-signal" d="M35 83h1l1-2 2 4 1-2h1"/>
        </g>
        <circle className="mode-art-listener-halo" cx="80" cy="61" r="27"/>
        <g className="mode-art-listener">
        <circle className="mode-art-listener-head" cx="80" cy="50" r="9"/>
        <path d="M63 82v-5c0-9 7-15 17-15s17 6 17 15v5"/>
        <path className="mode-art-headphones" d="M67 52v-4a13 13 0 0 1 26 0v4M67 49v9M93 49v9"/>
        <path className="mode-art-listener-body" d="M72 79v-6M88 79v-6"/>
        </g>
      </> : kind === "blind" ? <>
        <g className="mode-art-blind-source mode-art-blind-source-left">
        <path d="M9 54v12M14 49v22M19 54v12"/>
        </g>
        <g className="mode-art-blind-source mode-art-blind-source-right">
        <path d="M141 54v12M146 49v22M151 54v12"/>
        </g>
        <g className="mode-art-blind-waves-left">
        <path className="mode-art-blind-wave mode-art-wave-1" d="M26 46q15 14 0 28"/>
        <path className="mode-art-blind-wave mode-art-wave-2" d="M37 40q20 20 0 40"/>
        <path className="mode-art-blind-wave mode-art-wave-3" d="M48 35q24 25 0 50"/>
        </g>
        <g className="mode-art-blind-waves-right">
        <path className="mode-art-blind-wave mode-art-wave-1" d="M134 46q-15 14 0 28"/>
        <path className="mode-art-blind-wave mode-art-wave-2" d="M123 40q-20 20 0 40"/>
        <path className="mode-art-blind-wave mode-art-wave-3" d="M112 35q-24 25 0 50"/>
        </g>
        <circle className="mode-art-listener-halo" cx="80" cy="61" r="27"/>
        <g className="mode-art-listener mode-art-blind-listener">
        <circle className="mode-art-listener-head" cx="80" cy="48" r="11"/>
        <path d="M62 87v-9c0-10 8-17 18-17s18 7 18 17v9"/>
        <path className="mode-art-blindfold" d="M68 45q12-3 24 0l-1 10q-11 4-22 0Z"/>
        <path className="mode-art-blindfold-tie" d="m68 49-7 6m31-6 7 5"/>
        <path className="mode-art-listener-body" d="M70 83v-8M90 83v-8"/>
        </g>
      </> : <>
        <path className="mode-art-playground-ground" d="M13 100h134"/>
        <g className="mode-art-playground-frame">
        <path d="M18 99 36 23h88l18 76M31 23h98"/>
        <path d="M23 81h11M126 81h11"/>
        </g>
        <g className="mode-art-swing mode-art-swing-a">
        <path className="mode-art-swing-rope" d="M52 25v37M66 25v37"/>
        <path className="mode-art-swing-seat" d="M45 64h28"/>
        <circle className="mode-art-play-target mode-art-play-target-a" cx="59" cy="57" r="11"/>
        <text x="59" y="61" className="mode-art-play-letter">A</text>
        </g>
        <g className="mode-art-swing mode-art-swing-b">
        <path className="mode-art-swing-rope" d="M94 25v37M108 25v37"/>
        <path className="mode-art-swing-seat" d="M87 64h28"/>
        <circle className="mode-art-play-target mode-art-play-target-b" cx="101" cy="57" r="11"/>
        <text x="101" y="61" className="mode-art-play-letter">B</text>
        </g>
        <path className="mode-art-playground-path" pathLength="100" d="M32 92q22-24 48-8t48 4"/>
        <circle className="mode-art-playground-node mode-art-play-target-a" cx="32" cy="92" r="3"/>
        <circle className="mode-art-playground-node mode-art-play-target-b" cx="128" cy="88" r="3"/>
      </>}
    </svg>
  </span>;
}
