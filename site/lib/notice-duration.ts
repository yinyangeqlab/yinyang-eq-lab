export const MAX_NOTICE_MINUTES = 365 * 24 * 60;
export type NoticeDuration = { months: number; weeks: number; days: number; hours: number; minutes: number };
export const emptyNoticeDuration: NoticeDuration = { months: 0, weeks: 0, days: 0, hours: 0, minutes: 0 };
export function noticeDurationMinutes(parts: NoticeDuration): number | null {
  if (Object.values(parts).some(value => !Number.isSafeInteger(value) || value < 0)) return null;
  const total = parts.months * 43200 + parts.weeks * 10080 + parts.days * 1440 + parts.hours * 60 + parts.minutes;
  return validNoticeMinutes(total) ? total : null;
}
export function validNoticeMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= MAX_NOTICE_MINUTES;
}
