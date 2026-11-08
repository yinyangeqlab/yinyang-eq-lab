import assert from 'node:assert/strict';
import { warningFor } from '../lib/service-warning.ts';
for (const [header, expected] of [['10',/10 seconds/],['900',/15 minutes/],['3600',/1 hour/],['86400',/24 hours/]]) {
 const warning=warningFor(new Response(null,{status:429,headers:{'Retry-After':header}}));
 assert.equal(warning.title,'Please wait before trying again'); assert.match(warning.retry,expected);
 assert.match(warning.detail,/wasn’t accepted/);
}
assert.match(warningFor(new Response(null,{status:429})).retry,/come back again later/);
assert.match(warningFor(new Response(null,{status:429,headers:{'Retry-After':'garbage'}})).retry,/come back again later/);
assert.match(warningFor(new Response(null,{status:429,headers:{'Retry-After':new Date(Date.now()+120000).toUTCString()}})).retry,/minutes/);
assert.equal(warningFor(new Response(null,{status:200})),null);
assert.equal(warningFor(new Response(null,{status:403})),null);
assert.equal(warningFor(new Response(null,{status:500})).retry,null);
console.log('Submission notices explain the wait, distinguish rejected requests from saved results, and show seconds/minutes/hours or a safe return-later fallback.');
