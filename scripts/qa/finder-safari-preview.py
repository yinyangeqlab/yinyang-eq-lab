"""Serve the actual Finder on loopback using the synthetic, non-contributing account."""

from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import secrets
import sqlite3
import sys
import time
from urllib.parse import parse_qs, urlsplit

if len(sys.argv) != 2:
    raise SystemExit("Usage: finder-safari-preview.py PORT")
PORT = int(sys.argv[1])
SESSION = secrets.token_hex(32)
NATIVE_SCRIPT = Path(__file__).with_name("finder-safari-native.js")
PROBE = Path(os.environ["FINDER_EVIDENCE"]) / "native-state.json" if "FINDER_EVIDENCE" in os.environ else None
CENTER = PROBE.with_name(".center-picker") if PROBE else None

database, = sorted(Path(".wrangler/state").glob("v3/d1/miniflare-D1DatabaseObject/" + "?" * 64 + ".sqlite"))
with sqlite3.connect(database) as db:
    db.execute("INSERT OR IGNORE INTO privacy_accounts(subject_id) VALUES ('invite:layout-test-only')")
    db.execute(
        "INSERT INTO privacy_sessions(token_hash, subject_id, expires_at) VALUES (?, 'invite:layout-test-only', ?)",
        (SESSION, round(time.time() * 1000) + 60 * 60 * 1000),
    )


class Preview(BaseHTTPRequestHandler):
    def do_GET(self):
        url = urlsplit(self.path)
        if PROBE and url.path == "/__finder_qa_state":
            states = parse_qs(url.query).get("state", [])
            if len(states) == 1 and len(states[0]) < 6000:
                state = json.loads(states[0])
                scratch = PROBE.with_name(f".state-{secrets.token_hex(6)}")
                scratch.write_text(json.dumps(state))
                scratch.replace(PROBE)
            self.send_response(204)
            if CENTER.is_file():
                CENTER.unlink(missing_ok=True)
                self.send_header("X-Finder-QA-Center", "1")
            self.end_headers()
            return
        if PROBE and url.path == "/__finder_qa_status":
            if url.query == "center=1":
                CENTER.touch()
            body = PROBE.read_bytes() if PROBE.is_file() else b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        headers = {
            "Accept": self.headers.get("Accept", "*/*"),
            "User-Agent": self.headers.get("User-Agent", ""),
            "x-yinyang-data-session": SESSION,
        }
        upstream = HTTPConnection("127.0.0.1", 5173, timeout=90)
        try:
            upstream.request("GET", self.path, headers=headers)
            response = upstream.getresponse()
            body = response.read()
            if (PROBE and url.path == "/ear-tuning" and parse_qs(url.query).get("finder-qa") in (["dark"], ["light"])
                    and response.status == 200 and not response.getheader("Content-Encoding")):
                script = b"<script type=module>" + NATIVE_SCRIPT.read_bytes() + b"</script>"
                body = body.replace(b"</body>", script + b"</body>", 1)
            self.send_response(response.status)
            self.send_header("Content-Type", response.getheader("Content-Type", "application/octet-stream"))
            if response.getheader("Content-Encoding"):
                self.send_header("Content-Encoding", response.getheader("Content-Encoding"))
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Security-Policy", "connect-src 'self'; media-src 'self' blob: data:; form-action 'none'")
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            upstream.close()

    def log_message(self, *_):
        pass


with ThreadingHTTPServer(("127.0.0.1", PORT), Preview) as proxy:
    proxy.serve_forever()
