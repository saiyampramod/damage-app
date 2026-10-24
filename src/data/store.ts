/**
 * The live state behind People, Bills and the person, group and bill pages.
 *
 * It reads and changes the example data in `mock.ts` in place (settling a payment
 * marks it done, moving a bill sets its group) and
 * tells every screen using `useStore()` to draw again. When the backend is wired up,
 * these functions become API calls and the screens stay the same.
 */
import { useSyncExternalStore } from 'react';

import { ME, bills, people } from './mock';
import { NEEDS_YOU } from './money';
import {
  evenAmong,
  fewest,
  followRates,
  forget,
  grandTotal,
  had,
  lineId,
  netFor,
  paidUp,
  shares,
  toTag,
  type Line,
  type Receipt,
} from './receipt';
import { PAID_BACK, sampleReceipt } from './samples';
import type { Bill, GroupKind, PersonId, Transfer } from './types';
import { groupColors } from '../theme/tokens';

const GROUP_TINTS = groupColors.length;

let version = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function changed() {
  version++;
  listeners.forEach((l) => l());
}

/** For the other example-data modules (friends, activity, recurring): redraw every screen. */
export const notify = changed;

/** Call at the top of a screen so it draws again when payments or bills change. */
export function useStore(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  );
}

/* ---------- bills and groups ---------- */

export const billById = (id: string): Bill | undefined => bills.find((b) => b.id === id);

/** The bills inside a group, newest first. */
export const billsIn = (groupId: string): Bill[] =>
  bills.filter((b) => b.groupId === groupId).sort((a, b) => b.date.localeCompare(a.date));

/** Bills on their own and groups: the top level of every list. */
export const topLevel = (): Bill[] => bills.filter((b) => !b.groupId);

export const groups = (): Bill[] => bills.filter((b) => b.kind === 'group');

/** Everyone in it apart from you, without guests. */
export const othersIn = (bill: Bill): PersonId[] =>
  bill.people.filter((p) => p !== ME && !people[p]?.guest);

export const STATUS_WORD: Record<Bill['status'], string> = {
  tag: 'Tagging',
  paid: 'Who paid?',
  close: 'Ready to reveal',
  wait: 'Settling',
  settled: 'Settled',
};

/* ---------- money between you and each person ---------- */

/** One amount between you and someone on one bill or group. + they owe you, − you owe them. */
export type Item = { person: PersonId; bill: Bill; amount: number; transfer: Transfer };

const involvesMe = (t: Transfer) => t.from === ME || t.to === ME;

function toItem(bill: Bill, t: Transfer): Item {
  return {
    person: t.to === ME ? t.from : t.to,
    bill,
    amount: t.to === ME ? t.amount : -t.amount,
    transfer: t,
  };
}

/** Same key for the same person on the same bill, wherever it shows up. */
export const itemKey = (i: { person: PersonId; bill: Bill }) => `${i.bill.id}:${i.person}`;

export const total = (items: Item[]) => items.reduce((a, i) => a + i.amount, 0);

function collect(done: boolean, keep: (i: Item) => boolean): Item[] {
  const out: Item[] = [];
  for (const b of bills) {
    // A bill in a group is counted through its group, which takes in whatever is still open on it.
    if (b.groupId) continue;
    if (!done && b.status !== 'wait') continue;
    for (const t of b.transfers) {
      if (t.done !== done || !involvesMe(t)) continue;
      const it = toItem(b, t);
      if (!people[it.person]?.guest && keep(it)) out.push(it);
    }
  }
  return out;
}

/** Everything still open between you and others. */
export const openItems = (keep: (i: Item) => boolean = () => true) => collect(false, keep);
/** Everything already paid between you and others. */
export const doneItems = (keep: (i: Item) => boolean = () => true) => collect(true, keep);

export const openWith = (p: PersonId) => openItems((i) => i.person === p);
export const openOn = (bill: Bill) => openItems((i) => i.bill.id === bill.id);
export const doneWith = (p: PersonId) => doneItems((i) => i.person === p);
export const doneOn = (bill: Bill) => doneItems((i) => i.bill.id === bill.id);

/**
 * A bill's own payment between you and someone, in a group, is covered once the group no longer
 * needs it: the group is settled, or you and they have already paid each other through the
 * group's tally (so clearing the bill too would pay twice).
 */
