/**
 * The Dashboard's numbers: your share month by month, worked out from the bills' receipts. A bill
 * counts once its damage is revealed (before that, shares are still moving). Pure reads of the
 * store, so it follows whatever changes.
 */
import { ME, bills, people } from './mock';
import { NEEDS_YOU } from './money';
import { shares } from './receipt';
import { billById, receiptOf } from './store';
import type { Bill, PersonId } from './types';

export type Month = { y: number; m: number };

export const sameMonth = (a: Month, b: Month) => a.y === b.y && a.m === b.m;
export const monthOf = (d: Date): Month => ({ y: d.getFullYear(), m: d.getMonth() });
export const monthName = (x: Month, short = false) =>
  new Date(x.y, x.m, 1).toLocaleDateString('en-IN', { month: short ? 'short' : 'long' });
export const addMonths = (x: Month, n: number): Month => monthOf(new Date(x.y, x.m + n, 1));

/** One bill from your side. */
export type Spend = { bill: Bill; date: Date; share: number; with: PersonId[] };

/** Every revealed bill you're on, with your share. */
export function spends(): Spend[] {
  const out: Spend[] = [];
  for (const b of bills) {
    if (b.kind !== 'bill' || NEEDS_YOU.includes(b.status) || !b.people.includes(ME)) continue;
    const r = receiptOf(b.id);
    if (!r) continue;
    out.push({
      bill: b,
      date: new Date(`${b.date}T12:00:00`),
      share: shares(r, b.people).total[ME] ?? 0,
      with: b.people.filter((p) => p !== ME && !people[p]?.guest),
    });
  }
  return out;
}

/** The months with a bill in them, oldest first, up to this month. */
export function months(): Month[] {
  const list = spends().map((s) => monthOf(s.date));
  const now = monthOf(new Date());
  let x = list.reduce((a, b) => (b.y * 12 + b.m < a.y * 12 + a.m ? b : a), now);
  const out: Month[] = [];
  while (x.y * 12 + x.m <= now.y * 12 + now.m) {
    out.push(x);
    x = addMonths(x, 1);
  }
  return out;
}

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

/** The group a bill is in, by name, or "Not in a group". */
function groupName(b: Bill): string {
  return (b.groupId ? billById(b.groupId)?.name : undefined) ?? 'Not in a group';
}

export type MonthStats = {
  total: number;
  count: number;
  /** Days 1–7, 8–14, 15–21, 22–28, 29 on. */
  weeks: number[];
  biggest?: Spend;
  partner?: { person: PersonId; bills: number };
  danger?: { day: string; total: number };
  withMost: { person: PersonId; bills: number; spent: number }[];
  /** Your share by group, biggest first; bills on their own count as "Not in a group". */
  byGroup: { name: string; total: number }[];
};

export function monthStats(x: Month): MonthStats {
  const list = spends().filter((s) => sameMonth(monthOf(s.date), x));
  const weeks = [0, 0, 0, 0, 0];
  const days = [0, 0, 0, 0, 0, 0, 0];
  const together = new Map<PersonId, { bills: number; spent: number }>();
  const groupTotals = new Map<string, number>();
  for (const s of list) {
    weeks[Math.min(4, Math.floor((s.date.getDate() - 1) / 7))] += s.share;
    days[s.date.getDay()] += s.share;
    for (const p of s.with) {
      const t = together.get(p) ?? { bills: 0, spent: 0 };
      t.bills += 1;
      t.spent += s.share;
      together.set(p, t);
    }
    const g = groupName(s.bill);
    groupTotals.set(g, (groupTotals.get(g) ?? 0) + s.share);
  }
  const withMost = [...together]
    .map(([person, t]) => ({ person, ...t }))
    .sort((a, b) => b.bills - a.bills || b.spent - a.spent);
  const top = days.indexOf(Math.max(...days));
  return {
    total: list.reduce((a, s) => a + s.share, 0),
    count: list.length,
    weeks,
    biggest: [...list].sort((a, b) => b.share - a.share)[0],
    partner: withMost[0] ? { person: withMost[0].person, bills: withMost[0].bills } : undefined,
    danger: list.length ? { day: WEEKDAYS[top], total: days[top] } : undefined,
    withMost: withMost.slice(0, 5),
    byGroup: [...groupTotals]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total),
  };
}
