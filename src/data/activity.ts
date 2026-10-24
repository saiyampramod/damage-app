/**
 * Activity, the bell on Home, on the example data. At the top, what needs your OK: someone says
 * they've paid you (Yes marks it received, Not yet tells them it hasn't arrived) and friend
 * requests. Under it, what happened on your bills and with your friends in the last 30 days.
 */
import { ME, bills } from './mock';
import { NEEDS_YOU } from './money';
import { friendEvents, requestsIn } from './social';
import { notify, openItems, type Item } from './store';
import type { PersonId } from './types';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
export const KEEP_DAYS = 30;

/** Someone says they've paid you. Confirm it and it's marked received. */
export type Claim = { id: string; person: PersonId; billId: string; amount: number; at: number };

export type Event =
  | { id: string; kind: 'nudged'; person: PersonId; billId: string; amount: number; at: number }
  | { id: string; kind: 'added'; person: PersonId; billId: string; at: number }
  | { id: string; kind: 'revealed'; person: PersonId; billId: string; at: number }
  | { id: string; kind: 'paid'; person: PersonId; to: PersonId; billId: string; amount: number; at: number }
  | { id: string; kind: 'accepted' | 'friends'; person: PersonId; at: number };

/** Noon on a bill's day, so events on it sort sensibly against "2 hours ago". */
const dayOf = (iso: string) => new Date(`${iso}T12:00:00`).getTime();

/** Two of the people who owe you say they've paid: the biggest amounts, to try Confirm on. */
function firstClaims(): Claim[] {
  return openItems((i) => i.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 2)
    .map((i, n) => ({
      id: `claim-${i.bill.id}-${i.person}`,
      person: i.person,
      billId: i.bill.id,
      amount: i.amount,
      at: Date.now() - (n ? 20 : 2) * HOUR,
    }));
}

let claims: Claim[] = firstClaims();
const earlier: Event[] = [];

/** What happened on the example bills, worked out once from them. */
function seed() {
  const now = Date.now();
  // Someone you owe nudged you about it.
  const owe = openItems((i) => i.amount < 0).sort((a, b) => a.amount - b.amount)[0];
  if (owe) {
    earlier.push({
      id: `nudge-${owe.bill.id}`,
      kind: 'nudged',
      person: owe.person,
      billId: owe.bill.id,
      amount: -owe.amount,
      at: now - 5 * HOUR,
    });
  }
  for (const b of bills) {
    const at = dayOf(b.date);
    // Bills inside a group come with the group; only bills on their own get a line each.
    if (now - at > KEEP_DAYS * DAY || b.kind === 'group' || b.groupId) continue;
    const by = b.payer && b.payer !== ME ? b.payer : undefined;
    if (by) earlier.push({ id: `add-${b.id}`, kind: 'added', person: by, billId: b.id, at });
    if (by && !NEEDS_YOU.includes(b.status)) {
      earlier.push({ id: `rev-${b.id}`, kind: 'revealed', person: by, billId: b.id, at: at + 3 * HOUR });
    }
  }
  // Payments between other people, on bills you're on.
  for (const b of bills) {
    const at = dayOf(b.date) + DAY;
    if (now - at > KEEP_DAYS * DAY) continue;
    for (const t of b.transfers) {
      if (!t.done || t.from === ME || t.to === ME) continue;
      earlier.push({
        id: `paid-${b.id}-${t.from}-${t.to}`,
        kind: 'paid',
        person: t.from,
        to: t.to,
        billId: b.id,
        amount: t.amount,
        at,
      });
    }
  }
}
seed();

/** Confirmed or turned down here, newest first (Undo puts a confirmed one back). */
const mine: Event[] = [];

export const pendingClaims = () => claims;

/** You said yes to a claim: it shows under Today as a payment to you. Returns its undo. */
export function logConfirmed(c: Claim): () => void {
  const e: Event = {
    id: `ok-${c.id}-${Date.now()}`,
    kind: 'paid',
    person: c.person,
    to: ME,
    billId: c.billId,
    amount: c.amount,
    at: Date.now(),
  };
  mine.unshift(e);
  notify();
  return () => {
    const k = mine.indexOf(e);
    if (k >= 0) mine.splice(k, 1);
    notify();
  };
}

/** How many things need your OK: the count on the bell. */
export const needsOk = () => claims.length + requestsIn().length;

/** Everything in the last 30 days, newest first. */
export function feed(): Event[] {
  const cut = Date.now() - KEEP_DAYS * DAY;
  return [...mine, ...friendEvents(), ...earlier]
    .filter((e) => e.at >= cut)
    .sort((a, b) => b.at - a.at);
}

/** The open payment behind a claim, if it's still open. */
export function claimItem(c: Claim): Item | undefined {
  return openItems((i) => i.bill.id === c.billId && i.person === c.person && i.amount > 0)[0];
}

/** Take a claim off the list (after Yes or Not yet). Returns a function that puts it back. */
export function dropClaim(c: Claim): () => void {
  claims = claims.filter((x) => x.id !== c.id);
  notify();
  return () => {
    if (!claims.some((x) => x.id === c.id)) claims = [c, ...claims];
    notify();
  };
}

/** "2h", "Yesterday", "Mon", "3 Oct". */
export function when(at: number, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - at) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  const d = new Date(at);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (at >= startOfToday) return `${hours}h`;
  if (at >= startOfToday - DAY) return 'Yesterday';
  if (at >= startOfToday - 6 * DAY) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Today, This week or Earlier. */
export function bucket(at: number, now = Date.now()): 'Today' | 'This week' | 'Earlier' {
  const today = new Date(now);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (at >= start) return 'Today';
  if (at >= start - 6 * DAY) return 'This week';
  return 'Earlier';
}