export function coveredByGroup(bill: Bill, t: Transfer): boolean {
  const g = bill.groupId ? billById(bill.groupId) : undefined;
  if (!g) return false;
  if (g.status === 'settled') return true;
  const other = t.from === ME ? t.to : t.from;
  return g.transfers.some(
    (x) => x.done && ((x.from === ME && x.to === other) || (x.to === ME && x.from === other)),
  );
}

/**
 * Your own open payments on one bill that you can clear right now, a bill in a group too: every
 * bill can be settled on its own (the founder's rule). What the group already covered is left out.
 */
export function clearable(bill: Bill): Item[] {
  if (bill.kind !== 'bill' || bill.status !== 'wait') return [];
  return bill.transfers
    .filter((t) => !t.done && involvesMe(t) && !coveredByGroup(bill, t))
    .map((t) => toItem(bill, t))
    .filter((i) => !people[i.person]?.guest);
}

/** How many open bills sit behind what you and this person owe each other. A group counts each of its bills. */
export function billCountWith(p: PersonId): number {
  let n = 0;
  for (const i of openWith(p)) {
    n +=
      i.bill.kind === 'group' ? billsIn(i.bill.id).filter((b) => b.status !== 'settled').length : 1;
  }
  return n;
}

/** Everything this person owes you has been nudged already. */
export function nudgedAllWith(p: PersonId): boolean {
  const l = openWith(p).filter((i) => i.amount > 0);
  return l.length > 0 && l.every((i) => nudged.has(itemKey(i)));
}

/** One net amount per person across every open bill and group. */
export function nets(): Map<PersonId, number> {
  const m = new Map<PersonId, number>();
  for (const i of openItems()) m.set(i.person, (m.get(i.person) ?? 0) + i.amount);
  return m;
}

/** Payments in a bill or group that don't involve you. */
export const betweenOthers = (bill: Bill) => bill.transfers.filter((t) => !involvesMe(t));

