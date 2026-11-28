"""Drive the open picker in a regular Safari window using OS mouse events."""

import json
import os
from pathlib import Path
import subprocess
import time

EVIDENCE = Path(os.environ["FINDER_EVIDENCE"])
ORIGIN = "http://127.0.0.1:5813"
SWIFT_CLICK = """
import CoreGraphics
import Foundation
let point = CGPoint(x: Double(CommandLine.arguments[1])!, y: Double(CommandLine.arguments[2])!)
for kind in [CGEventType.mouseMoved, .leftMouseDown, .leftMouseUp] {
    CGEvent(mouseEventSource: nil, mouseType: kind, mouseCursorPosition: point, mouseButton: .left)?
        .post(tap: .cghidEventTap)
}
"""


def wait_state(predicate):
    path = EVIDENCE / "native-state.json"
    for _ in range(100):
        if path.is_file():
            state = json.loads(path.read_text())
            if predicate(state):
                return state
        time.sleep(0.4)
    raise RuntimeError("Browser did not report the expected Finder state")


def click(executable, state, box):
    x, y, _, h = state["window"]
    left, top, width, height = box
    assert width > 0 and height > 0
    point = (round(x + left + width / 2), round(y + h - state["viewport"][1] + top + height / 2))
    subprocess.run([str(executable), *map(str,point)], check=True, timeout=12)


def main():
    source = EVIDENCE.parent / "finder-click.swift"
    source.write_text(SWIFT_CLICK)
    executable = EVIDENCE.parent / "finder-click"
    subprocess.run(["swiftc", str(source), "-o", str(executable)], check=True, timeout=120)
    result = {}
    for theme in ("dark", "light"):
        subprocess.run(["open", "-a", "Safari", ORIGIN + "/ear-tuning?finder-qa=" + theme], check=True, timeout=20)
        state = wait_state(lambda s: s.get("theme") == theme and s.get("value") == "custom")
        assert "Safari/" in state["ua"] and "Macintosh" in state["ua"] and "Chrome/" not in state["ua"]
        click(executable, state, state["width"])
        expanded = wait_state(lambda s: s.get("theme") == theme and s.get("open"))
        custom = next(row for row in expanded["options"] if row["value"] == "custom")
        assert custom["disabled"] and custom["selected"]
        capture = EVIDENCE / f"{theme}-width-open-native.png"
        subprocess.run(["screencapture", "-x", str(capture)], check=True, timeout=25)
        before = (EVIDENCE / "native-state.json").stat().st_mtime_ns
        click(executable, expanded, custom["box"])
        time.sleep(0.9)
        state = wait_state(lambda s: (EVIDENCE / "native-state.json").stat().st_mtime_ns > before)
        assert state["value"] == "custom", state
        if not state["open"]:
            click(executable, state, state["width"])
            state = wait_state(lambda s: s.get("open"))
        narrow = next(row for row in state["options"] if row["value"] == "8")
        click(executable, state, narrow["box"])
        wait_state(lambda s: s.get("value") == "8" and not s.get("open"))
        result[theme] = expanded
        (EVIDENCE / "native-result.json").write_text(json.dumps(result, indent=2) + "\n")
        print(f"{theme}: Safari UI opened the picker and ignored disabled Custom", flush=True)


if __name__ == "__main__":
    main()
