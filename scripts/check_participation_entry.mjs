import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gate = readFileSync(new URL('../infra/pulumi/private-gate.mjs', import.meta.url), 'utf8');
const practiceScores = gate.match(/const practiceScores = [^;]+;/)?.[0];
const start = gate.indexOf('const agreementException =');
const end = gate.indexOf('if (!owner && (["/shootout"', start);
assert.ok(practiceScores && start > 0 && end > start);
const check = new Function('request', 'data', 'owner', 'tester', 'dataRoute', 'json', 'finish', `
  const url = new URL(request.url), path = url.pathname;
  const blockedSubmission = (_reason, response) => response;
  ${practiceScores}
  ${gate.slice(start, end)}
  return null;
`);

const entries = [
  '/participation', '/shootout', '/music-library', '/preference-tuning',
  '/api/votes', '/api/my-data', '/api/ear-practice', '/api/ear-practice-other',
];
for (const canParticipate of [true, false]) {
  for (const path of entries) {
    const method = path.startsWith('/api/') ? 'POST' : 'GET';
    const dataRoute = path === '/api/my-data';
    const request = new Request('https://example.test' + path, { method });
    const result = check(request, { canParticipate }, false, {}, dataRoute,
      (body, status) => Response.json(body, { status }), response => response);
    // Ranked practice checks its separate consent inside its own API handler.
    if (canParticipate || dataRoute || method === 'GET' || path === '/api/ear-practice') {
      assert.equal(result, null, path);
    } else {
      assert.equal(result.status, 403, path);
    }
  }
}

// Exercise the shared editor's request and navigation behavior.
await import('./check_unified_consent_flow.mjs');
console.log('PASS actual participation gate: viewing, data management, and independent ranked practice consent remain available; research writes require agreement.');
