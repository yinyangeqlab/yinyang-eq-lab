"""Verify the Finder picker using SafariDriver and capture the actual screen."""

from base64 import b64decode
from contextlib import contextmanager
from http.client import HTTPConnection
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import time

TARGET = sys.argv[1]
assert TARGET in {"mac", "iphone"}
EVIDENCE = Path(os.environ["FINDER_EVIDENCE"])
ORIGIN = "http://127.0.0.1:5813"
WIDTH = ".ear-adjustment select"
OPTION = WIDTH + " option"
ELEMENT = "element-6066-11e4-a52e-4f735466cecf"


def wait(check, seconds=20):
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        try:
            value = check()
            if value:
                return value
        except (OSError, ValueError):
            pass
        time.sleep(0.35)
    r = check()
    if not r:
        raise RuntimeError("Timed out waiting for " + check.__name__)
    return r


def api(method, path, data=None, port=4444, timeout=120):
    conn = HTTPConnection("127.0.0.1", port, timeout=timeout)
    try:
        headers = {"Content-Type": "application/json"} if data is not None else {}
        conn.request(method, path, json.dumps(data) if data is not None else None, headers)
        response = conn.getresponse()
        body = response.read()
        if response.status >= 400:
            raise RuntimeError(f"{method} {path} returned HTTP {response.status}: {body[:1200].decode()}")
        return json.loads(body)
    finally:
        conn.close()


def layout_account():
    try:
        flags = api("GET", "/api/my-data", port=5813)
    except RuntimeError:
        return False
    return flags.get("testOnly") and not flags.get("submissionsEnabled") and not flags.get("sharedAdmin")


@contextmanager
def simulator():
    if TARGET == "mac":
        yield None
        return
    devices = json.loads(subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "-j"]))["devices"]
    phones = []
    for runtime, group in devices.items():
        version = re.match(r"^iOS-(\d+)-(\d+)(?:-(\d+))?(?:-|$)", runtime.rsplit(".", 1)[-1])
        if not version:
            continue
        release = tuple(int(number or 0) for number in version.groups())
        for device in group:
            if device["name"].startswith("iPhone") and device.get("isAvailable", True):
                phones.append((release, device["name"] == "iPhone 17", device))
    if not phones:
        raise RuntimeError("No available iPhone simulator is installed")
    release, _, device = max(phones, key=lambda row: (row[0] == (27, 0, 0), row[0], row[1]))
    print(f"Selected {device['name']} on iOS {'.'.join(map(str,release))}", flush=True)
    udid = device["udid"]
    subprocess.run(["xcrun", "simctl", "bootstatus", udid, "-b"], check=True, timeout=125)
    print("iPhone simulator booted", flush=True)
    try:
        for key in ("WebKitDeveloperExtrasEnabled", "AllowRemoteAutomation"):
            subprocess.run(["xcrun", "simctl", "spawn", udid, "defaults", "write",
                            "com.apple.mobilesafari", key, "-bool", "true"], check=True, timeout=20)
        subprocess.run(["xcrun", "simctl", "openurl", udid, ORIGIN + "/ear-tuning"], check=True, timeout=25)
        print("Mobile Safari opened in the simulator", flush=True)
        yield udid
    finally:
        subprocess.run(["xcrun", "simctl", "shutdown", udid], check=False)


