import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real component's callbacks without a backend or listening session.
const code = ts.transpileModule(fs.readFileSync('components/research-music-source.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const ref = { current: null }, mod = { exports: {} }, events = [];
const jsx = (type, props) => {
  if (type === 'select') props.ref.current = { focus(options) { events.push(['focus', options.preventScroll]); } };
  return { type, props };
};
vm.runInNewContext(code, {
  module: mod, exports: mod.exports,
  require(id) {
    if (id === 'react') return { useRef: () => ref };
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    throw Error(id);
  },
});
const all = (node, found = []) => {
  if (Array.isArray(node)) node.forEach(n => all(n, found));
  else if (node && typeof node === 'object') { found.push(node); all(node.props?.children, found); }
  return found;
};
let source = 'bring';
const props = {
  source, activeSource: 'blind', disabled: false,
  onCancel() { events.push(['cancel']); source = 'blind'; },
  onStart() { events.push(['start']); }, onChange(next) { source = next; },
};
const render = (extra = {}) => all(mod.exports.default({ ...props, source, ...extra }));
const pending = render(), keep = pending.find(n => n.type === 'button' && n.props.children === 'Keep current source');
keep.props.onClick();
assert.deepEqual(events, [['cancel'], ['focus', true]], 'Cancellation restores focus without scrolling, after the parent callback');
const restored = render();
assert.equal(restored.find(n => n.type === 'select').props.value, 'blind');
assert.equal(restored.some(n => n.props?.className === 'research-source-switch'), false, 'The pending confirmation is removed');
events.length = 0; source = 'bring';
render().find(n => n.type === 'button' && n !== keep).props.onClick();
assert.deepEqual(events, [['start']], 'Start retains parent-owned listening/reminder focus and is not auto-confirmed');
const disabled = render({ disabled: true });
assert.ok(disabled.filter(n => ['button', 'select'].includes(n.type)).every(n => n.props.disabled), 'Busy/consent disabling stays intact');
console.log('PASS 5 research-source focus checks: cancel ordering, focus without scroll, confirmed source, pending removal, and protected start/disabled controls.');
