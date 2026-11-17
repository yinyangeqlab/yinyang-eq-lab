#!/usr/bin/env python3
"""Compare/copy public application sources from a separate working project.

Dry run by default. Never stage, commit, delete, publish, or copy private state.
The public checkout owns its README, licenses, config, data and release tooling.
"""

import argparse
from pathlib import Path
import subprocess

REPO = Path(__file__).resolve().parents[1]
SOURCE_DIRS = {
    "app": "site/app",
    "components": "site/components",
    "hooks": "site/components/hooks",
    "lib": "site/lib",
    "db": "site/db",
    "drizzle": "site/drizzle",
}
SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".sql", ".json"}
CHECKS = {
    "check_blind_completion.mjs", "check_preference_ranking.mjs",
    "check_rate_penalties.py", "check_service_warning.mjs", "check_vote_limits.mjs",
    "check_public_write_limits.py", "check_request_json.mjs",
    "check_write_policy.mjs", "check_ranking_api.mjs", "check_ranked_runs.mjs",
    "check_measurement_research.mjs", "check_migration_chain.py",
}
PRESERVED = {
    "site/drizzle/0001_target_validation.sql",  # Working copy contains withheld seeds.
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--apply", action="store_true", help="copy listed changes")
    args = parser.parse_args()
    source = args.source.resolve()
    nested = (source / "site/app/shootout/page.tsx").is_file()
    if source == REPO or not (nested or (source / "app/shootout/page.tsx").is_file()):
        parser.error("source must be a separate Target Shootout working project")
    candidates = {}
    tracked_sources = {}
    for directory, destination in SOURCE_DIRS.items():
        if nested and directory == "hooks":
            continue
        base = source / (destination if (source / destination).is_dir() else directory)
        tracked_sources[destination] = base
        if base.is_dir() and not base.is_symlink():
            for path in base.rglob("*"):
                candidates[Path(destination) / path.relative_to(base)] = path
    for name in CHECKS:
        relative = Path("scripts") / name
        candidates[relative] = source / relative
    changed = []
    for rel, path in sorted(candidates.items()):
        if not path.is_file() or path.suffix not in SUFFIXES | {".py"}:
            continue
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
        if name in PRESERVED:
            continue
        for destination, base in tracked_sources.items():
            if rel.is_relative_to(destination):
                if not (base / rel.relative_to(destination)).exists() and rel not in candidates:
                    print(f"REVIEW missing source: {name} (kept in release)")
                break
    print(f"{len(changed)} changes {'copied' if args.apply else 'available; use --apply to copy'}.")
    print("Preserved: release docs/config/package metadata, target seed exclusion, media/data, infrastructure and local state.")
    print("Review package/lockfile, public assets and data changes separately when those change.")


if __name__ == "__main__":
    main()
