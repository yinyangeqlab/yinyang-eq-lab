/** Public beta metadata; exact deployment provenance is recorded in LIVE_RELEASE.json. */
export const releaseInfo = {
  version: "0.2.0-beta.1",
  channel: "Public beta",
  published: true,
  // Original beta baseline (historical). The currently deployed update is recorded in LIVE_RELEASE.json.
  baseline: {
    label: "update103",
    commit: "dae6526b753309c9837c6ff2fc8f2b2ad772b059",
  },
  changes: [
    "Original AMOLED A/B plots, smooth source-driven waves and keyboard playback controls retained.",
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
