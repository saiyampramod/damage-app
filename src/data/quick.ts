/**
 * What the + screen and the Quick bill sheet need from the example data:
 * categories, the people you can split with and open groups.
 */
import type { IconName } from '@/components/Icon';

import { ME, bills, people, strangers } from './mock';
import type { Bill, PersonId } from './types';

export type CategoryId =
  | 'cab'
  | 'fuel'
  | 'sports'
  | 'chai'
  | 'food'
  | 'groceries'
  | 'rent'
  | 'movie'
  | 'other';

export type Category = { id: CategoryId; label: string; icon: IconName };

/** The Quick bill tiles, in the order they show on the + screen. */
export const CATEGORIES: Category[] = [
  { id: 'cab', label: 'Cab · auto', icon: 'cab' },
  { id: 'fuel', label: 'Fuel', icon: 'fuel' },
  { id: 'sports', label: 'Turf · sports', icon: 'sports' },
  { id: 'chai', label: 'Chai · snacks', icon: 'chai' },
  { id: 'food', label: 'Food order', icon: 'food' },
  { id: 'groceries', label: 'Groceries', icon: 'groceries' },
  { id: 'rent', label: 'Rent', icon: 'rent' },
  { id: 'movie', label: 'Movies', icon: 'movie' },
  { id: 'other', label: 'Other', icon: 'plus' },
];

export function category(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/** "Other" has no name of its own, so the name field starts empty. */
export function defaultName(id: CategoryId): string {
  return id === 'other' ? '' : category(id).label;
}

/** Account holders. Guests only join one bill from a web link, so they never show up here. */
function isMember(id: PersonId): boolean {
  const p = people[id];
  return !!p && !p.guest;
}

export function nameOf(id: PersonId): string {
  return id === ME ? 'You' : (people[id]?.name ?? strangers[id]?.name ?? id);
}

export function letterOf(id: PersonId): string {
  const p = people[id] ?? strangers[id];
  return p?.letter ?? p?.name.charAt(0) ?? '?';
}

/** Everyone you can split with, A–Z (not you). */
export function everyone(): PersonId[] {
  return Object.keys(people)
    .filter((id) => id !== ME && isMember(id))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
}

/** The people on your most recent bills, newest first. */
export function recentPeople(limit = 5): PersonId[] {
  const out: PersonId[] = [];
  [...bills]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((b) =>
      b.people.forEach((p) => {
        if (p !== ME && isMember(p) && !out.includes(p)) out.push(p);
      }),
    );
  return out.slice(0, limit);
}

/** Groups a new bill can go into: the ones still open, newest first. */
export function openGroups(): Bill[] {
  return bills
    .filter((b) => b.kind === 'group' && b.status !== 'settled')
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function groupById(id: string | null): Bill | undefined {
  return id ? bills.find((b) => b.id === id && b.kind === 'group') : undefined;
}

/** Everyone in a group who has an account, you first. */
export function groupPeople(group: Bill): PersonId[] {
  return [ME, ...group.people.filter((p) => p !== ME && isMember(p))];
}
