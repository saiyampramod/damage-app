/**
 * One bill on Add expense: what it was, who paid, how it's split, and the words for it.
 * Pure functions only.
 */
import { ME } from '@/data/mock';
import { category, defaultName, nameOf, type CategoryId } from '@/data/quick';
import type { PersonId } from '@/data/types';
import { inrExact } from '@/lib/format';

export type SplitMode = 'eq' | 'shares' | 'amt';

export type Entry = {
  cat: CategoryId;
  name: string;
  /** What's typed in the amount, e.g. "450" or "112.5". */
  amt: string;
  /** The one person who paid. */
  payer: PersonId;
  /** When more than one person paid: what each paid, as typed. Null when one person paid. */
  paid: Record<PersonId, string> | null;
  /** Someone typed what each paid, so ticking another payer no longer evens it out. */
  paidTyped: boolean;
  mode: SplitMode;
  /** Shares per person, 1 each unless changed. */
  shares: Record<PersonId, number>;
  /** Exact amount per person, as typed. */
  amts: Record<PersonId, string>;
  /** Left out of this bill. Every new bill starts with everyone in. */
  out: PersonId[];
};

/** A bill already added on the page, with who it was split between. */
export type Added = Entry & { group: string | null; ins: PersonId[] };

export function newEntry(cat: CategoryId, payer: PersonId = ME): Entry {
  return {
    cat,
    name: defaultName(cat),
    amt: '',
    payer,
    paid: null,
    paidTyped: false,
    mode: 'eq',
    shares: {},
    amts: {},
    out: [],
  };
}

export const num = (s: string | undefined): number => {
  const n = parseFloat(s ?? '');
  return Number.isFinite(n) ? n : 0;
};
export const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (o: Record<string, number>) => r2(Object.values(o).reduce((a, x) => a + x, 0));

export function billName(e: Entry): string {
  return e.name.trim() || (e.cat === 'other' ? 'Bill' : category(e.cat).label);
}

/** "4,500.5" style: Indian grouping on the rupees, whatever's typed after the dot kept as is. */
export function shown(amt: string): string {
  if (!amt) return '0';
  const [whole, frac] = amt.split('.');
  return Number(whole || 0).toLocaleString('en-IN') + (frac !== undefined ? '.' + frac : '');
}

/** Split an amount evenly as typed strings; the last person takes the paise left over. */
export function evenly(t: number, ids: PersonId[]): Record<PersonId, string> {
  const each = Math.floor((t / Math.max(ids.length, 1)) * 100) / 100;
  const out: Record<PersonId, string> = {};
  ids.forEach((id, k) => {
    out[id] = String(k === ids.length - 1 ? r2(t - each * (ids.length - 1)) : each);
  });
  return out;
}

/** What each person's share of the bill comes to. */
export function sharesOf(e: Entry, ins: PersonId[]): Record<PersonId, number> {
  const t = num(e.amt);
  const r: Record<PersonId, number> = {};
  if (e.mode === 'shares') {
    const tot = ins.reduce((a, id) => a + (e.shares[id] ?? 1), 0);
    ins.forEach((id) => (r[id] = tot ? (t * (e.shares[id] ?? 1)) / tot : 0));
  } else if (e.mode === 'amt') {
    ins.forEach((id) => (r[id] = num(e.amts[id])));
  } else {
    ins.forEach((id) => (r[id] = ins.length ? t / ins.length : 0));
  }
  return r;
}

/** What each payer put in. */
export function paidOf(e: Entry): Record<PersonId, number> {
  if (!e.paid) return { [e.payer]: num(e.amt) };
  const r: Record<PersonId, number> = {};
  Object.entries(e.paid).forEach(([id, a]) => (r[id] = num(a)));
  return r;
}

/** "You", "You + Riya" or "3 people". */
export function paidLabel(e: Entry): string {
  if (!e.paid) return nameOf(e.payer);
  const ids = Object.keys(e.paid);
  return ids.length <= 2 ? ids.map(nameOf).join(' + ') : `${ids.length} people`;
}

