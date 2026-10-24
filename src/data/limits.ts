/**
 * Your own money rules, from the Dashboard: a monthly spend limit (your share of bills, the same
 * number the Dashboard shows) and a few finance controls. Kept while the app is open, like the rest
 * of the example data; the backend will keep them for real and send the alerts. Nothing here stops
 * a bill from being added: a limit is a line you can see, not a lock.
 */
import { notify } from './store';

export type Controls = {
  /** Your monthly limit in rupees, or null for none. */
  limit: number | null;
  /** A heads-up once you've used 80% of the limit. */
  warnAt80: boolean;
  /** Ask before adding a bill whose total is over `bigBill`. */
  checkBig: boolean;
  bigBill: number;
  /** What you spent that week, every Sunday. */
  weekly: boolean;
  /** A reminder when someone has owed you for more than two weeks. */
  chaseOld: boolean;
};

export const controls: Controls = {
  limit: 6000,
  warnAt80: true,
  checkBig: true,
  bigBill: 2000,
  weekly: true,
  chaseOld: false,
};

export function setControl<K extends keyof Controls>(k: K, v: Controls[K]) {
  controls[k] = v;
  notify();
}

/** Days left in this month, today included. */
export function daysLeft(now = new Date()): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return last - now.getDate() + 1;
}
