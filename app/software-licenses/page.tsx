import { shareMetadata } from "@/lib/share-metadata";

export const metadata = shareMetadata("/software-licenses");

export default function SoftwareLicenses() {
  return <main className="page-shell" style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>
    <h1>Software licenses</h1>
    <h2>AutoEq target source index</h2>
    <p>Jaakko Pasanen’s AutoEq code uses the MIT license. The <a href="https://github.com/jaakkopasanen/AutoEq/issues/790">maintainer’s license note</a> excludes data from that grant. The <a href="/curve-credits#autoeq-library">target source index</a> credits the curve sources and links to their files.</p>
    <h2>Potion 2M</h2>
    <p>Site help can use a quantized copy of MinishLab’s <a href="https://huggingface.co/minishlab/potion-base-2M">Potion 2M model</a> under MIT. See the <a href="/vendor/site-help/LICENSE.txt">Model2Vec MIT notice</a>.</p>
    <h2>PEQdB AutoEQ</h2>
    <p>This application uses autoeq-c, Copyright © 2026 PEQdB Inc., under LGPL-3.0-or-later. Its use is covered by the GNU Lesser General Public License.</p>
    <p><a href="/vendor/peqdb-autoeq/LICENSE">GNU LGPL version 3</a> · <a href="/vendor/peqdb-autoeq/COPYING">GNU GPL version 3</a> · <a href="/vendor/peqdb-autoeq/RUNTIME-NOTICES.txt">Runtime notices</a> · <a href="/vendor/peqdb-autoeq/source.tar.gz">Corresponding engine and application source, modifications and build instructions</a></p>
    <p>The engine is a separate WebAssembly module. You may modify or replace it with an interface-compatible build. The source package includes the exact modified library source and the original application code needed to rebuild and recombine this version. You may reverse engineer the application to debug modifications to the library. No application terms restrict these LGPL rights.</p>
    <p>Our original application code retains its Apache 2.0 license. Other materials retain their separate rights. The library and its modifications remain available under LGPL-3.0-or-later, with no warranty. <a href="https://github.com/peqdb/autoeq-c/tree/fdc0db772164387c2df8739742594197c6851fc3">Upstream source</a>.</p>
  </main>;
}
