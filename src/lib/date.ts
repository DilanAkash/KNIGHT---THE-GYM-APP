/**
 * All date keys are local-time YYYY-MM-DD. Using UTC here would silently shift
 * a late-evening workout into tomorrow for anyone east of Greenwich.
 */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function startOfDay(date: Date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Week starts Monday — that's how training weeks are actually planned. */
export function startOfWeek(date: Date = new Date()): Date {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(copy, diff);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekdayShort(date: Date): string {
  return WEEKDAYS[date.getDay()] ?? '';
}

export function monthShort(date: Date): string {
  return MONTHS[date.getMonth()] ?? '';
}

/** "Today", "Yesterday", "Tue 12 Mar" — whichever is least effort to read. */
export function friendlyDate(date: Date, now: Date = new Date()): string {
  const diff = daysBetween(date, now);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  const sameYear = date.getFullYear() === now.getFullYear();
  const base = `${weekdayShort(date)} ${date.getDate()} ${monthShort(date)}`;
  return sameYear ? base : `${base} ${date.getFullYear()}`;
}

export function timeOfDay(date: Date): string {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${suffix}`;
}

export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Late one';
}
