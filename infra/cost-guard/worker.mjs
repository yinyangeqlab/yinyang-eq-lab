import { cycleStart, decide, groupSum, usageDollars } from './policy.mjs';

export const EXPRESSION = '(http.host in {"yinyangeq.com" "www.yinyangeq.com" "staging.yinyangeq.com"})';
export const DESCRIPTION = 'Listening pool budget circuit breaker — manual reset only';

export async function api(env, path, init = {}, fetcher = fetch) {
  const response = await fetcher('https://api.cloudflare.com/client/v4' + path, {
    ...init,
    headers: { Authorization: `Bearer ${env.COST_GUARD_API_TOKEN}`, 'Content-Type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Cloudflare API ${response.status} at ${path.split('?')[0]}`);
  const body = await response.json();
  if (body.success === false || body.errors?.length) throw new Error('Cloudflare API rejected request');
  return body;
}

export async function readMetrics(env, now = new Date(), fetcher = fetch) {
  const start = cycleStart(now, Number(env.BILLING_CYCLE_DAY || 18));
  const end = now.toISOString();
  const date = d => d.toISOString().slice(0, 10);
  const workers = (alias, from) => `${alias}: workersInvocationsAdaptive(limit: 1, filter: {scriptName: $script, datetime_geq: "${from.toISOString()}", datetime_leq: $end}) { sum { requests cpuTimeUs } }`;
  const d1 = (alias, from) => `${alias}: d1AnalyticsAdaptiveGroups(limit: 1, filter: {databaseId: $database, date_geq: "${date(from)}", date_leq: "${date(now)}"}) { sum { rowsRead rowsWritten } }`;
  // D1 date-level windows deliberately include the whole preceding UTC day,
  // rather than understating usage at midnight. No listener rows are queried.
  const query = `query CostGuard($account: string!, $script: string!, $database: string!, $end: string!) {
    viewer { accounts(filter: {accountTag: $account}) {
      ${workers('short', new Date(+now - 15 * 60_000))}
      ${workers('day', new Date(+now - 24 * 3600_000))}
      ${workers('cycle', start)}
      ${d1('dbDay', new Date(+now - 24 * 3600_000))}
      ${d1('dbCycle', start)}
    } }
  }`;
  const [billing, analytics] = await Promise.all([
    api(env, `/accounts/${env.ACCOUNT_ID}/billable-usage`, {}, fetcher),
    api(env, '/graphql', { method: 'POST', body: JSON.stringify({query, variables: {account: env.ACCOUNT_ID, script: env.APP_SCRIPT, database: env.DATABASE_ID, end}}) }, fetcher),
  ]);
  const accounts = analytics.data?.viewer?.accounts;
  if (!Array.isArray(accounts) || accounts.length !== 1) throw new Error('Analytics account missing');
  const a = accounts[0];
  return {
    usageDollars: usageDollars(billing),
    requests15m: groupSum(a.short, 'requests'),
    requests24h: groupSum(a.day, 'requests'),
    requestsCycle: groupSum(a.cycle, 'requests'),
    cpu15mMs: groupSum(a.short, 'cpuTimeUs') / 1000,
    cpu24hMs: groupSum(a.day, 'cpuTimeUs') / 1000,
    cpuCycleMs: groupSum(a.cycle, 'cpuTimeUs') / 1000,
    reads24h: groupSum(a.dbDay, 'rowsRead'), writes24h: groupSum(a.dbDay, 'rowsWritten'),
    readsCycle: groupSum(a.dbCycle, 'rowsRead'), writesCycle: groupSum(a.dbCycle, 'rowsWritten'),
  };
}

export function assertRule(rule, expression = EXPRESSION) {
  if (rule?.action !== 'block' || rule?.expression !== expression || !rule?.description?.startsWith(DESCRIPTION)) throw new Error('Budget rule identity changed; refusing to edit another rule');
}

export async function runGuard(env, {now = new Date(), fetcher = fetch, dryRun = false} = {}) {
  const base = `/zones/${env.ZONE_ID}/rulesets/${env.RULESET_ID}`;
  const ruleset = (await api(env, base, {}, fetcher)).result;
  const rule = ruleset?.rules?.find(r => r.id === env.RULE_ID);
  assertRule(rule, env.BUDGET_EXPRESSION || EXPRESSION);
  if (rule.enabled === true) return {status: 'latched', changed: false};
  let metrics, decision;
  try {
    metrics = await readMetrics(env, now, fetcher);
    decision = decide(metrics);
  } catch {
    // Loss of monitoring requests a shutdown too. If the credential or WAF
    // API itself is unavailable, shutdown can fail: this is not a hard cap.
    decision = {trip: true, reasons: ['Monitoring unavailable or response invalid']};
  }
  if (!decision.trip || dryRun) return {status: decision.trip ? 'would-trip' : 'healthy', changed: false, metrics, reasons: decision.reasons};
  const updated = (await api(env, base + `/rules/${env.RULE_ID}`, {
    method: 'PATCH', body: JSON.stringify({action: 'block', expression: env.BUDGET_EXPRESSION || EXPRESSION, description: DESCRIPTION, enabled: true, position: {index: 1}}),
  }, fetcher)).result;
  const confirmed = updated?.rules?.find(r => r.id === env.RULE_ID);
  assertRule(confirmed, env.BUDGET_EXPRESSION || EXPRESSION);
  if (confirmed.enabled !== true) throw new Error('Budget shutdown was not confirmed');
  return {status: 'tripped', changed: true, metrics, reasons: decision.reasons};
}

export default {
  // No public administrative endpoint. workers.dev, previews and routes must
  // remain disabled, with only the one-minute Cloudflare Cron Trigger enabled.
  async fetch() { return new Response('Not found', {status: 404}); },
  async scheduled(_controller, env) {
    const result = await runGuard(env);
    console.log(JSON.stringify({event: 'cost-guard', ...result}));
  },
};