/** Everyone you have money open with, biggest first. + they owe you, − you owe them. */
export function balances(): { person: PersonId; amount: number; bills: number }[] {
  return [...nets()]
    .filter(([, v]) => Math.abs(v) >= 0.5)
    .map(([person, amount]) => ({ person, amount, bills: billCountWith(person) }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

/**
 * The receipt at the top of Home, from the same numbers as People (a bill in a group is counted
 * once, through its group).
 */
export function homeTotals() {
  let comingIn = 0;
  let goingOut = 0;
  let peopleIn = 0;
  let peopleOut = 0;
  for (const v of nets().values()) {
    if (v >= 0.5) {
      comingIn += v;
      peopleIn++;
    } else if (v <= -0.5) {
      goingOut -= v;
      peopleOut++;
    }
  }
  return { comingIn, goingOut, net: comingIn - goingOut, peopleIn, peopleOut };
}

/** How many open bills show as price tags, on Home and at the top of Bills. The rest are rows. */
export const FEATURED = 6;

/**
 * Every bill still open, in the one order Home and Bills both use: waiting on you first (tag,
 * who paid, close), then the rest, newest first. Bills in a group are included (their tag says
 * which group).
 */
export function openBillList(): Bill[] {
  const newest = (a: Bill, b: Bill) => b.date.localeCompare(a.date);
  const own = bills.filter((b) => b.kind === 'bill');
  return [
    ...own.filter((b) => NEEDS_YOU.includes(b.status)).sort(newest),
    ...own.filter((b) => b.status === 'wait').sort(newest),
  ];
}

/** The open bills shown as price tags: the first `FEATURED` of `openBillList`. Home shows exactly these. */
export const featuredBills = (): Bill[] => openBillList().slice(0, FEATURED);

/** A group at a glance: what's been spent, where you stand, and how far it's got. */
export type GroupView = {
  group: Bill;
  bills: Bill[];
  spent: number;
  /** + you get back, − you owe. */
  balance: number;
  paymentsDone: number;
  payments: number;
  /** Bills still being tagged or waiting on who paid. */
  open: number;
  settled: boolean;
};

export function groupView(g: Bill): GroupView {
  const inside = billsIn(g.id);
  const me = totalsOf(g).get(ME);
  return {
    group: g,
    bills: inside,
    spent: inside.reduce((a, b) => a + b.total, 0),
    balance: me?.balance ?? 0,
    paymentsDone: g.transfers.filter((t) => t.done).length,
    payments: g.transfers.length,
    open: inside.filter((b) => NEEDS_YOU.includes(b.status)).length,
    settled: g.status === 'settled',
  };
}

/** Groups you're in: the active ones newest first, then the settled ones. */
export function groupList(): { active: Bill[]; settled: Bill[] } {
  const all = groups().sort((a, b) => b.date.localeCompare(a.date));
  return {
    active: all.filter((g) => g.status !== 'settled'),
    settled: all.filter((g) => g.status === 'settled'),
  };
}

/* ---------- settling, with undo ---------- */

const justNow = new Set<Transfer>();
/** Settled while the app has been open: shown as "just now". */
export const settledJustNow = (t: Transfer) => justNow.has(t);

/**
 * Mark these as paid. A bill or group whose payments are all done becomes settled. Paying on a
 * bill inside a group works its group out again. Returns a function that puts everything back
 * (for Undo).
 */
export function settle(items: Item[]): () => void {
  const before = items.map((i) => ({
    t: i.transfer,
    done: i.transfer.done,
    bill: i.bill,
    status: i.bill.status,
  }));
  for (const i of items) {
    i.transfer.done = true;
    justNow.add(i.transfer);
  }
  for (const i of items) if (i.bill.transfers.every((t) => t.done)) i.bill.status = 'settled';
  items.forEach((i) => retallyGroupOf(i.bill));
  changed();
  return () => {
    for (const x of before) {
      x.t.done = x.done;
      x.bill.status = x.status;
      justNow.delete(x.t);
    }
    before.forEach((x) => retallyGroupOf(x.bill));
    changed();
  };
}

/* ---------- reminders ---------- */

const nudged = new Set<string>();
export const wasReminded = (key: string) => nudged.has(key);

export function markReminded(keys: string[]) {
  keys.forEach((k) => nudged.add(k));
  changed();
}

/* ---------- moving a bill into or out of a group ---------- */

/**
 * Move a bill into a group or out of one. Its own payments stay with it, and both groups work
 * their payments out again: the one it left without it, the one it joined with it.
 */
export function moveBill(bill: Bill, groupId: string | undefined) {
  const from = bill.groupId;
  bill.groupId = groupId;
  const r = receipts.get(bill.id);
  const revealed = r && !NEEDS_YOU.includes(bill.status);
  bill.mine = groupId && revealed ? netFor(r, bill.people, ME) : undefined;
  for (const g of [from, groupId]) {
    const group = g ? billById(g) : undefined;
    if (group) retally(group);
  }
  changed();
}

/* ---------- bills from a receipt: tagging, who paid, the reveal ---------- */

const receipts = new Map<string, Receipt>();

/** The receipt behind a scanned or typed bill. Other bills don't have one. */
export const receiptOf = (billId: string): Receipt | undefined => receipts.get(billId);

/** Bring the bill's total, stage and payer in line with its receipt. */
function syncReceipt(bill: Bill, r: Receipt) {
  bill.total = grandTotal(r);
  bill.status = toTag(r).length ? 'tag' : paidUp(r) ? 'close' : 'paid';
  bill.taggedCount = bill.people.filter((p) => r.lines.some((l) => had(l, p))).length;
  bill.payer = Object.keys(r.paid).sort((a, b) => r.paid[b] - r.paid[a])[0];
}

/**
 * A new bill from the Check it step. It starts with just you, or with a group's people
 * when it was scanned into a group. Returns its id.
 */
export function addReceiptBill(name: string, receipt: Receipt, groupId?: string): string {
  const group = groupId ? billById(groupId) : undefined;
  const bill: Bill = {
    id: `r${Date.now().toString(36)}`,
    kind: 'bill',
    name,
    date: new Date().toISOString().slice(0, 10),
    status: 'tag',
    total: 0,
    people: group ? [ME, ...group.people.filter((p) => p !== ME && !people[p]?.guest)] : [ME],
    transfers: [],
    groupId: group?.id,
  };
  bills.push(bill);
  receipts.set(bill.id, receipt);
  syncReceipt(bill, receipt);
  if (group) group.billCount = billsIn(group.id).length;
  changed();
  return bill.id;
}

/**
 * Change a bill's receipt in place (tags, lines, who paid). A single payer who had covered
 * the whole bill keeps covering it when the total moves.
 */
export function editReceipt(bill: Bill, change: (r: Receipt) => void) {
  const r = receipts.get(bill.id);
  if (!r) return;
  const before = grandTotal(r);
  change(r);
  followRates(r);
  const payers = Object.keys(r.paid);
  if (payers.length === 1 && Math.abs(r.paid[payers[0]] - before) < 1) {
    r.paid[payers[0]] = grandTotal(r);
  }
  syncReceipt(bill, r);
  changed();
}

/** Who's on the bill. You always are; anyone dropped takes their tags and payments with them. */
export function setBillPeople(bill: Bill, ids: PersonId[]) {
  // Each person once: picking a group can bring in people who are already on the bill.
  const next = [ME, ...new Set(ids.filter((p) => p !== ME))];
  bill.people = next;
  const group = bill.groupId ? billById(bill.groupId) : undefined;
  // Anyone added to a bill in a group joins the group too.
  if (group) group.people = [...group.people, ...next.filter((p) => !group.people.includes(p))];
  editReceipt(bill, (r) => Object.assign(r, forget(r, next)));
}

/**
 * Who's on the bill, and the group it goes into (or none). A group is for account holders only,
 * so a bill with a guest on it stays out of groups. False when it couldn't go in.
 */
export function setWho(bill: Bill, groupId: string | undefined, ids: PersonId[]): boolean {
  const group = groupId ? billById(groupId) : undefined;
  if (group && [...bill.people, ...ids].some((p) => people[p]?.guest)) return false;
  if (bill.groupId !== group?.id) moveBill(bill, group?.id);
  setBillPeople(bill, ids);
  return true;
}

/** What someone paid towards the bill. Zero takes them off Who paid. */
export function setPaid(bill: Bill, p: PersonId, amount: number) {
  editReceipt(bill, (r) => {
    if (amount > 0) r.paid[p] = amount;
    else delete r.paid[p];
  });
}

/**
 * The bill's payments: every one already made stays exactly as it was, and what's left is
 * squared in the fewest payments. On a bill nobody has paid back yet that is just the fewest
 * payments for the receipt. On a bill edited after money moved it is the difference: a top-up
 * when someone now owes more, a refund when they paid more than their new share.
 */
function square(bill: Bill, r: Receipt) {
  const made = bill.transfers.filter((t) => t.done);
  const balance = new Map<PersonId, number>();
  const add = (p: PersonId, v: number) => balance.set(p, (balance.get(p) ?? 0) + v);
  for (const p of bill.people) add(p, netFor(r, bill.people, p));
  for (const t of made) {
    add(t.from, t.amount);
    add(t.to, -t.amount);
  }
  const rest = fewest([...balance].map(([p, v]) => ({ p, v }))).map((t) => ({ ...t, done: false }));
  bill.transfers = [...made, ...rest];
  bill.status = rest.length ? 'wait' : 'settled';
}

/**
 * Lock a bill and work out its own payments (`square`). A bill in a group gets them too (it can
 * be settled on its own) and records what it means for you.
 */
function lock(bill: Bill, r: Receipt) {
  square(bill, r);
  bill.mine = bill.groupId ? netFor(r, bill.people, ME) : undefined;
}

/** Someone has paid through the group's tally. From then on its bills settle through it. */
export const groupStarted = (g: Bill) => g.transfers.some((t) => t.done);

/**
 * A group's total and payments. It adds up every revealed bill in it, takes off what was already
 * paid on a bill or through the group, and squares what's left in the fewest payments. The
 * payments already made through the group stay as they are. Only run when a bill joins, leaves,
 * is revealed or reopened, or is paid on its own: never because a group payment was made, so the
 * rest of the tally doesn't shuffle under someone halfway through paying it.
 */
function retally(g: Bill) {
  const inside = billsIn(g.id);
  const balance = new Map<PersonId, number>();
  const add = (p: PersonId, v: number) => balance.set(p, (balance.get(p) ?? 0) + v);
  for (const b of inside) {
    const r = receipts.get(b.id);
    if (!r || NEEDS_YOU.includes(b.status)) continue;
    for (const p of b.people) add(p, netFor(r, b.people, p));
    for (const t of b.transfers) {
      if (!t.done) continue;
      add(t.from, t.amount);
      add(t.to, -t.amount);
    }
  }
  const made = g.transfers.filter((t) => t.done);
  for (const t of made) {
    add(t.from, t.amount);
    add(t.to, -t.amount);
  }
  g.total = inside.reduce((a, b) => a + b.total, 0);
  g.billCount = inside.length;
  const rest = fewest([...balance].map(([p, v]) => ({ p, v }))).map((t) => ({ ...t, done: false }));
  g.transfers = [...made, ...rest];
  if (g.transfers.length) g.status = rest.length ? 'wait' : 'settled';
}

/** After a bill in a group is revealed or reopened, its group's payments are worked out again. */
function retallyGroupOf(bill: Bill) {
  const g = bill.groupId ? billById(bill.groupId) : undefined;
  if (g) retally(g);
}

/**
 * "What's the damage?": locks the bill and works out the fewest payments. A bill in a group has
 * none of its own; it records your share and the group settles it.
 */
export function revealDamage(bill: Bill) {
  const r = receipts.get(bill.id);
  if (!r || toTag(r).length || !paidUp(r)) return;
  lock(bill, r);
  retallyGroupOf(bill);
  changed();
}

/**
 * A revealed bill can always be edited, settled or not (the founder's rule: a mistake found after
 * everyone paid still has to be fixable). Only a bill without a receipt can't.
 */
export function canReopen(bill: Bill): boolean {
  return bill.kind === 'bill' && !!receipts.get(bill.id) && !NEEDS_YOU.includes(bill.status);
}

/** What has already been paid back on a bill, on the bill itself. */
export const paidBack = (bill: Bill) =>
  bill.transfers.filter((t) => t.done).reduce((a, t) => a + t.amount, 0);

/**
 * Unlock a revealed bill to fix a mistake: tagging and who paid open again. Nothing already paid
 * is lost: those payments stay on the bill, and at the next "What's the damage?" only the
 * difference is worked out (`square`). In a group, the group works itself out again without the
 * bill until it's revealed again (its page says the bill is still open). False when it can't.
 */
export function reopenBill(bill: Bill): boolean {
  const r = receipts.get(bill.id);
  if (!r || !canReopen(bill)) return false;
  bill.transfers = bill.transfers.filter((t) => t.done);
  bill.mine = undefined;
  syncReceipt(bill, r);
  retallyGroupOf(bill);
  changed();
  return true;
}

/**
 * Mark a payment as not paid after all (it was ticked by mistake, or never went through). On a
 * bill, if that leaves two open payments between the same two people (it can, on a bill edited
 * after it was paid) the open payments are squared again; everything already paid stays. In a group, the group's
 * payments are worked out again. Returns a function that puts it all back (for Undo).
 */
export function unsettle(item: Item): () => void {
  const { bill, transfer } = item;
  const before = { list: bill.transfers, status: bill.status };
  const r = receipts.get(bill.id);
  transfer.done = false;
  justNow.delete(transfer);
  if (bill.kind === 'group') {
    retally(bill);
  } else if (NEEDS_YOU.includes(bill.status)) {
    // Being edited: the next "What's the damage?" squares it with this payment open again.
  } else {
    // Two open payments between the same two people (a top-up or refund from an edit, next to
    // the one just un-ticked) become one.
    const open = bill.transfers.filter((t) => !t.done);
    const pair = (t: Transfer) => [t.from, t.to].sort().join(':');
    const tangled = open.some((a) => open.some((b) => a !== b && pair(a) === pair(b)));
    if (tangled && r) square(bill, r);
    else bill.status = 'wait';
    retallyGroupOf(bill);
  }
  changed();
  return () => {
    transfer.done = true;
    bill.transfers = before.list;
    bill.status = before.status;
    // A group gets back its own payments exactly as they were; a bill's group is worked out again.
    if (bill.kind !== 'group') retallyGroupOf(bill);
    changed();
  };
}

/* ---------- new groups and quick bills ---------- */

const newId = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** The colour a new group gets: the first one no other group has, else the next in turn. */
export function nextGroupTint(): number {
  const used = new Set(groups().map((g) => g.tint));
  for (let i = 0; i < GROUP_TINTS; i++) if (!used.has(i)) return i;
  return groups().length % GROUP_TINTS;
}

/** A group's colour. One made before colours existed gets one from its id. */
export function groupColor(g: Bill): string {
  if (g.tint !== undefined) return groupColors[g.tint % GROUP_TINTS];
  let n = 0;
  for (const ch of g.id) n += ch.charCodeAt(0);
  return groupColors[n % GROUP_TINTS];
}

/** Create new group: you and these people (accounts only, so no guests). Returns its id. */
export function addGroup(
  name: string,
  groupKind: GroupKind,
  ids: PersonId[],
  tint: number = nextGroupTint(),
): string {
  const g: Bill = {
    id: newId('g'),
    kind: 'group',
    groupKind,
    tint,
    name,
    date: new Date().toISOString().slice(0, 10),
    status: 'wait',
    total: 0,
    billCount: 0,
    people: [ME, ...new Set(ids.filter((p) => p !== ME && !people[p]?.guest))],
    transfers: [],
  };
  bills.push(g);
  changed();
  return g.id;
}

/**
 * Who's in a group. Adding is open to anyone with an account. Someone on one of its bills stays:
 * taking them out would leave that bill without them. Returns who had to stay.
 */
export function setGroupPeople(g: Bill, ids: PersonId[]): PersonId[] {
  const onBills = new Set(billsIn(g.id).flatMap((b) => b.people));
  const want = new Set([ME, ...ids.filter((p) => !people[p]?.guest)]);
  const stay = g.people.filter((p) => !want.has(p) && onBills.has(p));
  g.people = [...g.people.filter((p) => want.has(p) || onBills.has(p)), ...[...want].filter((p) => !g.people.includes(p))];
  changed();
  return stay;
}

/** A Quick bill, as Add saves it: one amount, who paid it, and how it's split. */
export type QuickInput = {
  name: string;
  amount: number;
  /** Everyone it's split between. */
  ins: PersonId[];
  /** What each payer put in. */
  paid: Record<PersonId, number>;
  /** Each person's share of the amount, when it isn't split equally. */
  share?: Record<PersonId, number>;
  groupId?: string;
};

/**
 * Save a Quick bill. It has no receipt to tag, so it is one line already tagged and paid for, and
 * its damage is revealed straight away: it lands settling, with its payments worked out (and, in a
 * group, its group worked out again). Anyone new to the group joins it. Returns its id.
 */
export function addQuickBill(q: QuickInput): string {
  const group = q.groupId ? billById(q.groupId) : undefined;
  const ids = [...new Set([ME, ...q.ins, ...Object.keys(q.paid)])];
  const base: Line = { id: lineId(), name: q.name, qty: 1, price: q.amount, mode: 'even', tags: {} };
  let line: Line;
  if (q.share) {
    const sum = q.ins.reduce((a, p) => a + (q.share?.[p] ?? 0), 0) || 1;
    const tags: Record<PersonId, number> = {};
    q.ins.forEach((p) => {
      const v = q.share?.[p] ?? 0;
      if (v > 0) tags[p] = v / sum;
    });
    line = { ...base, mode: 'units', tags };
  } else {
    line = { ...base, ...evenAmong(base, q.ins) };
  }
  const paid: Record<PersonId, number> = {};
  for (const [p, v] of Object.entries(q.paid)) if (v > 0) paid[p] = v;
  const r: Receipt = { lines: [line], tax: 0, service: 0, discount: 0, paid };
  const bill: Bill = {
    id: newId('q'),
    kind: 'bill',
    name: q.name,
    date: new Date().toISOString().slice(0, 10),
    status: 'tag',
    total: 0,
    people: ids,
    transfers: [],
    groupId: group?.id,
  };
  bills.push(bill);
  receipts.set(bill.id, r);
  if (group) {
    group.people = [...group.people, ...ids.filter((p) => !group.people.includes(p))];
  }
  syncReceipt(bill, r);
  if (!toTag(r).length && paidUp(r)) lock(bill, r);
  if (group) retally(group);
  changed();
  return bill.id;
}

/* ---------- the example bills ---------- */

/**
 * Every example bill opens like a scanned one, so each gets its receipt from `samples.ts`, and
 * everything else is worked out from it: the total, who paid, its stage, and once revealed its
 * payments (or, in a group, what it means for you). A group's payments are the fewest that square
 * up all of its bills together. Whoever is in PAID_BACK has paid what they owed.
 */
function seedExamples() {
  for (const b of bills) {
    const r = sampleReceipt(b.id);
    if (!r) continue;
    receipts.set(b.id, r);
    const stage = b.status;
    syncReceipt(b, r);
    if (NEEDS_YOU.includes(stage)) continue;
    lock(b, r);
    // A bill on its own was paid back on itself; a bill in a group, through the group.
    const back = PAID_BACK[b.id] ?? [];
    if (!b.groupId) {
      for (const t of b.transfers) t.done = stage === 'settled' || back.includes(t.from);
    }
    if (stage === 'settled' || (b.transfers.length && b.transfers.every((t) => t.done)))
      b.status = 'settled';
  }
  for (const g of groups()) {
    const back = PAID_BACK[g.id] ?? [];
    const settled = g.status === 'settled';
    g.transfers = [];
    retally(g);
    for (const t of g.transfers) t.done = settled || back.includes(t.from);
    if (g.transfers.length && g.transfers.every((t) => t.done)) g.status = 'settled';
  }
}
seedExamples();

/* ---------- totals, like Splitwise ---------- */

/** Where one person stands: what they paid, their share, what they've paid out and got back. */
export type Totals = { paid: number; share: number; made: number; got: number; balance: number };

/**
 * Everyone's totals on a bill, or on a group across its revealed bills. `balance` is what that
 * leaves: + they get back, − they owe. Payments made on a bill and through its group both count.
 */
export function totalsOf(source: Bill): Map<PersonId, Totals> {
  const out = new Map<PersonId, Totals>();
  const get = (p: PersonId) => {
    let t = out.get(p);
    if (!t) out.set(p, (t = { paid: 0, share: 0, made: 0, got: 0, balance: 0 }));
    return t;
  };
  source.people.forEach(get);
  const inside =
    source.kind === 'group'
      ? billsIn(source.id).filter((b) => !NEEDS_YOU.includes(b.status))
      : [source];
  const moved = (ts: Transfer[]) =>
    ts.forEach((x) => {
      if (!x.done) return;
      get(x.from).made += x.amount;
      get(x.to).got += x.amount;
    });
  for (const b of inside) {
    const r = receipts.get(b.id);
    if (!r) continue;
    const sh = shares(r, b.people).total;
    for (const p of b.people) {
      const t = get(p);
      t.share += sh[p] ?? 0;
      // Paid in whole rupees, the same rounding the payments use.
      t.paid += (sh[p] ?? 0) + netFor(r, b.people, p);
    }
    moved(b.transfers);
  }
  if (source.kind === 'group') moved(source.transfers);
  for (const t of out.values()) t.balance = t.paid - t.share + t.made - t.got;
  return out;
}

/**
 * One bill in a group, from one person's side: what they paid, their share, what they paid back
 * (+) or got back (−) on the bill itself, and what that leaves: + they get back, − they owe.
 */
export type BillSide = {
  bill: Bill;
  paid: number;
  share: number;
  moved: number;
  net: number;
  /** Settled on its own, so it adds nothing to the group's payments. */
  own: boolean;
};

/**
 * How a group's balance for this person adds up, bill by bill: the revealed bills they're on, what
 * those leave, and what they've already paid (+) or got (−) through the group. `balance` is the
 * same number as `totalsOf(group)`, and the group's payments square it.
 */
export function byBill(
  g: Bill,
  p: PersonId,
): { rows: BillSide[]; bills: number; viaGroup: number; balance: number } {
  const rows: BillSide[] = [];
  for (const b of billsIn(g.id)) {
    const r = receipts.get(b.id);
    if (!r || NEEDS_YOU.includes(b.status) || !b.people.includes(p)) continue;
    const share = shares(r, b.people).total[p] ?? 0;
    const left = netFor(r, b.people, p);
    let moved = 0;
    for (const t of b.transfers) {
      if (!t.done) continue;
      if (t.from === p) moved += t.amount;
      if (t.to === p) moved -= t.amount;
    }
    rows.push({
      bill: b,
      paid: share + left,
      share,
      moved,
      net: left + moved,
      own: b.transfers.length > 0 && b.transfers.every((t) => t.done),
    });
  }
  let viaGroup = 0;
  for (const t of g.transfers) {
    if (!t.done) continue;
    if (t.from === p) viaGroup += t.amount;
    if (t.to === p) viaGroup -= t.amount;
  }
  const bills = rows.reduce((a, x) => a + x.net, 0);
  return { rows, bills, viaGroup, balance: bills + viaGroup };
}

