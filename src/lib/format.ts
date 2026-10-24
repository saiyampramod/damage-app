/** ₹1,23,456 style: Indian digit grouping, no decimals. */
export function inr(amount: number): string {
  return '₹' + Math.round(Math.abs(amount)).toLocaleString('en-IN');
}

/** ₹450 or ₹112.50: whole rupees when it's a round number, paise when it isn't. */
export function inrExact(amount: number): string {
  const n = Math.round(Math.abs(amount) * 100) / 100;
  return (
    '₹' +
    n.toLocaleString(
      'en-IN',
      Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    )
  );
}

/** +₹530 / −₹1,200 / ₹0 */
export function signedInr(amount: number): string {
  if (amount > 0.5) return '+' + inr(amount);
  if (amount < -0.5) return '−' + inr(amount);
  return inr(0);
}

const DAY = 24 * 60 * 60 * 1000;

export function daysSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso);
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.max(0, Math.round((a - b) / DAY));
}

export function ageLabel(iso: string, now: Date = new Date()): string {
  const d = daysSince(iso, now);
  if (d === 0) return 'today';
  if (d === 1) return '1 day';
  return `${d} days`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Mon 5 Oct */
export function shortDate(date: Date = new Date()): string {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** When something happened, the way a chat list says it: Today, Yesterday, Tue, then 12 Oct. */
export function chatTime(iso: string, now: Date = new Date()): string {
  const d = daysSince(iso, now);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (d < 7) return WEEKDAYS[date.getDay()];
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** Jay, Riya and Om */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}
