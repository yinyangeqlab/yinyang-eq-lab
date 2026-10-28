/** Public beta metadata; exact deployment provenance is recorded in LIVE_RELEASE.json. */
export const releaseInfo = {
  version: "0.2.0-beta.1",
  channel: "Beta",
  published: true,
  // Original beta baseline (historical). The currently deployed update is recorded in LIVE_RELEASE.json.
  baseline: {
    label: "update103",
    commit: "e5399cb869d1b7626f2abf779083d3b1f8c9a50a",
  },
  notesThrough: { update: 124, date: "27 October 2026" },
  changes: [
    "Redesigned: Music selection, track search and source controls stay together beside the listening player.",
    "Improved: Player, target selection and Personal Tournament layouts fit narrow screens and shorter windows.",
    "Improved: Keyboard focus, passage handles, control labels and accessibility feedback are clearer without changing listening requirements.",
    "Fixed: Searches prioritise closer matches; upload and preset errors explain supported formats and playback limits.",
    "Improved: Version history and service notices explain the current state, including access during private maintenance.",
    "Added: Animated landscape artwork on desktop and a cleaned AMOLED moon on mobile, with a remembered Pause motion control.",
  ],
  betaLaunch: [
    "Refreshed Home and listening setup around the AMOLED A/B plots and keyboard playback controls.",
    "Music selection and available audio specifications brought beside the player.",
    "Curve-first Tuning with draggable frequency landmarks and compact axis controls.",
    "Clearer data choices, account tools and device Sync organization.",
    "Full, icons-only and hidden navigation; icons stay still in the compact rail.",
    "Beta testing notice on every page, with optional public bug reporting on GitHub.",
  ],
} as const;

export const repositoryUrl = "https://github.com/yinyangeqlab/yinyang-eq-lab";
const bugReportBody = `Version: ${releaseInfo.version}

## What happened?

## Steps to reproduce
1.
2.
3.

## What did you expect?

## Browser and device

## Screenshots (optional)

GitHub issues are public. Leave out personal data, sign-in codes, private account links and private listening data. Crop or redact screenshots before attaching them.
`;
export const bugReportUrl = `${repositoryUrl}/issues/new?title=${encodeURIComponent("[Bug] ")}&body=${encodeURIComponent(bugReportBody)}`;

// Prefilled public issues work before any optional GitHub templates are published.
export const featureRequestUrl = `${repositoryUrl}/issues/new?${new URLSearchParams({
  title: "[Idea] ", body: `Version: ${releaseInfo.version}\n\n## What problem would this solve?\n\n## Your idea\n\n## Alternatives you tried\n\nGitHub issues are public. Leave out personal data and private account links.`,
})}`;
export const formatRequestUrl = `${repositoryUrl}/issues/new?${new URLSearchParams({
  title: "[Format] ", body: `Version: ${releaseInfo.version}\n\n## App/device and version that produced the file\n\n## File extension\n\n## Producer documentation link\n\n## Channel arrangement (shared, Left/Right, or other)\n\n## Small synthetic example\nUse invented settings. Do not attach private presets, audio, account links or personal data. GitHub issues are public.`,
})}`;
