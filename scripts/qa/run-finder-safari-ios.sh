#!/usr/bin/env bash
set -euo pipefail

root="$(pwd)"
qa="$RUNNER_TEMP/finder-ios"
mkdir -p "$qa"
cp "$root/scripts/qa/finder-safari-ios.swift" "$qa/FinderSafariTest.swift"
cat > "$qa/Host.swift" <<'SWIFT'
import UIKit

@main
final class Host: UIResponder, UIApplicationDelegate {}
SWIFT

cat > "$qa/project.yml" <<'YAML'
name: FinderSafariQA
options:
  deploymentTarget:
    iOS: "26.0"
settings:
  base:
    CODE_SIGNING_ALLOWED: NO
    GENERATE_INFOPLIST_FILE: YES
targets:
  FinderTestHost:
    type: application
    platform: iOS
    sources: [Host.swift]
    settings:
      PRODUCT_BUNDLE_IDENTIFIER: com.yinyangeqlab.finder-qa
  FinderSafariUITests:
    type: bundle.ui-testing
    platform: iOS
    sources: [FinderSafariTest.swift]
    dependencies:
      - target: FinderTestHost
    settings:
      PRODUCT_BUNDLE_IDENTIFIER: com.yinyangeqlab.finder-qa.uitests
      TEST_TARGET_NAME: FinderTestHost
schemes:
  FinderSafariQA:
    build:
      targets:
        FinderTestHost: all
        FinderSafariUITests: [test]
    test:
      targets: [FinderSafariUITests]
YAML

(
  cd "$qa"
  xcodegen generate
)
xcrun simctl list devices available -j > "$qa/devices.json"
udid="$(python3 - "$qa/devices.json" <<'PY'
import json
import re
import sys
from pathlib import Path
groups = json.loads(Path(sys.argv[1]).read_text())["devices"]
candidates = []
for runtime, devices in groups.items():
    match = re.search(r"\.iOS-(27)-(\d+)(?:-(\d+))?$", runtime)
    if match:
        version = tuple(int(n or 0) for n in match.groups())
        for device in devices:
            if device["name"].startswith("iPhone") and device.get("isAvailable", True):
                candidates.append((version[:2] == (27, 2), version, device["name"] == "iPhone 17", device["udid"]))
if not candidates:
    raise SystemExit("No available iPhone with iOS 27")
print(max(candidates)[-1])
PY
)"
xcrun simctl bootstatus "$udid" -b
xcrun simctl openurl "$udid" 'http://127.0.0.1:5813/ear-tuning?finder-qa=dark'

result="$qa/FinderSafariQA.xcresult"
code=0
xcodebuild test -project "$qa/FinderSafariQA.xcodeproj" -scheme FinderSafariQA \
  -destination "platform=iOS Simulator,id=$udid" -parallel-testing-enabled NO \
  -resultBundlePath "$result" > "$FINDER_EVIDENCE/xcode-test.log" 2>&1 || code=$?
tail -n 50 "$FINDER_EVIDENCE/xcode-test.log"
if [ -d "$result" ]; then
  xcrun xcresulttool export attachments --path "$result" --output-path "$FINDER_EVIDENCE/attachments"
fi
exit "$code"
