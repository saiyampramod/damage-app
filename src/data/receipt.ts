/**
 * A receipt on a bill: its lines, who had what, who paid, and what that makes everyone's share.
 * Pure functions only, so the same maths runs on the example data now and API data later.
 *
 * Same rules as the web app:
 * - A line is shared evenly by whoever tagged it, or by units ("1 of the 2 lemonades").
 * - GST and service are shared in proportion to what each person had; so is a discount.
 * - Shares are rounded to whole rupees so they add up to the bill.
 * - The fewest payments: the biggest debt pays the biggest credit until everyone is square.
 */
import type { PersonId } from './types';

export type Line = {
  id: string;
  name: string;
  /** How many were ordered. */
  qty: number;
  /** What the whole line costs (not each). */
  price: number;
  /** even: shared evenly by whoever tagged it. units: each person says how many they had. */
  mode: 'even' | 'units';
  /** How many of the line each person had. */
  tags: Record<PersonId, number>;
};

/** What a bill adds on or takes off as a whole: GST, a service charge, a discount. */
export type AddOn = 'tax' | 'service' | 'discount';
export const ADD_ONS: AddOn[] = ['tax', 'service', 'discount'];

export type Receipt = {
  lines: Line[];
  tax: number;
  service: number;
  discount: number;
  /**
   * An add-on given as a percentage of the items (5 for 5%). It follows them: a 10% service charge
   * stays 10% when an item is added. One without a rate is a fixed amount.
   */
  rates?: Partial<Record<AddOn, number>>;
  /** What each person paid towards the bill. */
  paid: Record<PersonId, number>;
};

/** The parts of a line that change when someone tags it. */
export type Tags = Pick<Line, 'mode' | 'tags'>;

export type Payment = { from: PersonId; to: PersonId; amount: number };

const EPS = 1e-6;
const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (ns: number[]) => ns.reduce((a, n) => a + n, 0);

let seq = 0;
/** A fresh id for a line added by hand. */
export const lineId = () => `l${Date.now().toString(36)}${seq++}`;

export function newLine(name: string, qty: number, price: number): Line {
  return { id: lineId(), name, qty, price, mode: 'even', tags: {} };
}

/* ---------- one line ---------- */

/** Everyone who had some of it, in the order they tagged it. */
export const whoHad = (l: Line): PersonId[] => Object.keys(l.tags).filter((p) => l.tags[p] > EPS);
export const had = (l: Line, p: PersonId) => (l.tags[p] ?? 0) > EPS;
export const claimed = (l: Line) => sum(Object.values(l.tags));
/** How many of it nobody has claimed yet. */
export const leftOf = (l: Line) => Math.max(0, Math.round((l.qty - claimed(l)) * 1e4) / 1e4);
export const isTagged = (l: Line) => whoHad(l).length > 0 && leftOf(l) < EPS;
/** What one of it costs. */
export const each = (l: Line) => (l.qty ? l.price / l.qty : 0);

/** Shared evenly between these people. Nobody means untagged. */
export function evenAmong(l: Line, ids: PersonId[]): Tags {
  const tags: Record<PersonId, number> = {};
  ids.forEach((p) => (tags[p] = l.qty / ids.length));
  return { mode: 'even', tags };
}

/** Add someone to an evenly shared line. */
export const plus = (l: Line, p: PersonId): Tags =>
  evenAmong(l, [...whoHad(l).filter((x) => x !== p), p]);

/** This person had `n` of it. Zero takes them off. */
export function withUnits(l: Line, p: PersonId, n: number): Tags {
  const tags = { ...l.tags };
  if (n > EPS) tags[p] = n;
  else delete tags[p];
  return { mode: 'units', tags };
}

/** Take someone off a line. An even split is shared again between the rest. */
export function without(l: Line, p: PersonId): Tags {
  if (l.mode === 'even')
    return evenAmong(
      l,
      whoHad(l).filter((x) => x !== p),
    );
  return withUnits(l, p, 0);
}

