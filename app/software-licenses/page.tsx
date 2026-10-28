export default function SoftwareLicenses() {
  return <main className="page-shell" style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
    <h1>Software licenses</h1>
    <h2>PEQdB AutoEQ</h2>
    <p>This application uses autoeq-c, Copyright © 2026 PEQdB Inc., under LGPL-3.0-or-later. Its use is covered by the GNU Lesser General Public License.</p>
    <p><a href="/vendor/peqdb-autoeq/LICENSE">GNU LGPL version 3</a> · <a href="/vendor/peqdb-autoeq/COPYING">GNU GPL version 3</a> · <a href="/vendor/peqdb-autoeq/RUNTIME-NOTICES.txt">Runtime notices</a> · <a href="/vendor/peqdb-autoeq/source.tar.gz">Corresponding engine and application source, modifications and build instructions</a></p>
    <p>The engine is a separate WebAssembly module. You may modify or replace it with an interface-compatible build. The source package includes the exact modified library source and the original application code needed to rebuild and recombine this version. You may reverse engineer the application to debug modifications to the library. No application terms restrict these LGPL rights.</p>
    <p>Our original application code retains its Apache 2.0 license. Other materials retain their separate rights. The library and its modifications remain available under LGPL-3.0-or-later, with no warranty. <a href="https://github.com/peqdb/autoeq-c/tree/fdc0db772164387c2df8739742594197c6851fc3">Upstream source</a>.</p>
  </main>;
}
