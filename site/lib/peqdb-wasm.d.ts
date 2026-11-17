declare module '*autoeq-wasm.mjs' {
  const factory: import('./peqdb-engine').WasmFactory;
  export default factory;
}
