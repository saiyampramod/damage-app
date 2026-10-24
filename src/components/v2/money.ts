/**
 * Paying, nudging and settling from the person and group pages (and Bills). Built on the store
 * and pay helpers.
 *
 * - usePay: Pay opens a UPI app for one person with the net you owe them, then the page asks
 *   "Did it go through?" in place of its buttons. Yes marks it all paid, with Undo.
 * - nudgeItems: the share sheet with everything these people owe you, each bill listed.
 * - settleItems: mark these as paid straight away (Settle up, Got it), with Undo.
 */
import { router } from 'expo-router';
import { useState } from 'react';

import { people } from '@/data/mock';
import { itemKey, markReminded, settle, total, wasReminded, type Item } from '@/data/store';
import type { Bill, PersonId } from '@/data/types';
import { inr, listNames } from '@/lib/format';
import { namesOf, openUpi, sendNudge } from '@/lib/pay';

import { showToast } from '../Toast';

type Asking = { person: PersonId; amount: number; items: Item[] };

export function usePay() {
  const [asking, setAsking] = useState<Asking | null>(null);

  /**
   * Pays one person (the first you owe, if several) the NET of these items with them: what you owe
   * them less what they owe you. Riya: −₹453 in Goa trip and +₹56 in Saturday crawl is one payment
   * of ₹397, and "Yes, it's paid" clears both (the founder caught Pay showing ₹453). Nothing to pay
   * when it nets to them owing you.
   */
  async function pay(items: Item[]) {
    const owe = items.filter((i) => i.amount < 0);
    if (!owe.length) return;
    const person = owe[0].person;
    const list = items.filter((i) => i.person === person);
    const amount = -total(list);
    if (amount < 0.5) return;
    const name = people[person]?.name ?? 'them';
    const note = listNames([...new Set(list.map((i) => i.bill.name))]);
    const opened = await openUpi(person, amount, `Damage: ${note}`);
    setAsking({ person, amount, items: list });
    const upi = people[person]?.upi;
    showToast(
      opened
        ? `Opened your UPI app with ${inr(amount)} to ${name}`
        : `Pay ${name} ${inr(amount)}${upi ? ` on ${upi}` : ''}, then come back`,
    );
  }

  function yes() {
    if (!asking) return;
    const { person, amount, items } = asking;
    const undo = settle(items);
    setAsking(null);
    showToast(`Paid ${people[person]?.name ?? 'them'} ${inr(amount)}`, { undo });
  }

  return { asking, pay, yes, notYet: () => setAsking(null) };
}

export async function nudgeItems(items: Item[]) {
  const list = items.filter((i) => i.amount > 0);
  if (!list.length) return;
  const sent = await sendNudge(list);
  if (!sent) return;
  markReminded(list.map(itemKey));
  showToast(`Reminded ${namesOf(list.map((i) => i.person))}`);
}

/** Everyone who owes you here has been nudged already. */
export const nudgedAll = (items: Item[]) => {
  const l = items.filter((i) => i.amount > 0);
  return l.length > 0 && l.every((i) => wasReminded(itemKey(i)));
};

export function settleItems(items: Item[], message: string) {
  if (!items.length) return;
  const undo = settle(items);
  showToast(message, { undo });
}

/** A bill or a group opens its page (/bill/[id] shows the group page for a group). */
export const openSource = (b: Bill) => router.push(`/bill/${b.id}`);

export const openPerson = (id: PersonId) => router.push(`/person/${id}`);
