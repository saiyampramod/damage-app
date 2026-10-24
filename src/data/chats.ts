/**
 * People and groups as one list, like a chat app: each one with what happened last on it, when,
 * where you stand with it, and how many bills on it are waiting on you (the unread count).
 * People's page reads it. Built from the store, so it changes when the bills do.
 */
import { ME, bills, people } from './mock';
import { NEEDS_YOU } from './money';
import { billsIn, groupColor, groupList, groupView, nets } from './store';
import type { Bill, PersonId } from './types';
import { inr } from '../lib/format';

export type Chat = {
  key: string;
  kind: 'person' | 'group';
  id: string;
  name: string;
  /** The day of the latest bill on it. */
  date: string;
  /** What happened last ("Dinner at Bastian: owes you ₹1,500"). */
  preview: string;
  /** + coming to you, − you owe. */
  amount: number;
  /** Bills on it waiting on you: tagging, who paid, ready to reveal. */
  waiting: number;
  /** A settled group. */
  done: boolean;
  /** A group's colour. */
  color?: string;
};

const STAGE: Record<string, string> = {
  tag: 'tag your items',
  paid: 'who paid?',
  close: 'ready to reveal',
};

const newest = (a: Bill, b: Bill) => b.date.localeCompare(a.date);

/** What one bill says, from your side with this person. */
function personLine(bill: Bill, p: PersonId): string {
  const group = bill.groupId ? bills.find((g) => g.id === bill.groupId) : undefined;
  const name = group ? `${bill.name} in ${group.name}` : bill.name;
  if (NEEDS_YOU.includes(bill.status)) return `${name}: ${STAGE[bill.status]}`;
  const t = bill.transfers.find(
    (x) => (x.from === p && x.to === ME) || (x.from === ME && x.to === p),
  );
  if (t && !group) {
    const theyPay = t.from === p;
    if (t.done) return `${name}: ${theyPay ? 'paid you' : 'you paid'} ${inr(t.amount)}`;
    return `${name}: ${theyPay ? 'owes you' : 'you owe'} ${inr(t.amount)}`;
  }
  if (bill.status === 'settled') return `${name}: settled`;
  return group ? name : `${name} · ${inr(bill.total)}`;
}

function groupLine(g: Bill, inside: Bill[]): string {
  if (g.status === 'settled') return 'Settled';
  const b = [...inside].sort(newest)[0];
  if (!b) return 'No bills yet';
  if (NEEDS_YOU.includes(b.status)) return `${b.name}: ${STAGE[b.status]}`;
  const m = b.mine ?? 0;
  if (m >= 0.5) return `${b.name}: you get back ${inr(m)}`;
  if (m <= -0.5) return `${b.name}: you owe ${inr(m)}`;
  return `${b.name} · ${inr(b.total)}`;
}

export function chats(): Chat[] {
  const netOf = nets();
  const out: Chat[] = [];
  for (const person of Object.values(people)) {
    if (person.id === ME || person.guest) continue;
    const theirs = bills
      .filter((b) => b.kind === 'bill' && b.people.includes(person.id) && b.people.includes(ME))
      .sort(newest);
    if (!theirs.length) continue;
    out.push({
      key: `p:${person.id}`,
      kind: 'person',
      id: person.id,
      name: person.name,
      date: theirs[0].date,
      preview: personLine(theirs[0], person.id),
      amount: netOf.get(person.id) ?? 0,
      waiting: theirs.filter((b) => NEEDS_YOU.includes(b.status)).length,
      done: false,
    });
  }
  const { active, settled } = groupList();
  for (const g of [...active, ...settled]) {
    const v = groupView(g);
    const inside = billsIn(g.id);
    const latest = [...inside].sort(newest)[0];
    out.push({
      key: `g:${g.id}`,
      kind: 'group',
      id: g.id,
      name: g.name,
      date: latest && latest.date > g.date ? latest.date : g.date,
      preview: groupLine(g, inside),
      amount: v.settled ? 0 : v.balance,
      waiting: v.open,
      done: v.settled,
      color: groupColor(g),
    });
  }
  return out;
}

export type ChatSort = 'latest' | 'money';

/**
 * The order: anything with money open or a bill waiting on you first, then the square ones and
 * settled groups. Within each, the latest first, or the most money first.
 */
export function sortChats(list: Chat[], by: ChatSort): Chat[] {
  const live = (c: Chat) => !c.done && (Math.abs(c.amount) >= 0.5 || c.waiting > 0);
  const order = (a: Chat, b: Chat) =>
    by === 'money'
      ? Math.abs(b.amount) - Math.abs(a.amount) || b.date.localeCompare(a.date)
      : b.date.localeCompare(a.date) || Math.abs(b.amount) - Math.abs(a.amount);
  return [...list.filter(live).sort(order), ...list.filter((c) => !live(c)).sort(order)];
}
