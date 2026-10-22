// Execute the actual automatic-sync effect with blocked browser storage.
// No network, cookies, participant data or real browser state.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from '../node_modules/typescript/lib/typescript.js';

const file = new URL('../components/account-auto-sync.tsx', import.meta.url);
const text = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile('account.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect') effect = node.arguments[0].getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(effect);
// Observe the effect's asynchronous entry point without changing its work.
const executable = ts.transpileModule('const run=' + effect.replace('void tick();const timer=', 'pending.push(tick());const timer=') + ';run();', {
  compilerOptions: {target: ts.ScriptTarget.ES2022},
}).outputText;
for (const getterDenied of [false, true]) {
  const blocked = () => { const error = Error('Site storage is blocked'); error.name = 'SecurityError'; throw error; };
  const pending = [];
  let status = '', requests = 0, locks = 0;
  const context = {pending, pathname: '/account-sync', Date, Event,
    setStatus: value => {status = value;}, setConflicts() {}, setRefresh() {},
    captureAccountValues: blocked, accountDataDigest: async () => 'unused',
    fetch: async () => { requests++; throw Error('No transport allowed'); },
    document: {visibilityState: 'visible', addEventListener() {}, removeEventListener() {}},
    window: {setInterval() {return 1;}, clearInterval() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}},
    navigator: {locks: {request: async () => {locks++; throw Error('Must stop before acquiring a lock');}}},
  };
  context.localStorage = {getItem: blocked};
  const getter = getterDenied ? "Object.defineProperty(globalThis, 'localStorage', {get() {const error = Error('Site storage is blocked'); error.name = 'SecurityError'; throw error;}});" : '';
  const realm = vm.createContext(vm.constants.DONT_CONTEXTIFY);
  Object.assign(realm, context);
  vm.runInContext(getter + executable, realm);
  assert.equal(pending.length, 1);
  const [result] = await Promise.allSettled(pending);
  assert.equal(result.status, 'fulfilled', 'Storage denial must not escape as an unhandled rejection');
  assert.match(status, /storage is unavailable/i);
  assert.equal(requests, 0); assert.equal(locks, 0);
}
console.log('PASS blocked localStorage getter and getItem: visible paused state, no unhandled rejection, no network or account writes.');