/** Whole units as evenly as they go: 4 between 3 is 2, 1, 1. */
export function evenWhole(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/** "2", or "0.67" for part of one. */
export const units = (u: number) =>
  Math.abs(u - Math.round(u)) < EPS ? String(Math.round(u)) : String(r2(u));

/* ---------- the whole receipt ---------- */

export const linesTotal = (r: Pick<Receipt, 'lines'>) => r2(sum(r.lines.map((l) => l.price)));

/** A percentage of the items, to the paisa. */
export const ofItems = (r: Pick<Receipt, 'lines'>, rate: number) => r2((linesTotal(r) * rate) / 100);

/** Bring every add-on that's a percentage back in line with the items. Changes `r` in place. */
export function followRates(r: Receipt) {
  for (const k of ADD_ONS) {
    const rate = r.rates?.[k];
    if (rate !== undefined) r[k] = ofItems(r, rate);
  }
}
export const grandTotal = (r: Receipt) => r2(linesTotal(r) + r.tax + r.service - r.discount);
export const paidSoFar = (r: Receipt) => r2(sum(Object.values(r.paid)));
/** Lines with some or all of it still unclaimed. */
export const toTag = (r: Receipt) => r.lines.filter((l) => !isTagged(l));
/**
 * Paid in full, not more, to the rupee. People type whole rupees, and a percentage of the items
 * can come to paise (5% of ₹2,445 is ₹122.25), so within a rupee of the bill counts.
 */
export const paidUp = (r: Receipt) =>
  paidSoFar(r) > 0 && Math.abs(grandTotal(r) - paidSoFar(r)) < 1;

/** People leave the bill: their tags and payments go, and even splits are shared again by the rest. */
export function forget(r: Receipt, keep: PersonId[]): Pick<Receipt, 'lines' | 'paid'> {
  const lines = r.lines.map((l) => {
    const gone = Object.keys(l.tags).filter((p) => !keep.includes(p));
    if (!gone.length) return l;
    const rest = whoHad(l).filter((p) => keep.includes(p));
    if (l.mode === 'even') return { ...l, ...evenAmong(l, rest) };
    const tags = { ...l.tags };
    gone.forEach((p) => delete tags[p]);
    return { ...l, tags };
  });
  const paid = Object.fromEntries(Object.entries(r.paid).filter(([p]) => keep.includes(p)));
  return { lines, paid };
}

export type ShareLine = { line: Line; units: number; value: number };
export type Shares = {
  /** Each person's share in whole rupees. They add up to the bill. */
  total: Record<PersonId, number>;
  /** What each person had, line by line, before GST, service and discount. */
  lines: Record<PersonId, ShareLine[]>;
  /** Each person's part of the discount. */
  off: Record<PersonId, number>;
};

/** Each person's share: what they had, plus GST and service in proportion, less the discount in proportion. */
export function shares(r: Receipt, people: PersonId[]): Shares {
  const had: Record<PersonId, number> = {};
  const lines: Record<PersonId, ShareLine[]> = {};
  people.forEach((p) => {
    had[p] = 0;
    lines[p] = [];
  });
  for (const line of r.lines) {
    for (const p of whoHad(line)) {
      if (!(p in had)) continue;
      const u = line.tags[p];
      const value = (line.price * u) / line.qty;
      had[p] += value;
      lines[p].push({ line, units: u, value });
    }
  }
  const basis = sum(people.map((p) => had[p]));
  // With nothing tagged yet there's nothing to go by, so add-ons are shared evenly.
  const part = (p: PersonId) => (basis ? had[p] / basis : 1 / Math.max(people.length, 1));
  const raw = people.map((p) => ({
    p,
    v: had[p] + (r.tax + r.service) * part(p) - r.discount * part(p),
  }));
  const target = Math.round(sum(raw.map((x) => x.v)));
  const floors = raw.map((x) => ({
    p: x.p,
    f: Math.floor(x.v + 1e-9),
    rest: x.v - Math.floor(x.v + 1e-9),
  }));
  let left = target - sum(floors.map((x) => x.f));
  [...floors]
    .sort((a, b) => b.rest - a.rest)
    .forEach((x) => {
      if (left > 0) {
        x.f++;
        left--;
      }
    });
  const total: Record<PersonId, number> = {};
  floors.forEach((x) => (total[x.p] = x.f));
  const off: Record<PersonId, number> = {};
  people.forEach((p) => (off[p] = r.discount * part(p)));
  return { total, lines, off };
}

export type ShareRow = { label: string; value: number };

/**
 * One person's share, line by line: what they had ("Peri peri fries ÷ 4", "1 × Lemonade"), their
 * part of GST and service, the discount, and the share itself. The rows add up to the share.
 */
export function breakdown(
  r: Receipt,
  people: PersonId[],
  p: PersonId,
): { rows: ShareRow[]; total: number } {
  const sh = shares(r, people);
  const rows: ShareRow[] = (sh.lines[p] ?? []).map((x) => {
    const n = whoHad(x.line).length;
    const label =
      x.line.qty > 1 && x.line.mode === 'units'
        ? `${units(x.units)} × ${x.line.name}`
        : n > 1
          ? `${x.line.name} ÷ ${n}`
          : x.line.name;
    return { label, value: Math.round(x.value) };
  });
  const total = sh.total[p] ?? 0;
  const off = Math.round(sh.off[p] ?? 0);
  const addOn = total - sum(rows.map((x) => x.value)) + off;
  if (r.tax + r.service > 0 || addOn !== 0) {
    const label =
      r.tax + r.service > 0
        ? r.tax && r.service
          ? 'GST & service share'
          : r.tax
            ? 'GST share'
            : 'Service share'
        : 'Rounding';
    rows.push({ label, value: addOn });
  }
  if (off) rows.push({ label: 'Discount share', value: -off });
  return { rows, total };
}

/** What each person paid, in whole rupees adding up to the same rounded bill as the shares. */
function paidWhole(r: Receipt, people: PersonId[], target: number): Record<PersonId, number> {
  const out: Record<PersonId, number> = {};
  people.forEach((p) => (out[p] = Math.round(r.paid[p] ?? 0)));
  const payers = people.filter((p) => out[p] > 0).sort((a, b) => out[b] - out[a]);
  if (payers.length) out[payers[0]] += target - sum(people.map((p) => out[p]));
  return out;
}

/** The fewest payments that square everyone up. */
export function payments(r: Receipt, people: PersonId[]): Payment[] {
  const { total } = shares(r, people);
  const target = sum(people.map((p) => total[p]));
  const paid = paidWhole(r, people, target);
  return fewest(people.map((p) => ({ p, v: paid[p] - total[p] })));
}

/**
 * The fewest payments that square these balances in whole rupees (+ is owed, − owes): the
 * biggest debt pays the biggest credit until everyone is square. A group uses it on the
 * balances of all its bills added together.
 */
export function fewest(balances: { p: PersonId; v: number }[]): Payment[] {
  const bal = balances.map((x) => ({ p: x.p, v: Math.round(x.v) }));
  const owed = bal.filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const owes = bal.filter((x) => x.v < 0).sort((a, b) => a.v - b.v);
  const out: Payment[] = [];
  let i = 0;
  let j = 0;
  while (i < owes.length && j < owed.length) {
    const a = Math.min(-owes[i].v, owed[j].v);
    if (a > 0) out.push({ from: owes[i].p, to: owed[j].p, amount: a });
    owes[i].v += a;
    owed[j].v -= a;
    if (owes[i].v === 0) i++;
    if (owed[j].v === 0) j++;
  }
  return out;
}

/** What the bill means for one person: + they get back, − they owe. */
export function netFor(r: Receipt, people: PersonId[], p: PersonId): number {
  const { total } = shares(r, people);
  return paidWhole(r, people, sum(people.map((x) => total[x])))[p] - (total[p] ?? 0);
}

/* ---------- the reader ---------- */

/**
 * What the reader sends back for a photo: the lines, and GST, service and discount as printed
 * (with the rate when the receipt shows one). Until it's connected this is the Truffles receipt
 * from the designs, which has 5% GST and no service charge or discount.
 */
export function sampleRead(): { name: string; receipt: Receipt } {
  const rows: [string, number, number][] = [
    ['Classic burger', 1, 420],
    ['Peri peri fries', 1, 240],
    ['Chicken wings', 1, 480],
    ['Lemonade', 2, 360],
    ['Mud pie', 1, 390],
    ['Nachos', 1, 450],
  ];
  return {
    name: 'Truffles',
    receipt: {
      lines: rows.map(([name, qty, price]) => newLine(name, qty, price)),
      tax: 117,
      service: 0,
      discount: 0,
      rates: { tax: 5 },
      paid: {},
    },
  };
}

export const emptyReceipt = (): Receipt => ({
  lines: [],
  tax: 0,
  service: 0,
  discount: 0,
  paid: {},
});
