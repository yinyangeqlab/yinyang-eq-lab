import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { peqdbAssets, peqdbSourceSnapshot } from '../scripts/peqdb-assets.mjs';
let buildSnapshot;
export function peqdbLocalAssets() {
  let building = false;
  return { name: 'peqdb-local-assets', configResolved(config) { building = config.command === 'build'; }, buildStart() {
    if (!building) return;
    const current = peqdbSourceSnapshot();
    buildSnapshot ??= current;
    if (JSON.stringify(current) !== JSON.stringify(buildSnapshot)) throw Error('Application source changed during the build; rebuild before packaging.');
  }, writeBundle() {
    if (!building) return;
    mkdirSync('dist', { recursive: true });
    writeFileSync('dist/peqdb-build-source.json', JSON.stringify(buildSnapshot));
  }, resolveId(source) {
    if (source === '/vendor/peqdb-autoeq/autoeq-wasm.mjs') return { id: source, external: true };
  }, configureServer(server) {
    server.middlewares.use('/vendor/peqdb-autoeq', (request, response, next) => {
      const name = request.url?.split('?')[0].slice(1);
      if (!['autoeq-wasm.mjs', 'autoeq-wasm.wasm', 'LICENSE', 'COPYING', 'source.tar.gz', 'RUNTIME-NOTICES.txt'].includes(name)) return next();
      response.setHeader('Content-Type', name.endsWith('.mjs') ? 'text/javascript' : name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.gz') ? 'application/gzip' : 'text/plain; charset=utf-8');
      const input = createReadStream(resolve(peqdbAssets, name));
      input.on('error', () => { response.statusCode = 404; response.end('Local PEQdB assets have not been prepared.'); }); input.pipe(response);
    });
  } };
}
