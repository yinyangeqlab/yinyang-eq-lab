"""Exercise the real release scanner against a disposable index; never commit/push."""
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
fixtures = ["scripts/check_target_context_and_changes.mjs", "scripts/check_yinyangeq_history.mjs"]
with tempfile.TemporaryDirectory(prefix="yinyang-lint-release-") as directory:
    checkout = Path(directory)
    def git(*args):
        subprocess.run(["git", *args], cwd=checkout, check=True, capture_output=True)
    git("init", "--quiet")
    git("config", "user.name", "Yin Yang EQ Lab")
    git("config", "user.email", "343846436+yinyangeqlab@users.noreply.github.com")
    (checkout / "scripts").mkdir()
    (checkout / "scripts/check-release.py").write_bytes((root / "scripts/check-release.py").read_bytes())
    for name in fixtures:
        (checkout / name).write_bytes((root / name).read_bytes())
    def scan():
        git("add", "scripts")
        return subprocess.run(["python3", "scripts/check-release.py"], cwd=checkout, capture_output=True, text=True)
    assert scan().returncode == 0, "Exact reviewed synthetic blobs must pass"
    original = (checkout / fixtures[0]).read_bytes()
    (checkout / fixtures[0]).write_bytes(original + b"\n// changed fixture\n")
    result = scan()
    assert result.returncode != 0 and "possible target seed data" in result.stdout, "A changed fixture must require review"
    (checkout / fixtures[0]).write_bytes(original)
    (checkout / "scripts/unreviewed-fixture.mjs").write_bytes(original)
    result = scan()
    assert result.returncode != 0 and "unreviewed-fixture.mjs: possible target seed data" in result.stdout, "Known bytes at a new path cannot inherit approval"
print("PASS actual release scanner: reviewed in-memory fixtures accepted; mutated and new fixtures refused. No commit, push or production data.")
