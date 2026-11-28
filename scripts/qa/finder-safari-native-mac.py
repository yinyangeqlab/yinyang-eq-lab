"""Drive the open picker in a regular Safari window using OS mouse events."""

import json
import os
from pathlib import Path
import subprocess
import time

EVIDENCE = Path(os.environ["FINDER_EVIDENCE"])
MAJOR = os.environ["FINDER_SAFARI_MAJOR"]
ORIGIN = "http://127.0.0.1:5813"
SWIFT_CLICK = r"""
import CoreGraphics
import Foundation
import AppKit
import ApplicationServices
import Vision

if CommandLine.arguments[1] == "accessibility" {
    let app = NSRunningApplication.runningApplications(withBundleIdentifier: "com.apple.Safari").first!
    let ax = AXUIElementCreateApplication(app.processIdentifier)
    var focused: CFTypeRef?
    let status = AXUIElementCopyAttributeValue(ax, kAXFocusedUIElementAttribute as CFString, &focused)
    print("Safari focused AX element status: \(status.rawValue)")
    if let focused, CFGetTypeID(focused) == AXUIElementGetTypeID() {
        let control = focused as! AXUIElement
        for attribute in [kAXRoleAttribute, kAXRoleDescriptionAttribute,
                          kAXTitleAttribute, kAXDescriptionAttribute, kAXValueAttribute,
                          kAXEnabledAttribute, kAXFocusedAttribute] {
            var value: CFTypeRef?
            if AXUIElementCopyAttributeValue(control, attribute as CFString, &value) == .success, let value {
                print("\(attribute): \(value)")
            }
        }
    }
    exit(0)
}

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
        event?.flags = down ? flags : []
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
    recognized = sorted(rows)
    if "Custom" not in rows:
        medium, narrow = rows["Medium"], rows["Narrow"]
        rows["Custom"] = {"text": "Custom", "x": narrow["x"], "y": 2 * narrow["y"] - medium["y"]}
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
    return {"before": state, "menu_labels": recognized, "custom_click_kept_value": True, "after": chosen}


def verify_voiceover(executable, state):
    command, shift, option, control = 1 << 20, 1 << 17, 1 << 19, 1 << 18
    path = EVIDENCE / "voiceover-runner.txt"
    subprocess.run(["open", "-b", "com.apple.VoiceOver"], capture_output=True, text=True, timeout=15)
    time.sleep(3)
    running = subprocess.run(["pgrep", "-x", "VoiceOver"], capture_output=True, text=True)
    if running.returncode:
        press(executable, 96, command)  # Command-F5.
        time.sleep(3)
        running = subprocess.run(["pgrep", "-x", "VoiceOver"], capture_output=True, text=True)
    ax = subprocess.run([str(executable), "accessibility"], capture_output=True, text=True, timeout=12)
    path.write_text(f"VoiceOver process status: {running.returncode}\n{ax.stdout}{ax.stderr}")
    try:
        capture("voiceover-start.png")
        if not running.returncode:
            press(executable, 109, command | option | control)
            press(executable, 118, shift | option | control)
            time.sleep(1)
            capture("voiceover-width.png")
            click(executable, state, state["width"])
            time.sleep(0.7)
            capture("voiceover-options.png")
    finally:
        if not running.returncode:
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
        press(executable, 49)  # Opening moves focus into the picker.
        entered = wait_state(lambda s: s.get("theme") == theme and s.get("open"))
        capture(f"{theme}-keyboard-Space.png")
        press(executable, 126)  # Arrow Up highlights Medium.
        navigated = wait_state(lambda s: s.get("theme") == theme and any(
            o["value"] == "4" and o["focused"] for o in s["options"]))
        capture(f"{theme}-keyboard-ArrowUp.png")
        press(executable, 53)
        escaped = wait_state(lambda s: s.get("theme") == theme and not s.get("open") and s.get("focused"))
        capture(f"{theme}-keyboard-Escape.png")
        assert escaped["value"] == "8", escaped
        result[theme] = {"expanded": expanded, "keyboard_open": entered, "keyboard_arrow_up": navigated, "keyboard_after_escape": escaped}
        (EVIDENCE / "native-result.json").write_text(json.dumps(result, indent=2) + "\n")
        print(f"{theme}: keyboard focused Width, keyboard-open={entered['open']}", flush=True)
        if theme == "light":
            subprocess.run(["open", "-a", "Safari", ORIGIN + "/ear-tuning?finder-qa=light&voiceover=1"], check=True, timeout=20)
            voice = wait_state(lambda s: s.get("theme") == "light" and s.get("value") == "custom")
            click(executable, voice, voice["width"])
            wait_state(lambda s: s.get("theme") == "light" and s.get("value") == "custom" and s.get("open"))
            press(executable, 53)
            voice = wait_state(lambda s: s.get("theme") == "light" and s.get("value") == "custom" and s.get("focused"))
            verify_voiceover(executable, voice)


if __name__ == "__main__":
    main()