class Safari:
    def __init__(self, base):
        self.base = base

    def request(self, method, path, data=None):
        return api(method, self.base + path, data)["value"]

    def js(self, script, *args):
        return self.request("POST", "/execute/sync", {"script": script, "args": args})

    def element(self, selector):
        return self.request("POST", "/element", {"using": "css selector", "value": selector})[ELEMENT]

    def click(self, selector):
        self.request("POST", f"/element/{self.element(selector)}/click", {})

    def input(self, selector, text):
        element = self.element(selector)
        self.request("POST", f"/element/{element}/clear", {})
        self.request("POST", f"/element/{element}/value", {"text": text})

    def key(self, key):
        self.request("POST", "/actions", {
            "actions": [{"type": "key", "id": "keyboard", "actions": [
                {"type": "keyDown", "value": key}, {"type": "keyUp", "value": key},
            ]}],
        })

    def point(self, selector):
        coord = self.js("""
          const node = document.querySelector(arguments[0]);
          const r = node?.getBoundingClientRect();
          if (!r?.width || !r.height || r.bottom > innerHeight || r.top < 0) return null;
          return [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)];
        """, selector)
        if coord is None:
            raise RuntimeError(f"No visible bounds for {selector}")
        x, y = coord
        self.request("POST", "/actions", {"actions": [{
            "type": "pointer", "id": "pointer", "parameters": {"pointerType": "mouse" if TARGET == "mac" else "touch"},
            "actions": [
                {"type": "pointerMove", "duration": 0, "origin": "viewport", "x": x, "y": y},
                {"type": "pointerDown", "button": 0}, {"type": "pointerUp", "button": 0},
            ],
        }]})

    def wait_for_paint(self):
        self.request("POST", "/execute/async", {
            "script": "const done = arguments[0]; setTimeout(() => done(false), 1000); requestAnimationFrame(() => requestAnimationFrame(() => done(true)));",
            "args": [],
        })
        time.sleep(0.35)

    def screenshot(self, filename):
        capture = b64decode(self.request("GET", "/screenshot"), validate=True)
        assert capture.startswith(b"\x89PNG\r\n\x1a\n"), "SafariDriver did not return a PNG"
        (EVIDENCE / filename).write_bytes(capture)

    def value(self, selector=WIDTH):
        return self.js("return document.querySelector(arguments[0])?.value;", selector)

    def is_open(self):
        return self.js("return document.querySelector(arguments[0])?.matches(':open');", WIDTH)


def screenshot(udid, filename):
    path = str(EVIDENCE / filename)
    command = ["screencapture", "-x", path] if udid is None else ["xcrun", "simctl", "io", udid, "screenshot", path]
    subprocess.run(command, check=True, timeout=25)
    assert Path(path).read_bytes()[:8] == b"\x89PNG\r\n\x1a\n", "The native screen capture was not a PNG"


def test_finder(browser, udid, theme):
    browser.request("POST", "/url", {"url": ORIGIN + "/ear-tuning"})
    wait(lambda: browser.js("return !!document.querySelector('.ear-tool button');"), 60)
    browser.js("document.documentElement.dataset.siteTheme = arguments[0];", theme)
    mark = browser.js("""
      const button = [...document.querySelectorAll('.ear-tool button')].find(b => b.textContent.includes('Mark peak at'));
      if (!button) return false;
      button.id = 'safari-qa-mark-peak';
      return true;
    """)
    assert mark
    for _ in range(6):
        if browser.value() == "4":
            break
        browser.click("#safari-qa-mark-peak")
        time.sleep(0.65)
    assert browser.value() == "4", "Finder did not mark a peak and start with Medium width"
    browser.click(".ear-adjustment-width summary")
    browser.input(".ear-adjustment-width-fields input", "5.25")
    browser.js("document.activeElement.blur();")
    wait(lambda: browser.value() == "custom")
    measured = browser.js("""
      const s = document.querySelector(arguments[0]);
      return {
        viewport: [innerWidth, innerHeight], ua: navigator.userAgent,
        appearance: getComputedStyle(s).appearance,
        scheme: getComputedStyle(s).colorScheme,
        options: [...s.options].map(o => {
          const css = getComputedStyle(o);
          return {text: o.label, selected: o.selected, disabled: o.disabled,
                  color: css.color, background: css.backgroundColor};
        }),
      };
    """, WIDTH)
    assert measured["scheme"] == theme, measured
    assert [o["text"] for o in measured["options"]] == ["Wide", "Medium", "Narrow", "Custom"], measured
    assert measured["options"][-1]["selected"] and measured["options"][-1]["disabled"], measured
    browser.js("document.querySelector(arguments[0]).scrollIntoView({block: 'center'});", WIDTH)
    if TARGET == "mac":
        browser.js("document.querySelector('.ear-adjustment input[type=range]').focus();")
        browser.key("\uE004")
        assert browser.js("""
          const el = document.querySelector(arguments[0]);
          return document.activeElement === el && el.matches(':focus-visible') && getComputedStyle(el).outlineStyle === 'solid';
        """, WIDTH), "Width did not receive visible keyboard focus"
    browser.wait_for_paint()
    browser.screenshot(f"{theme}-width-closed.png")
    browser.point(WIDTH)
    wait(browser.is_open)
    browser.wait_for_paint()
    usable_picker = browser.js("""
      return [...document.querySelectorAll(arguments[0])].every(o => {
        const r = o.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight;
      });
    """, OPTION)
    browser.screenshot(f"{theme}-width-page.png")
    screenshot(udid, f"{theme}-width-open.png")
    assert usable_picker, "Picker rows were not measurable within the Safari viewport"
    if TARGET == "mac":
        browser.key("\uE00C")
        assert not browser.is_open()
        assert browser.value() == "custom"
        assert browser.js("return document.activeElement === document.querySelector(arguments[0]);", WIDTH)
        browser.point(WIDTH)
        wait(browser.is_open)
    browser.point(OPTION + '[value="custom"]')
    assert browser.value() == "custom", "Activating disabled Custom changed the width"
    if not browser.is_open():
        browser.point(WIDTH)
        wait(browser.is_open)
    browser.point(OPTION + '[value="8"]')
    wait(lambda: browser.value() == "8")
    assert browser.js("return !document.querySelector(arguments[0]);", OPTION + '[value="custom"]')
    measured["checks"] = {"open": True, "customDisabledActivationIgnored": True,
                          "narrowSelected": True, "desktopFocusAndEscape": TARGET == "mac"}
    print(f"{TARGET} {theme}: open picker, disabled Custom, and Narrow selection passed", flush=True)
    return measured


