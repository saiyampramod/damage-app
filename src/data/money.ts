/**
 * Money maths for the screens. Pure functions over the data, so the same code
 * works on mock data now and API data later.
 */
import { ME, people } from './mock';
import type { Bill, PersonId, Transfer } from './types';

export const NEEDS_YOU: Bill['status'][] = ['tag', 'paid', 'close'];

function openTransfersWithMe(bill: Bill): Transfer[] {
  if (bill.status !== 'wait') return [];
  return bill.transfers.filter((t) => !t.done && (t.from === ME || t.to === ME));
}

/** What this bill means for you right now: + coming to you, − you owe. */
export function yourSide(bill: Bill): number {
  return openTransfersWithMe(bill).reduce(
    (sum, t) => sum + (t.to === ME ? t.amount : -t.amount),
    0,
  );
}

/** The people you're waiting on (or paying) for this bill. */
export function counterparts(bill: Bill): PersonId[] {
  return openTransfersWithMe(bill).map((t) => (t.to === ME ? t.from : t.to));
}

/** One net number per person across every open bill. Guests never count. */
export function personNets(all: Bill[]): Map<PersonId, number> {
  const nets = new Map<PersonId, number>();
  for (const bill of all) {
    for (const t of openTransfersWithMe(bill)) {
      const other = t.to === ME ? t.from : t.to;
      if (people[other]?.guest) continue;
      const delta = t.to === ME ? t.amount : -t.amount;
      nets.set(other, (nets.get(other) ?? 0) + delta);
    }
  }
  return nets;
}

export type Summary = {
  comingIn: number;
  goingOut: number;
  net: number;
  peopleIn: number;
  peopleOut: number;
};

/** The receipt at the top of Home. Netted per person, like the Person screen. */
export function summary(all: Bill[]): Summary {
  let comingIn = 0;
  let goingOut = 0;
  let peopleIn = 0;
  let peopleOut = 0;
  for (const v of personNets(all).values()) {
    if (v > 0.5) {
      comingIn += v;
      peopleIn++;
    } else if (v < -0.5) {
      goingOut += -v;
      peopleOut++;
    }
  }
  return { comingIn, goingOut, net: comingIn - goingOut, peopleIn, peopleOut };
}

export type Biggest = { person: PersonId; amount: number };

/** The person who owes you most and the person you owe most. */
export function biggestEachWay(all: Bill[]): { owesYou?: Biggest; youOwe?: Biggest } {
  let owesYou: Biggest | undefined;
  let youOwe: Biggest | undefined;
  for (const [person, v] of personNets(all)) {
    if (v > 0.5 && (!owesYou || v > owesYou.amount)) owesYou = { person, amount: v };
    if (v < -0.5 && (!youOwe || -v > youOwe.amount)) youOwe = { person, amount: -v };
  }
  return { owesYou, youOwe };
}

/**
 * Bills for the Home tags: the ones waiting on you first (newest first),
 * then everything with money moving, biggest first.
 */
export function homeBills(all: Bill[]): Bill[] {
  const needs = all
    .filter((b) => NEEDS_YOU.includes(b.status))
    .sort((a, b) => b.date.localeCompare(a.date));
  const money = all
    .filter((b) => b.status === 'wait' && Math.abs(yourSide(b)) > 0.5)
    .sort((a, b) => Math.abs(yourSide(b)) - Math.abs(yourSide(a)));
  return [...needs, ...money];
}

export function who(id: PersonId): string {
  return id === ME ? 'You' : (people[id]?.name ?? 'Someone');
}
