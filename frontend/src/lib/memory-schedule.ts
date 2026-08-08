export const MEMORY_TIME_ZONE = 'Asia/Shanghai';

export function memoryDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MEMORY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function memoryWeekStartKey(date = new Date()) {
  const key = memoryDateKey(date);
  const zonedDay = new Date(`${key}T00:00:00Z`);
  const day = zonedDay.getUTCDay() || 7;
  zonedDay.setUTCDate(zonedDay.getUTCDate() - day + 1);
  return zonedDay.toISOString().slice(0, 10);
}

export function isViewedToday(lastViewedAt: Date | null, now = new Date()) {
  return Boolean(lastViewedAt && memoryDateKey(lastViewedAt) === memoryDateKey(now));
}

export function isViewedThisWeek(lastViewedAt: Date | null, now = new Date()) {
  if (!lastViewedAt) return false;
  const key = memoryDateKey(lastViewedAt);
  return key >= memoryWeekStartKey(now) && key <= memoryDateKey(now);
}

export function nextMemoryReviewAt(now: Date, intervalDays: number) {
  return new Date(now.getTime() + intervalDays * 86_400_000);
}
