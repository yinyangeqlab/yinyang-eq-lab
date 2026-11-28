"""Drive the open picker in a regular Safari window using OS mouse events."""

import json
import os
from pathlib import Path
import subprocess
import time

EVIDENCE = Path(os.environ["FINDER_EVIDENCE"])
MAJOR = os.environ["FINDER_SAFARI_MAJOR"]
ORIGIN = "http://127.0.0.1:5813"
SWIFT_CLICK = """
import CoreGraphics
import Foundation
import Vision

if CommandLine.arguments[1] == "ocr" {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    try VNImageRequestHandler(url: URL(fileURLWithPath: CommandLine.arguments[2])).perform([request])
    let rows = request.results!.compactMap { result -> [String: Any]? in
        guard let text = result.topCandidates(1).first?.string else { return nil }
        return ["text": text, "x": result.boundingBox.midX, "y": 1 - result.boundingBox.midY]
    }
    FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject: rows))
    exit(0)
}
if CommandLine.arguments[1] == "key" {
    let code = CGKeyCode(CommandLine.arguments[2])!
    let flags = CGEventFlags(rawValue: UInt64(CommandLine.arguments[3])!)
    for down in [true, false] {
        let event = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: down)
        event?.flags = flags
        event?.post(tap: .cghidEventTap)
        Thread.sleep(forTimeInterval: 0.08)
    }
    exit(0)
}
let point = CGPoint(x: Double(CommandLine.arguments[1])!, y: Double(CommandLine.arguments[2])!)
for kind in [CGEventType.mouseMoved, .leftMouseDown, .leftMouseUp] {
    CGEvent(mouseEventSource: nil, mouseType: kind, mouseCursorPosition: point, mouseButton: .left)?
        .post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.08)
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


def press(executable, code, modifiers=0):
    subprocess.run([str(executable), "key", str(code), str(modifiers)], check=True, timeout=12)
    time.sleep(0.3)


def capture(name):
    subprocess.run(["screencapture", "-x", str(EVIDENCE / name)], check=True, timeout=25)


def system_rows(executable, name):
    rows = json.loads(subprocess.check_output([str(executable), "ocr", str(EVIDENCE / name)], timeout=30))
    return {row["text"]: row for row in rows if row["text"] in {"Wide", "Medium", "Narrow", "Custom"}}


def verify_legacy(executable, theme, state):
    name = f"{theme}-width-open-native.png"
    click(executable, state, state["width"])
    time.sleep(0.7)
    capture(name)
    rows = system_rows(executable, name)
    if not {"Wide", "Medium", "Narrow"} <= rows.keys():
        left, top, width, height = state["width"]
        click(executable, state, [left + width - 18, top, 18, height])
        time.sleep(0.7)
        capture(name)
        rows = system_rows(executable, name)
    assert {"Wide", "Medium", "Narrow"} <= rows.keys(), rows

    bounds = subprocess.check_output(["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(EVIDENCE / name)], text=True)
    pixel_w, pixel_h = [int(line.rsplit(" ", 1)[1]) for line in bounds.splitlines() if "pixel" in line]
    if "Custom" in rows:
        row = rows["Custom"]
        subprocess.run([str(executable), str(row["x"] * pixel_w), str(row["y"] * pixel_h)], check=True, timeout=12)
        time.sleep(0.7)
        assert wait_state(lambda s: s.get("theme") == theme)["value"] == "custom"
        capture(f"{theme}-after-custom.png")
        visible = system_rows(executable, f"{theme}-after-custom.png")
        if "Narrow" not in visible:
            click(executable, state, state["width"])
            time.sleep(0.7)
    row = rows["Narrow"]
    subprocess.run([str(executable), str(row["x"] * pixel_w), str(row["y"] * pixel_h)], check=True, timeout=12)
    chosen = wait_state(lambda s: s.get("theme") == theme and s.get("value") == "8")
    return {"before": state, "menu_labels": sorted(rows), "after": chosen}


def verify_voiceover(executable, state):
    command, shift, option, control = 1 << 20, 1 << 17, 1 << 19, 1 << 18
    press(executable, 96, command)  # Command-F5 starts VoiceOver.
    time.sleep(3)
    try:
        capture("voiceover-start.png")
        press(executable, 109, command | option | control)  # VO-Command-F10.
        click(executable, state, state["width"])
        press(executable, 118, shift | option | control)  # VO-Shift-F4 follows keyboard focus.
        time.sleep(1)
        capture("voiceover-width.png")
        press(executable, 125, option | control)
        capture("voiceover-options.png")
    finally:
        press(executable, 96, command)


def main():
    source = EVIDENCE.parent / "finder-click.swift"
    source.write_text(SWIFT_CLICK)
    executable = EVIDENCE.parent / "finder-click"
    subprocess.run(["swiftc", str(source), "-o", str(executable)], check=True, timeout=120)
    result = {}
    version = subprocess.check_output(
        ["/usr/libexec/PlistBuddy", "-c", "Print CFBundleShortVersionString",
         "/Applications/Safari.app/Contents/Info.plist"], text=True).strip()
    print(f"Installed Safari {version}", flush=True)
    assert version.split(".")[0] == MAJOR
    for theme in ("dark", "light"):
        subprocess.run(["open", "-a", "Safari", ORIGIN + "/ear-tuning?finder-qa=" + theme], check=True, timeout=20)
        state = wait_state(lambda s: s.get("theme") == theme and s.get("value") == "custom")
        assert "Safari/" in state["ua"] and "Macintosh" in state["ua"] and "Chrome/" not in state["ua"]
        time.sleep(0.9)
        state = wait_state(lambda s: s.get("theme") == theme and s.get("value") == "custom")
        assert [o["disabled"] for o in state["options"] if o["value"] == "custom"] == [True]
        if MAJOR == "26":
            assert state["appearance"] != "base-select", state
            result[theme] = verify_legacy(executable, theme, state)
            (EVIDENCE / "native-result.json").write_text(json.dumps(result, indent=2) + "\n")
            continue
        click(executable, state, state["width"])
        expanded = wait_state(lambda s: s.get("theme") == theme and s.get("open"))
        custom = next(row for row in expanded["options"] if row["value"] == "custom")
        assert custom["disabled"] and custom["selected"]
        capture(f"{theme}-width-open-native.png")
        before = (EVIDENCE / "native-state.json").stat().st_mtime_ns
        click(executable, expanded, custom["box"])
        time.sleep(0.9)
        state = wait_state(lambda s: s.get("theme") == theme and (EVIDENCE / "native-state.json").stat().st_mtime_ns > before)
        assert state["value"] == "custom", state
        if not state["open"]:
            click(executable, state, state["width"])
            state = wait_state(lambda s: s.get("theme") == theme and s.get("open"))
        narrow = next(row for row in state["options"] if row["value"] == "8")
        click(executable, state, narrow["box"])
        wait_state(lambda s: s.get("theme") == theme and s.get("value") == "8" and not s.get("open"))
        press(executable, 48, 1 << 17)
        wait_state(lambda s: s.get("theme") == theme and not s.get("focused"))
        press(executable, 48)
        wait_state(lambda s: s.get("theme") == theme and s.get("focused"))
        entered = None
        for name, code, modifiers in (("Space", 49, 0), ("Return", 36, 0), ("Option-Down", 125, 1 << 19), ("Down", 125, 0)):
            press(executable, code, modifiers)
            time.sleep(0.6)
            capture(f"{theme}-keyboard-{name}.png")
            entered = wait_state(lambda s: s.get("theme") == theme and s.get("focused"))
            if entered["open"]:
                break
        press(executable, 53)
        escaped = wait_state(lambda s: s.get("theme") == theme and not s.get("open") and s.get("focused"))
        result[theme] = {"expanded": expanded, "keyboard_open": entered, "keyboard_after_escape": escaped}
        (EVIDENCE / "native-result.json").write_text(json.dumps(result, indent=2) + "\n")
        print(f"{theme}: keyboard focused Width, keyboard-open={entered['open']}", flush=True)
    if MAJOR == "27":
        verify_voiceover(executable, escaped)
        assert all(row["keyboard_open"]["open"] for row in result.values()), "No keyboard opener reported by Safari"


if __name__ == "__main__":
    main()
