// Real component callbacks and focus effects, with synthetic DOM/storage only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = path => ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const compile = text => ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function declarations(path, names) {
  const ast = source(path), found = [];
  function visit(node) { if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) found.push(node.getText(ast)); ts.forEachChild(node, visit); }
  visit(ast); assert.equal(found.length, names.length); return compile(found.join('\n').replace(/^export /gm, ''));
}
function effect(path, marker) {
  const ast = source(path); let callback;
  function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0].getText(ast).includes(marker)) callback = node.arguments[0].getText(ast); ts.forEachChild(node, visit); }
  visit(ast); assert.ok(callback); return compile('const runEffect=' + callback + ';');
}
const text = n => n == null || typeof n === 'boolean' ? '' : typeof n !== 'object' ? String(n) : Array.isArray(n) ? n.map(text).join('') : text(n.props?.children);
const all = (n, predicate) => !n || typeof n !== 'object' ? [] : Array.isArray(n) ? n.flatMap(x => all(x, predicate)) : [...(predicate(n) ? [n] : []), ...all(n.props?.children, predicate)];
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const searchModule = { exports: {} };
vm.runInNewContext(compile(fs.readFileSync('lib/search.ts', 'utf8')), { module: searchModule, exports: searchModule.exports });
const measurement = {};
vm.createContext(measurement); vm.runInContext(declarations('lib/measurement.ts', ['isImportedMeasurement']), measurement);

