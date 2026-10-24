/**
 * Leaving the app to pay or to nudge. Damage never moves money: Settle opens a UPI app
 * with the ID and amount filled in, and the page then asks "Did it go through?".
 */
import { Linking, Platform, Share } from 'react-native';

import { ME, people } from '@/data/mock';
import type { Item } from '@/data/store';
import type { PersonId } from '@/data/types';

import { inr, listNames } from './format';

/** Opens a UPI app to pay this person. False when no UPI app (or ID) is there to open. */
export async function openUpi(person: PersonId, amount: number, note: string): Promise<boolean> {
  const p = people[person];
  if (!p?.upi || Platform.OS === 'web') return false;
  const url =
    `upi://pay?pa=${encodeURIComponent(p.upi)}&pn=${encodeURIComponent(p.name)}` +
    `&am=${Math.abs(amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/** The nudge: one person gets a personal note, several get a list (for a group chat). */
export function nudgeText(items: Item[]): string {
  const by = new Map<PersonId, Item[]>();
  for (const i of items) by.set(i.person, [...(by.get(i.person) ?? []), i]);
  const upi = people[ME]?.upi ? `\nUPI: ${people[ME].upi}` : '';
  if (by.size === 1) {
    const [[person, list]] = [...by];
    const sum = list.reduce((a, i) => a + i.amount, 0);
    const lines = list.map((i) => `• ${i.bill.name}: ${inr(i.amount)}`).join('\n');
    return `Hey ${people[person]?.name ?? 'there'}, a nudge from Damage: ${inr(sum)} to settle.\n${lines}${upi}`;
  }
  const lines = [...by]
    .map(
      ([p, list]) =>
        `• ${people[p]?.name}: ${inr(list.reduce((a, i) => a + i.amount, 0))} (${listNames([...new Set(list.map((i) => i.bill.name))])})`,
    )
    .join('\n');
  return `Hey all, a nudge from Damage:\n${lines}${upi}`;
}

/**
 * Opens the share sheet (WhatsApp and the rest) with the nudge filled in.
 * False only when the sheet was closed without sending.
 */
export async function sendNudge(items: Item[]): Promise<boolean> {
  // No share sheet (web) counts as sent, so the page still shows it was reminded.
  return shareText(nudgeText(items));
}

/** Opens the share sheet with any message. False only when it was closed without sending. */
export async function shareText(message: string): Promise<boolean> {
  try {
    const r = await Share.share({ message });
    return r.action !== Share.dismissedAction;
  } catch {
    return true;
  }
}

export const namesOf = (ids: PersonId[]) =>
  listNames([...new Set(ids)].map((i) => people[i]?.name ?? 'Someone'));
