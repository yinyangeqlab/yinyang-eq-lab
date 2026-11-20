import {createEngine} from './peqdb-engine';
import {createFitRunner} from './autoeq-runner';
import type {AutoEqRequest} from './autoeq-fit';

const fit = createFitRunner(async () => {
  const {default: factory} = await import(/* @vite-ignore */ "/vendor/peqdb-autoeq/autoeq-wasm.mjs");
  return createEngine(factory);
});
self.onmessage = async ({data: {id, request}}: MessageEvent<{id:number; request:AutoEqRequest}>) => {
  try { self.postMessage({id, ...await fit(request)}); }
  catch { self.postMessage({id, error:'Could not prepare EQ from these curves.'}); }
};
