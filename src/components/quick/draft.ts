/** The bill being typed in the Quick bill sheet, and the words built from it. Pure functions only. */
import { ME } from '@/data/mock';
import { defaultName, groupById, groupPeople, nameOf, type CategoryId } from '@/data/quick';
import type { PersonId } from '@/data/types';
import { inrExact, listNames } from '@/lib/format';

export type Draft = {
  cat: CategoryId;
  name: string;
  /** What's typed in the amount field, e.g. "450" or "112.5". */
  amt: string;
  /** Who's in, in the order they were picked. You start in it. */
  people: PersonId[];
  payer: PersonId;
  /** The group it's part of, or null when it's its own bill. */
  group: string | null;
};

export function newDraft(cat: CategoryId): Draft {
  return { cat, name: defaultName(cat), amt: '', people: [ME], payer: ME, group: null };
}

export function total(d: Draft): number {
  const n = parseFloat(d.amt);
  return Number.isFinite(n) ? n : 0;
}

/** Keeps digits and one dot, at most 2 decimals and 7 digits of rupees. */
export function cleanAmount(text: string): string {
  let t = text.replace(/[^0-9.]/g, '');
  const dot = t.indexOf('.');
  if (dot >= 0) t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  const [whole, frac] = t.split('.');
  const w = whole.replace(/^0+(?=\d)/, '').slice(0, 7);
  return frac !== undefined ? `${w || '0'}.${frac}` : w;
}

export function payerName(d: Draft): string {
  return d.payer === ME ? 'You' : nameOf(d.payer);
}

/** "You, Riya and Neth", "All 4 of you", or "Who’s in?" */
export function whoText(d: Draft): string {
  const n = d.people.length;
  if (n < 2) return 'Who’s in?';
  const g = groupById(d.group);
  if (g) {
    const all = groupPeople(g).length;
    return n === all ? `All ${n} of you` : `${n} of ${all} in it`;
  }
  const others = d.people.filter((p) => p !== ME).map(nameOf);
  const list = d.people.includes(ME) ? ['You', ...others] : others;
  return list.length <= 3 ? listNames(list) : `${list[0]}, ${list[1]} +${list.length - 2}`;
}

/** "₹150 each · you get back ₹300". Empty until there's an amount and two people. */
export function eachLine(d: Draft, short = false): string {
  const n = d.people.length;
  const t = total(d);
  if (n < 2 || !t) return '';
  const each = t / n;
  let s = `${inrExact(each)} each`;
  if (short) return s;
  const meIn = d.people.includes(ME);
  if (d.payer === ME) {
    const back = meIn ? t - each : t;
    if (back > 0) s += ` · you get back ${inrExact(back)}`;
  } else if (meIn) {
    s += ` · you owe ${nameOf(d.payer)} ${inrExact(each)}`;
  }
  return s;
}

/** The button says what's missing, then what it will do. */
export function ctaText(d: Draft): string {
  if (!total(d)) return 'Type the amount';
  if (d.people.length < 2) return 'Pick who’s in';
  const g = groupById(d.group);
  return `Add ${inrExact(total(d))}${g ? ` to ${g.name}` : ''}`;
}

export function billName(d: Draft): string {
  return d.name.trim() || (d.cat === 'other' ? 'Bill' : defaultName(d.cat));
}
