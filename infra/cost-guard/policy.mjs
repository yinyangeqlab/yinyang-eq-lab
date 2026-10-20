// These are deliberately conservative circuit breakers, not a billing cap.
export const LIMITS = Object.freeze({
  usageDollars: 25,
  requests15m: 10_000,
  requests24h: 100_000,
  requestsCycle: 1_000_000,
  cpu15mMs: 2_000_000,
  cpu24hMs: 10_000_000,
  cpuCycleMs: 25_000_000,
  reads24h: 100_000_000,
  writes24h: 1_000_000,
  readsCycle: 10_000_000_000,
  writesCycle: 25_000_000,
});

export function cycleStart(now, day = 18) {
  const d = new Date(now);
  if (!Number.isFinite(d.getTime()) || day < 1 || day > 28) throw new Error('Invalid billing cycle');
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (d.getUTCDate() < day ? 1 : 0), day));
}

function nonnegative(value, label) {
  if (value === null || value === '' || !['number', 'string'].includes(typeof value)) throw new Error(`Missing ${label}`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid ${label}`);
  return n;
}

export function usageDollars(envelope) {
  if (envelope?.success !== true || !Array.isArray(envelope.result)) throw new Error('Invalid billing response');
  if (envelope.result_info?.total_pages > 1) throw new Error('Billing response requires pagination');
  // ContractedCost is incremental for the row's charge period. Never add daily
  // CumulatedContractedCost values together: that would count earlier days twice.
  return envelope.result.reduce((sum, row) => {
    if (row.BillingCurrency !== 'USD' || !row.ServiceName || !row.BillingPeriodStart || !row.ChargePeriodStart || !row.ChargePeriodEnd) throw new Error('Unrecognized billing row');
    return sum + nonnegative(row.ContractedCost, 'ContractedCost');
  }, 0);
}

export function groupSum(groups, field) {
  // Queries omit dimensions, so Cloudflare returns at most one aggregate group.
  if (!Array.isArray(groups) || groups.length > 1) throw new Error('Unrecognized metrics aggregation');
  return groups.length ? nonnegative(groups[0]?.sum?.[field], field) : 0;
}

export function decide(metrics, limits = LIMITS) {
  const reasons = [];
  for (const [name, limit] of Object.entries(limits)) {
    const value = nonnegative(metrics[name], name);
    if (value >= limit) reasons.push(`${name}: ${value} >= ${limit}`);
  }
  return { trip: reasons.length > 0, reasons };
}
