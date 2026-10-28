import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createReadStream } from 'node:fs';
import { peqdbLocalAssets } from '../../build/peqdb-local-assets.mjs';
const publicRoot = fileURLToPath(new URL('../../artifacts/autoeq-lab/public', import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  worker: { plugins: () => [peqdbLocalAssets()] },
  publicDir: fileURLToPath(new URL('../../artifacts/autoeq-lab/public', import.meta.url)),
  plugins: [react(), peqdbLocalAssets(), { name: 'local-autoeq-engine', configureServer(server) {
    // Serve the replaceable generated module verbatim rather than bundling it.
    server.middlewares.use('/engine', (request, response, next) => {
      const name = request.url?.split('?')[0].slice(1);
      if (!name || !['autoeq-wasm.mjs', 'autoeq-wasm.wasm', 'LICENSE', 'COPYING', 'source.tar.gz'].includes(name)) return next();
      response.setHeader('Content-Type', name.endsWith('.mjs') ? 'text/javascript' : name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.gz') ? 'application/gzip' : 'text/plain');
      const stream = createReadStream(`${publicRoot}/engine/${name}`);
      stream.on('error', () => { response.statusCode = 404; response.end('Run prepare.py first.'); });
      stream.pipe(response);
    });
  } }],
  resolve: { alias: { '@': fileURLToPath(new URL('../..', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 5199, strictPort: true, fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } },
  build: { outDir: '../../artifacts/autoeq-lab/dist', emptyOutDir: true },
});
