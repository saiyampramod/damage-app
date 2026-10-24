import type { StickerShape } from '@/components/shapes';

export type PersonId = string;

export type Person = {
  id: PersonId;
  name: string;
  /** Letter on their sticker. Defaults to the first letter of the name. */
  letter?: string;
  shape: StickerShape;
  upi?: string;
  /** Guests join one bill from a web link. They are never in circles or totals. */
  guest?: boolean;
};

/** A label for people you split with often. A circle never adds up money. */
export type Circle = {
  id: string;
  name: string;
  members: PersonId[];
};

/**
 * Where a bill is in its life:
 * tag     – people are still tapping what they had
 * paid    – nobody has recorded who paid
 * close   – everything is tagged and paid for; ready to reveal the damage
 * wait    – damage revealed, waiting on money
 * settled – everyone has paid back (deletes itself after 7 days)
 */
export type BillStatus = 'tag' | 'paid' | 'close' | 'wait' | 'settled';

export type GroupKind = 'trip' | 'outing' | 'monthly';

/** One simplified payment, worked out when the damage is revealed. */
export type Transfer = {
  from: PersonId;
  to: PersonId;
  amount: number;
  done: boolean;
};

/**
 * A single bill, or a group that adds several bills into one set of payments.
 * Both show up side by side in lists; `kind` tells them apart.
 */
export type Bill = {
  id: string;
  kind: 'bill' | 'group';
  name: string;
  /** ISO date of the bill, or the start of the group. */
  date: string;
  circleId?: string;
  status: BillStatus;
  total: number;
  people: PersonId[];
  payer?: PersonId;
  /** Groups only. */
  groupKind?: GroupKind;
  /** Groups only: its colour, an index into `groupColors` in the tokens. */
  tint?: number;
  billCount?: number;
  /** Bills in the tag stage: how many people have tagged so far. */
  taggedCount?: number;
  /** Empty until the damage is revealed. */
  transfers: Transfer[];
  /** Bills inside a group: the group's id. They have no payments of their own; the group settles them. */
  groupId?: string;
  /** Bills inside a group: what this bill means for you (+ you get back, − you owe). */
  mine?: number;
};
