#!/usr/bin/env python3
"""Check the exact files staged for a public release."""

from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
blocked_parts = {
    "node_modules", ".git", ".next", ".vinext", ".wrangler",
    ".sites-checkout", ".sites-runtime", ".agents", ".codex",
    "infra", "local", "curated", "music library", "dist", "artifacts",
    "outputs", "work", "__pycache__",
}
blocked_names = {
    ".owner-research-token", ".owner-token", "shootout.sqlite3",
}
blocked_suffixes = {
    ".pem", ".key", ".p12", ".pfx", ".sqlite", ".sqlite3",
    ".db", ".mp3", ".flac", ".wav", ".ogg", ".m4a",
}
patterns = {
    "private key": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(rb"\b(?:gh[oprsu]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b"),
    "AWS access key": re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "target seed data": re.compile(rb"(?i)INSERT(?:\s+OR\s+IGNORE)?\s+INTO\s+[`\"]?targets\b"),
    "assigned credential": re.compile(
        rb"(?i)(?:api[_-]?key|api[_-]?token|client[_-]?secret|access[_-]?token|"
        rb"owner[_-]?analytics[_-]?token|private[_-]?access[_-]?password)"
        rb"\s*[=:]\s*['\"][^'\"\r\n]{16,}['\"]"
    ),
}

result = subprocess.run(
    ["git", "ls-files", "--stage", "-z"], cwd=ROOT, capture_output=True, check=True
)
changed = subprocess.run(
    ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMRTU", "-z"],
    cwd=ROOT, capture_output=True, check=True,
)
staged_paths = set(changed.stdout.split(b"\0")) - {b""}
# ls-files lists the entire index, including unchanged published source. Check
# only staged additions/changes; new fixture files still receive every guard.
entries = [
    entry.split(b"\t", 1) for entry in result.stdout.split(b"\0")
    if entry and entry.split(b"\t", 1)[1] in staged_paths
]
paths = [Path(path.decode()) for _, path in entries]
if not paths:
    sys.exit("No staged files to check. Run git add -A first.")

# Only these reviewed source files may cross the infrastructure exclusion.
public_infra = {
    "infra/pulumi/" + name for name in (
        "index.ts", "private-gate.mjs", "abuse-controls.mjs", "abuse-controls.d.mts",
        "public-assets.mjs", "public-assets.d.mts", "public-demos.mjs", "package.json", "package-lock.json",
        "tsconfig.json", "Pulumi.yaml",
    )
} | {"infra/cost-guard/worker.mjs", "infra/cost-guard/policy.mjs"}
# This release evidence contains disposable, erased fixture IDs, never credentials.
public_evidence = {
    "artifacts/continue-button-release/" + name for name in (
        "REPORT.md", "assets.log", "build.log", "deployment.log", "erasure-verification.json",
        "live-desktop.png", "live-flow-events.json", "live-mobile.png", "live-verification.json",
        "no-drift.log", "source-scope.json", "types.log",
    )
}

issues = []
for (metadata, _), rel in zip(entries, paths):
    if metadata.startswith(b"120000 "):
        issues.append(f"{rel}: symlink")
        continue
    name = rel.name.lower()
    parts = {part.lower() for part in rel.parts}
    if (
        (parts & blocked_parts and rel.as_posix() not in public_infra | public_evidence)
        or rel.parts[0] in {"private", "archive", "recovery-inputs", ".recovery-local"}
        or name in blocked_names
        or name.startswith(".env")
        or name.startswith(".dev.vars")
        or (name.startswith("pulumi.") and name.endswith(".yaml") and rel.as_posix() != "infra/pulumi/Pulumi.yaml")
        or rel.suffix.lower() in blocked_suffixes
        or any(word in name for word in ("credential", "token", "secret"))
    ):
        issues.append(f"{rel}: blocked path")
        continue
    staged = subprocess.run(
        ["git", "show", f":{rel.as_posix()}"],
        cwd=ROOT, capture_output=True,
    )
    if staged.returncode:
        issues.append(f"{rel}: cannot read staged content")
        continue
    data = staged.stdout
    for label, pattern in patterns.items():
        if pattern.search(data):
            issues.append(f"{rel}: possible {label}")

if issues:
    print("Release check failed:")
    for issue in issues:
        print(" -", issue)
    sys.exit(1)
print(f"Release check passed for {len(paths)} staged files.")
