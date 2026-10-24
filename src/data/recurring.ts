/**
 * Recurring bills: rent, Wi-Fi, the maid, Netflix. Each is a rule: what it is, how much (or ask
 * each time, for bills that change), who it's split with, who pays, how often and until when.
 * On the example data a rule doesn't add bills by itself yet; saving one can add the first.
 */
import type { IconName } from '@/components/Icon';

import { ME } from './mock';
import { notify } from './store';
import type { PersonId } from './types';

export type Repeat = 'weekly' | 'monthly' | 'yearly';

export type Ends = { kind: 'never' } | { kind: 'after'; times: number } | { kind: 'on'; date: string };

export type Recurring = {
  id: string;
  name: string;
  icon: IconName;
  /** Null when it changes every time: you're asked for the amount when it's due. */
  amount: number | null;
  repeat: Repeat;
  /** weekly: 0–6, Sunday first. monthly and yearly: the day of the month, 1–28. */
  day: number;
  /** yearly: the month, 0–11. */
  month: number;
  ends: Ends;
  groupId?: string;
  people: PersonId[];
  payer: PersonId;
};

export const PRESETS: { name: string; icon: IconName }[] = [
  { name: 'Rent', icon: 'rent' },
  { name: 'Wi-Fi', icon: 'wifi' },
  { name: 'Maid', icon: 'home' },
  { name: 'Netflix', icon: 'movie' },
  { name: 'Gym', icon: 'sports' },
  { name: 'Electricity', icon: 'bolt' },
];

export const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const list: Recurring[] = [
  {
    id: 'rec-wifi',
    name: 'Wi-Fi',
    icon: 'wifi',
    amount: 1180,
    repeat: 'monthly',
    day: 5,
    month: 0,
    ends: { kind: 'never' },
    groupId: 'flat-bills',
    people: ['me', 'jay', 'riya', 'neth'],
    payer: 'jay',
  },
  {
    id: 'rec-netflix',
    name: 'Netflix',
    icon: 'movie',
    amount: 649,
    repeat: 'monthly',
    day: 12,
    month: 0,
    ends: { kind: 'after', times: 6 },
    people: ['me', 'riya', 'sris'],
    payer: ME,
  },
];

export const recurringList = () => list;
export const recurringById = (id: string) => list.find((r) => r.id === id);

/** Add a rule, or change one with the same id. */
export function saveRecurring(r: Recurring) {
  const k = list.findIndex((x) => x.id === r.id);
  if (k >= 0) list[k] = r;
  else list.push(r);
  notify();
}

export function stopRecurring(id: string) {
  const k = list.findIndex((x) => x.id === id);
  if (k >= 0) list.splice(k, 1);
  notify();
}

const ord = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
};

/** "Every month on the 5th", "Every Friday", "Every year on 12 Mar". */
export function repeatText(r: Pick<Recurring, 'repeat' | 'day' | 'month'>): string {
  if (r.repeat === 'weekly') return `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][r.day]}`;
  if (r.repeat === 'yearly') return `Every year on ${r.day} ${MONTH[r.month]}`;
  return `Every month on the ${ord(r.day)}`;
}

/** "Never ends", "6 times", "Until Mar 2027". */
export function endsText(e: Ends): string {
  if (e.kind === 'after') return e.times === 1 ? 'Just once' : `${e.times} times`;
  if (e.kind === 'on') {
    const d = new Date(`${e.date}T12:00:00`);
    return `Until ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
  }
  return 'Never ends';
}

/** The next day it's due, today included. */
export function nextDue(r: Pick<Recurring, 'repeat' | 'day' | 'month'>, from = new Date()): Date {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (r.repeat === 'weekly') {
    const d = new Date(today);
    d.setDate(d.getDate() + ((r.day - d.getDay() + 7) % 7));
    return d;
  }
  if (r.repeat === 'yearly') {
    const d = new Date(today.getFullYear(), r.month, r.day);
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  const d = new Date(today.getFullYear(), today.getMonth(), r.day);
  if (d < today) d.setMonth(d.getMonth() + 1);
  return d;
}

export const dueText = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
