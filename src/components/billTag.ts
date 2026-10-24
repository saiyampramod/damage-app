/**
 * What a bill or group shows as a price tag (Home and Bills), its small tag colour
 * (rows inside a group, group fans), and what the tag's button does.
 */
import { router } from 'expo-router';

import { ME, people } from '@/data/mock';
import { NEEDS_YOU, counterparts, who, yourSide } from '@/data/money';
import { billById, billsIn, groupColor, itemKey, markReminded, openOn, wasReminded } from '@/data/store';
import type { Bill, PersonId } from '@/data/types';
import { ageLabel, inr } from '@/lib/format';
import { namesOf, sendNudge } from '@/lib/pay';

import { KIND_ICON } from './group/kinds';
import type { MiniTone } from './ledger/parts';
import { signed } from './money/Signed';
import type { TagGroup, TagTone } from './PriceTag';
import { showToast } from './Toast';

export type TagModel = {
  tone: TagTone;
  /** Settled: faded, no button. */
  muted?: boolean;
  kicker: string;
  amount: string;
  label: string;
  people: PersonId[];
  /** The tag's one button. None when there's nothing to do. */
  action?: string;
  /** + coming to you, − you owe: colours the amount. */
  value?: number;
  /** The group it's in: its colour and kind icon in the kicker line, then its name. */
  group?: TagGroup;
};

const NEED = {
  tag: { label: 'Tag your items', action: 'Tag' },
  paid: { label: 'Who paid?', action: 'Add' },
  close: { label: 'Ready to close', action: 'Close' },
} as const;

const owedItems = (bill: Bill) => openOn(bill).filter((i) => i.amount > 0);

/** Everyone who owes you on it has been nudged already. */
function nudgedAll(bill: Bill) {
  const l = owedItems(bill);
  return l.length > 0 && l.every((i) => wasReminded(itemKey(i)));
}

export function tagFor(bill: Bill): TagModel {
  const group = bill.groupId ? billById(bill.groupId) : undefined;
  return {
    ...tagModel(bill, group),
    group: group
      ? { name: group.name, color: groupColor(group), icon: KIND_ICON[group.groupKind ?? 'outing'] }
      : undefined,
  };
}

function tagModel(bill: Bill, group: Bill | undefined): TagModel {
  const when = ageLabel(bill.date);
  // A bill in a group: the group's name takes the place of "Bill" (the tag draws it, with its badge).
  const kicker =
    bill.kind === 'group'
      ? `Group · ${billsIn(bill.id).length} bills`
      : group
        ? when
        : `Bill · ${when}`;
  const others = bill.people.filter((p) => p !== ME && !people[p]?.guest);

  if (NEEDS_YOU.includes(bill.status)) {
    const s = NEED[bill.status as keyof typeof NEED];
    return {
      tone: 'needs',
      kicker,
      amount: inr(bill.total),
      label: s.label,
      people: others,
      action: s.action,
    };
  }
  if (bill.status === 'settled') {
    return {
      tone: 'done',
      muted: true,
      kicker,
      amount: inr(bill.total),
      label: 'Settled',
      people: others,
    };
  }
  if (group) {
    // A bill inside a group: what it means for you; the group settles it.
    const m = bill.mine ?? 0;
    return {
      tone: m >= 0.5 ? 'owed' : m <= -0.5 ? 'owe' : 'done',
      kicker,
      amount: Math.abs(m) >= 0.5 ? signed(m) : inr(bill.total),
      value: m,
      label: m >= 0.5 ? 'you get back' : m <= -0.5 ? 'you owe' : 'You’re square',
      people: others,
    };
  }

  const side = yourSide(bill);
  const cps = counterparts(bill);
  const names = cps.length === 1 ? who(cps[0]) : `${cps.length}`;
  if (side >= 0.5) {
    return {
      tone: 'owed',
      kicker,
      amount: signed(side),
      value: side,
      label: cps.length === 1 ? `${names} owes you` : `${names} owe you`,
      people: cps,
      action: nudgedAll(bill) ? 'Nudged' : 'Nudge',
    };
  }
  if (side <= -0.5) {
    return {
      tone: 'owe',
      kicker,
      amount: signed(side),
      value: side,
      label: `You owe ${names}`,
      people: cps,
      action: 'Pay',
    };
  }
  return { tone: 'done', kicker, amount: inr(bill.total), label: 'You’re square', people: others };
}

/** The small tag on a bill row, and in a group's fan. */
export function miniTone(bill: Bill): MiniTone {
  if (NEEDS_YOU.includes(bill.status)) return 'needs';
  if (bill.status === 'settled') return 'done';
  const m = bill.groupId ? (bill.mine ?? 0) : yourSide(bill);
  return m >= 0.5 ? 'owed' : 'owe';
}

/**
 * The tag's button. Nudge opens the share sheet with the amounts; Pay opens the bill and
 * starts paying (UPI, then "Did it go through?"); Tag, Add and Close open the bill.
 */
export async function tagAction(bill: Bill) {
  const t = tagFor(bill);
  if (t.action === 'Nudge' || t.action === 'Nudged') {
    const list = owedItems(bill);
    const sent = await sendNudge(list);
    if (!sent) return;
    markReminded(list.map(itemKey));
    showToast(`Reminded ${namesOf(list.map((i) => i.person))}`);
    return;
  }
  if (t.action === 'Pay') {
    router.push(`/bill/${bill.id}?pay=1`);
    return;
  }
  router.push(`/bill/${bill.id}`);
}