@contextmanager
def driver_server():
    with (EVIDENCE / "safaridriver.log").open("wb") as log:
        driver = subprocess.Popen(["/usr/bin/safaridriver", "--port", "4444"], stdout=log, stderr=log)
        def driver_ready():
            if driver.poll() is not None:
                raise RuntimeError(f"SafariDriver stopped with status {driver.returncode}")
            return api("GET", "/status", timeout=4)["value"]["ready"]
        try:
            wait(driver_ready, 40)
            print("SafariDriver is listening on loopback", flush=True)
            yield
        finally:
            if driver.poll() is None:
                driver.terminate()
                driver.wait(timeout=15)


def main():
    wait(layout_account, 105)
    print("Synthetic layout account verified", flush=True)
    if TARGET == "iphone":
        xcode = Path("/Applications/Xcode_27.0.app/Contents/Developer")
        if xcode.is_dir():
            os.environ["DEVELOPER_DIR"] = str(xcode)
        subprocess.run(["xcodebuild", "-version"], check=True, timeout=20)
    with driver_server(), simulator() as udid:
        capabilities = {"browserName": "Safari"}
        if udid:
            capabilities.update({"platformName": "iOS", "safari:useSimulator": True, "safari:deviceType": "iPhone"})
        print("Opening Safari WebDriver session", flush=True)
        session = api("POST", "/session", {"capabilities": {"alwaysMatch": capabilities}})["value"]
        browser = Safari("/session/" + session["sessionId"])
        if udid:
            actual_device = session["capabilities"].get("safari:deviceUDID")
            assert not actual_device or actual_device.casefold() == udid.casefold(), "SafariDriver selected a different simulator"
        output = {"target": TARGET, "capabilities": session["capabilities"], "themes": {}}
        try:
            if TARGET == "mac":
                browser.request("POST", "/window/rect", {"x": 10, "y": 40, "width": 1000, "height": 675})
            for theme in ("dark", "light"):
                try:
                    output["themes"][theme] = test_finder(browser, udid, theme)
                except Exception:
                    screenshot(udid, f"{theme}-failure.png")
                    raise
        finally:
            (EVIDENCE / "result.json").write_text(json.dumps(output, indent=2) + "\n")
            browser.request("DELETE", "")


if __name__ == "__main__":
    main()