/** "Equally · ₹5,000 each", "By shares · 2 : 1 : 1" or "Exact amounts". */
export function splitLabel(e: Entry, ins: PersonId[]): string {
  const t = num(e.amt);
  if (e.mode === 'shares') {
    const r = ins.map((id) => e.shares[id] ?? 1);
    return r.length <= 4 ? `By shares · ${r.join(' : ')}` : 'By shares';
  }
  if (e.mode === 'amt') return 'Exact amounts';
  return t && ins.length ? `Equally · ${inrExact(t / ins.length)} each` : 'Equally';
}

/** Short line for a bill in the Added list. */
export function addedLine(b: Added): string {
  const how =
    b.mode === 'eq' ? `${b.ins.length} ways` : b.mode === 'shares' ? 'by shares' : 'exact amounts';
  return `${paidLabel(b)} paid · ${how}`;
}

export type Problem = { fix: 'amount' | 'people' | 'payer' | 'split'; label: string };

/** What's still wrong with the bill, if anything. The button says it and opens the fix. */
export function problem(e: Entry, ins: PersonId[]): Problem | null {
  const t = num(e.amt);
  if (!t) return { fix: 'amount', label: 'Type the amount' };
  const involved = new Set([...ins, ...Object.keys(paidOf(e))]);
  if (!ins.length || involved.size < 2)
    return { fix: 'people', label: 'Add at least one more person' };
  if (e.paid) {
    const d = r2(t - sum(paidOf(e)));
    if (Math.abs(d) >= 0.01)
      return {
        fix: 'payer',
        label:
          d > 0 ? `Who paid: ${inrExact(d)} not covered yet` : `Who paid: ${inrExact(-d)} too much`,
      };
  }
  if (e.mode === 'amt') {
    const d = r2(t - sum(sharesOf(e, ins)));
    if (Math.abs(d) >= 0.01)
      return {
        fix: 'split',
        label: d > 0 ? `Split: ${inrExact(d)} left to assign` : `Split: ${inrExact(-d)} too much`,
      };
  }
  return null;
}

/** "You get back ₹2,500", "You owe ₹450" or "You’re square on this one". Empty while something's missing. */
export function netLine(e: Entry, ins: PersonId[]): string {
  if (problem(e, ins)) return '';
  const n = r2((paidOf(e)[ME] ?? 0) - (sharesOf(e, ins)[ME] ?? 0));
  if (n > 0) return `You get back ${inrExact(n)}`;
  if (n < 0) return `You owe ${inrExact(-n)}`;
  return 'You’re square on this one';
}

function tally(target: number, got: number): string {
  if (!target) return 'Type the amount first';
  const d = r2(target - got);
  if (Math.abs(d) < 0.01) return `Adds up to ${inrExact(target)} ✓`;
  return d > 0
    ? `${inrExact(d)} left of ${inrExact(target)}`
    : `${inrExact(-d)} more than ${inrExact(target)}`;
}
export const paidTally = (e: Entry) => tally(num(e.amt), sum(paidOf(e)));
export const splitTally = (e: Entry, ins: PersonId[]) => tally(num(e.amt), sum(sharesOf(e, ins)));
export const addsUp = (s: string) => s.startsWith('Adds up');

/** Even out what each payer paid. */
export function evenPaid(e: Entry): Entry {
  return e.paid ? { ...e, paid: evenly(num(e.amt), Object.keys(e.paid)) } : e;
}

/** With fewer than two payers ticked, it's back to one person paying. */
export function settlePayers(e: Entry): Entry {
  if (!e.paid) return e;
  const ids = Object.keys(e.paid);
  return ids.length < 2 ? { ...e, paid: null, payer: ids[0] ?? ME } : e;
}

/** Keep a bill consistent after people come and go from the page. */
export function tidy(e: Entry, listed: PersonId[]): Entry {
  let next: Entry = { ...e, out: e.out.filter((id) => listed.includes(id)) };
  if (!listed.includes(next.payer)) next = { ...next, payer: ME };
  if (next.paid) {
    const kept = Object.fromEntries(
      Object.entries(next.paid).filter(([id]) => listed.includes(id)),
    );
    next = settlePayers({ ...next, paid: kept });
  }
  return next;
}
