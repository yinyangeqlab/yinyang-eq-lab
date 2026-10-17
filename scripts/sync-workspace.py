#!/usr/bin/env python3
"""Compare/copy public application sources from a separate working project.

Dry run by default. Never stage, commit, delete, publish, or copy private state.
The public checkout owns its README, licenses, config, data and release tooling.
"""

import argparse
from pathlib import Path
import subprocess

REPO = Path(__file__).resolve().parents[1]
SOURCE_DIRS = {"app", "components", "hooks", "lib", "db", "drizzle"}
SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".sql", ".json"}
CHECKS = {
    "check_blind_completion.mjs", "check_preference_ranking.mjs",
    "check_rate_penalties.py", "check_service_warning.mjs", "check_vote_limits.mjs",
    "check_public_write_limits.py", "check_request_json.mjs",
}
PRESERVED = {
    "drizzle/0001_target_validation.sql",  # Working copy contains withheld seeds.
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--apply", action="store_true", help="copy listed changes")
    args = parser.parse_args()
    source = args.source.resolve()
    if source == REPO or not (source / "app/shootout/page.tsx").is_file():
        parser.error("source must be a separate Target Shootout working project")
    candidates = []
    for directory in sorted(SOURCE_DIRS):
        base = source / directory
        if base.is_dir() and not base.is_symlink():
            candidates.extend(base.rglob("*"))
    candidates.extend(source / "scripts" / name for name in sorted(CHECKS))
    changed = []
    for path in sorted(candidates):
        if not path.is_file() or path.suffix not in SUFFIXES | {".py"}:
            continue
        rel = path.relative_to(source)
        if rel.as_posix() in PRESERVED:
            continue
        if any(p.startswith(".") or p == "node_modules" or p == "__pycache__" for p in rel.parts):
            continue
        if path.is_symlink() or not path.resolve().is_relative_to(source):
            raise SystemExit(f"Refusing source symlink: {rel}")
        target = REPO / rel
        if target.is_symlink() or not target.resolve().is_relative_to(REPO):
            raise SystemExit(f"Refusing destination symlink: {rel}")
        data = path.read_bytes()
        if target.is_file() and target.read_bytes() == data:
            continue
        changed.append((rel, target, data))
    for rel, target, data in changed:
        print(f"{'UPDATE' if target.exists() else 'ADD'} {rel}")
    if args.apply:
        for rel, target, data in changed:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    # Deletions require review: never remove release-only files automatically.
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=REPO).decode().split("\0")
    for name in filter(None, tracked):
        rel = Path(name)
        if rel.parts[0] in SOURCE_DIRS and name not in PRESERVED and not (source / rel).exists():
            print(f"REVIEW missing source: {name} (kept in release)")
    print(f"{len(changed)} changes {'copied' if args.apply else 'available; use --apply to copy'}.")
    print("Preserved: release docs/config/package metadata, target seed exclusion, media/data, infrastructure and local state.")
    print("Review package/lockfile, public assets and data changes separately when those change.")


if __name__ == "__main__":
    main()