function picker(onImport = async () => {}) {
  const hooks = [], frames = [], effects = [], body = {}, document = { body, activeElement: body, addEventListener() {}, removeEventListener() {} };
  let index = 0, tree, inputProps, props;
  const input = { kind: 'input', focus() { document.activeElement = input; inputProps.onFocus({ currentTarget: { select() {} } }); }, select() {} };
  const option = { kind: 'option', focus() { document.activeElement = option; } };
  const host = { contains: node => node === input || node === option, querySelector: () => all(tree, n => n.props?.['data-measurement-option'] !== undefined).length ? option : null };
  const react = {
    useId: () => 'measurement-fixture',
    useState(value) { const i = index++; if (!(i in hooks)) hooks[i] = { value }; return [hooks[i].value, next => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; }]; },
    useRef(value) { const i = index++; return hooks[i] ||= { current: value }; },
    useEffect(fn, deps) { const i = index++; if (!hooks[i] || !deps || deps.some((v, j) => v !== hooks[i].deps[j])) { const old = hooks[i]?.cleanup; hooks[i] = { deps }; effects.push(() => { old?.(); hooks[i].cleanup = fn(); }); } },
  };
  const jsx = (type, p) => { if (type === 'input') { inputProps = p; if (p.ref) p.ref.current = input; } if (p?.className === 'headphone-search') p.ref.current = host; return { type, props: p }; };
  const mod = { exports: {} };
  const catalog = [{ name: 'Synthetic headphones', path: 'synthetic.txt', type: 'oe', source: 'Synthetic source', rig: 'Synthetic rig' }];
  vm.runInNewContext(compile(fs.readFileSync('components/headphone-picker.tsx', 'utf8')), {
    module: mod, exports: mod.exports, document, Error, requestAnimationFrame: fn => frames.push(fn), window: { confirm: () => true },
    fetch: async () => ({ ok: true, json: async () => ({ entries: catalog }) }),
    require(id) { if (id === 'react') return react; if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx }; if (id.endsWith('.css')) return {}; if (id === '@/lib/search') return searchModule.exports; if (id === '@/lib/measurement') return measurement; throw Error(id); },
  });
  props = { rows: [{ id: 'saved', name: 'Saved synthetic', type: 'oe', origin: 'upload', rig: 'Fixture', source: 'Fixture', notes: '' }], selectedId: 'saved', headphoneType: 'oe', onType() {}, onSelect(id) { props.selectedId = id; }, onClear() { props.selectedId = ''; }, onImport, onUpload() {}, onEdit() {}, onDelete() {} };
  const render = () => { index = 0; tree = mod.exports.default(props); while (effects.length) effects.shift()(); return tree; };
  render();
  return {
    render, input, option, document, props,
    get inputProps() { return inputProps; }, get tree() { return tree; },
    button(name) { const n = all(tree, n => n.type === 'button' && text(n) === name)[0]; assert.ok(n, name); return n; },
    publicButton() { const n = all(tree, n => n.type === 'button' && text(n).startsWith('Synthetic headphones'))[0]; assert.ok(n); return n; },
    open() { input.focus(); render(); }, frames() { while (frames.length) frames.shift()(); },
    openRegion() { return all(tree, n => n.props?.role === 'region').length > 0; },
  };
}
let checks = 0;
{
  const h = picker(); h.open(); await flush(); h.render(); h.document.activeElement = h.option;
  all(h.tree, n => n.type === 'button' && text(n).startsWith('Saved synthetic'))[0].props.onClick(); h.render();
  assert.equal(h.document.activeElement, h.input); assert.equal(h.openRegion(), false); checks++;
  h.inputProps.onKeyDown({ key: 'ArrowDown', preventDefault() {} }); h.render(); h.frames();
  assert.equal(h.openRegion(), true); assert.equal(h.document.activeElement, h.option); checks++;
  h.document.activeElement = h.input; h.inputProps.onKeyDown({ key: 'Escape' }); h.render();
  h.inputProps.onKeyDown({ key: 'ArrowDown', preventDefault() {} }); h.render(); const other = {}; h.document.activeElement = other; h.frames();
  assert.equal(h.document.activeElement, other); checks++;
  h.button('Remove selection').props.onClick(); h.render();
  assert.equal(h.props.selectedId, ''); assert.equal(h.document.activeElement, h.input); assert.equal(h.openRegion(), false); checks++;
}
for (const moved of [false, true]) {
  let resolve; const pending = new Promise(r => { resolve = r; }); const h = picker(() => pending); h.open(); await flush(); h.render(); h.document.activeElement = h.option;
  h.publicButton().props.onClick(); h.render(); const other = {}; if (moved) h.document.activeElement = other;
  resolve(); await flush(); h.render(); assert.equal(h.document.activeElement, moved ? other : h.input); assert.equal(h.openRegion(), false); checks++;
}
{
  const h = picker(async () => { throw Error('Synthetic import failed'); }); h.open(); await flush(); h.render(); h.document.activeElement = h.option;
  h.publicButton().props.onClick(); await flush(); h.render(); assert.equal(h.openRegion(), true); assert.match(text(h.tree), /Synthetic import failed/); checks++;
}
const viewEffect = effect('app/shootout/personal/page.tsx', 'const destination=viewFocusPending.current');
for (const scenario of ['comparison', 'results', 'safety', 'other-focus', 'wrong-view', 'missing-target', 'idle']) {
  const events = [], scrolls = [], body = {}, target = { focus: () => events.push('results'), scrollIntoView: options => scrolls.push(options) };
  const state = { viewFocusPending: { current: scenario === 'idle' ? null : scenario === 'results' ? 'results' : 'comparison' }, listeningReminder: { open: scenario === 'safety' }, results: ['results', 'wrong-view'].includes(scenario), document: { body, activeElement: scenario === 'other-focus' ? {} : body, querySelector: () => scenario === 'missing-target' ? null : target }, focusComparisonPlayback: (_root, options) => events.push(options.preventScroll) };
  vm.createContext(state); vm.runInContext(viewEffect, state); vm.runInContext('runEffect()', state);
  assert.deepEqual(events, scenario === 'results' ? ['results'] : scenario === 'comparison' ? [false] : []); if (scenario === 'results') { assert.equal(scrolls[0].block, 'start'); assert.equal(scrolls[0].behavior, 'instant'); } else assert.equal(scrolls.length, 0); checks++;
  if (scenario === 'safety') { assert.equal(state.viewFocusPending.current, 'comparison'); state.listeningReminder.open = false; vm.runInContext('runEffect()', state); assert.deepEqual(events, [false]); checks++; }
  if (scenario === 'comparison' || scenario === 'results') { vm.runInContext('runEffect()', state); assert.equal(events.length, 1); checks++; }
}
for (const failed of [false, true]) {
  const events = [], state = { run: null, next: { mode: 'playlist', ids: [] }, musicRemountPending: { current: false }, player: { current: null }, emptyPair: {}, setDraftMusic: () => events.push('draft'), setUploadedSong() {}, setHeard() {}, setNotice: s => events.push(s), safely: fn => fn() };
  state.run = failed ? {} : null; state.update = () => { throw Error('Synthetic quota'); };
  vm.createContext(state); vm.runInContext(declarations('app/shootout/personal/page.tsx', ['chooseMusic']), state);
  if (failed) { assert.throws(() => state.chooseMusic(state.next), /quota/); assert.deepEqual(events, []); }
  else { state.chooseMusic(state.next); assert.deepEqual(events, ['draft', '']); }
  checks++;
}
console.log(`PASS ${checks} first-time journey checks: selection/import/remove focus, safe async completion, keyboard reopening, failed import recovery, guarded one-shot view focus and truthful pre-start feedback.`);
