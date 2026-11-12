/** Browser-facing build identity. LIVE_RELEASE.json records verified deployment provenance. */
export const releaseInfo = {
  version: "0.2.0-beta.1",
  channel: "Beta",
  // Original beta baseline (historical). The currently deployed update is recorded in LIVE_RELEASE.json.
  baseline: {
    label: "update103",
    commit: "e5399cb869d1b7626f2abf779083d3b1f8c9a50a",
  },
  build: { update: 155, preview: 0, basedOn: 154, date: "2026-11-11" },
} as const;

export const updateLabel = `update${releaseInfo.build.update}`;
export const buildLabel = releaseInfo.build.preview ? `${updateLabel}-preview.${releaseInfo.build.preview}` : updateLabel;

export const repositoryUrl = "https://github.com/yinyangeqlab/yinyang-eq-lab";
const bugReportBody = `Version: ${buildLabel} (${releaseInfo.version})

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
  title: "[Idea] ", body: `Version: ${buildLabel} (${releaseInfo.version})\n\n## What problem would this solve?\n\n## Your idea\n\n## Alternatives you tried\n\nGitHub issues are public. Leave out personal data and private account links.`,
})}`;
export const formatRequestUrl = `${repositoryUrl}/issues/new?${new URLSearchParams({
  title: "[Format] ", body: `Version: ${buildLabel} (${releaseInfo.version})\n\n## App/device and version that produced the file\n\n## File extension\n\n## Producer documentation link\n\n## Channel arrangement (shared, Left/Right, or other)\n\n## Small synthetic example\nUse invented settings. Do not attach private presets, audio, account links or personal data. GitHub issues are public.`,
})}`;
