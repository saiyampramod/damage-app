/**
 * Example data for building the UI before the API is connected.
 * Names, bills and groups come from the Damage wireframes (v2).
 * Dates are relative to today so ages like "11 days" stay sensible.
 */
import type { Bill, Circle, Person, PersonId } from './types';

export const ME: PersonId = 'me';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const people: Record<PersonId, Person> = {
  me: { id: 'me', name: 'Saiyam', letter: 'S', shape: 'circle', upi: 'saiyam@okhdfc' },
  jay: { id: 'jay', name: 'Jay', shape: 'burst', upi: 'jay.d@okhdfcbank' },
  riya: { id: 'riya', name: 'Riya', shape: 'scallop', upi: 'riya.k@okicici' },
  kabir: { id: 'kabir', name: 'Kabir', shape: 'squircle', upi: 'kabir.s@paytm' },
  neth: { id: 'neth', name: 'Neth', shape: 'cloud', upi: 'neth99@okaxis' },
  sris: { id: 'sris', name: 'Sris', shape: 'blob', upi: 'sris@ybl' },
  tanvi: { id: 'tanvi', name: 'Tanvi', shape: 'hex', upi: 'tanvi.m@oksbi' },
  om: { id: 'om', name: 'Om', shape: 'circle', upi: 'om.p@okaxis' },
  ananya: { id: 'ananya', name: 'Ananya', shape: 'circle', guest: true },
};

export const circles: Circle[] = [
  { id: 'goa', name: 'Goa gang', members: ['me', 'jay', 'riya', 'sris', 'tanvi', 'om'] },
  { id: 'flat', name: 'Flatmates', members: ['me', 'jay', 'riya', 'neth'] },
  { id: 'office', name: 'Office lunch', members: ['me', 'kabir', 'neth', 'om'] },
];

/**
 * Every example bill has a receipt in `samples.ts`. Its total, payer, payments and what it means
 * for you are worked out from that receipt when the app starts (see `store.ts`), so they're
 * left empty here. `status` is the stage it's at: tag, paid and close are re-checked against the
 * receipt; wait and settled mean the damage has been revealed.
 */
function bill(
  id: string,
  name: string,
  ago: number,
  status: Bill['status'],
  people: PersonId[],
  more: Partial<Bill> = {},
): Bill {
  return {
    id, kind: 'bill', name, date: daysAgo(ago), status, total: 0, people, transfers: [], ...more,
  };
}

/** A group. Its total and payments come from the bills inside it. */
function group(
  id: string,
  name: string,
  ago: number,
  groupKind: Bill['groupKind'],
  status: Bill['status'],
  people: PersonId[],
  circleId: string,
  tint: number,
): Bill {
  return {
    id, kind: 'group', groupKind, name, date: daysAgo(ago), status, total: 0, people,
    transfers: [], circleId, tint,
  };
}

const goa: PersonId[] = ['me', 'jay', 'riya', 'sris', 'tanvi', 'om'];
const crawl: PersonId[] = ['me', 'jay', 'riya', 'om'];
const flat: PersonId[] = ['me', 'jay', 'riya', 'neth'];

export const bills: Bill[] = [
  // Waiting on you
  bill('toit', 'Friday at Toit', 7, 'tag', ['me', 'jay', 'riya', 'neth', 'ananya'], {
    circleId: 'flat',
  }),
  bill('brunch', 'Sunday brunch', 8, 'paid', ['me', 'riya', 'sris', 'tanvi', 'ananya'], {
    circleId: 'goa',
  }),
  bill('cab', 'Airport cab', 11, 'close', ['me', 'neth', 'om']),

  // Damage revealed, money moving
  bill('bastian', 'Dinner at Bastian', 11, 'wait', ['me', 'jay', 'riya', 'tanvi', 'om']),
  group('goa-trip', 'Goa trip 2026', 23, 'trip', 'wait', goa, 'goa', 2),
  group('crawl', 'Saturday crawl', 9, 'outing', 'wait', crawl, 'goa', 1),
  bill('office-lunch', 'Office lunch', 13, 'wait', ['me', 'kabir', 'neth', 'om'], {
    circleId: 'office',
  }),
  group('flat-bills', 'Flat bills', 5, 'monthly', 'wait', flat, 'flat', 0),
  bill('chai', 'Team chai', 6, 'wait', ['me', 'kabir', 'om'], { circleId: 'office' }),
  bill('movie', 'Movie night', 15, 'wait', ['me', 'riya', 'sris', 'tanvi'], { circleId: 'goa' }),

  // Settled
  bill('chai-run', 'Chai run', 5, 'settled', ['me', 'jay']),
  bill('meghana', 'Lunch at Meghana’s', 37, 'settled', ['me', 'kabir', 'neth', 'om'], {
    circleId: 'office',
  }),
  group('reunion', 'Reunion night', 50, 'outing', 'settled', goa, 'goa', 4),

  // Bills inside groups. They have no payments of their own: the group settles them.
  bill('goa-villa', 'Villa in Anjuna', 23, 'wait', goa, { groupId: 'goa-trip' }),
  bill('goa-shack', 'Beach shack dinner', 22, 'wait', goa, { groupId: 'goa-trip' }),
  bill('goa-scooter', 'Scooter rental', 21, 'wait', goa, { groupId: 'goa-trip' }),
  bill('crawl-toit', 'Toit, first round', 9, 'wait', crawl, { groupId: 'crawl' }),
  bill('crawl-arbor', 'Arbor', 9, 'wait', crawl, { groupId: 'crawl' }),
  bill('crawl-biryani', 'Late-night biryani', 9, 'wait', crawl, { groupId: 'crawl' }),
  bill('crawl-cab', 'Cab home', 9, 'wait', crawl, { groupId: 'crawl' }),
  bill('flat-power', 'Electricity', 5, 'wait', flat, { groupId: 'flat-bills' }),
  bill('flat-wifi', 'Wi-Fi', 4, 'wait', flat, { groupId: 'flat-bills' }),
  bill('reunion-dinner', 'Dinner at Toast & Tonic', 50, 'settled', goa, { groupId: 'reunion' }),
  bill('reunion-dessert', 'Dessert run', 50, 'settled', goa, { groupId: 'reunion' }),
];

/** Your friend code: what others type, or what your link and QR carry, to add you. */
export const MY_CODE = 'SAIYAM7';

/**
 * People on Damage you aren't friends with yet and haven't split with: two who've asked to be
 * your friend, and a few you could find by code or through friends. Once you're friends they move
 * into `people`.
 */
export const strangers: Record<PersonId, Person & { code: string; mutual: PersonId[] }> = {
  arjun: { id: 'arjun', name: 'Arjun', shape: 'circle', upi: 'arjun.r@okaxis', code: 'ARJUN4K', mutual: ['jay', 'om'] },
  meera: { id: 'meera', name: 'Meera', shape: 'circle', upi: 'meera@ybl', code: 'MEERA2X', mutual: ['riya', 'tanvi'] },
  dev: { id: 'dev', name: 'Dev', shape: 'circle', upi: 'dev.k@oksbi', code: 'DEV42KQ', mutual: ['kabir'] },
  isha: { id: 'isha', name: 'Isha', shape: 'circle', upi: 'isha.n@okhdfcbank', code: 'ISHA9PM', mutual: ['jay', 'riya', 'sris'] },
  karan: { id: 'karan', name: 'Karan', shape: 'circle', code: 'KARAN3T', mutual: ['neth'] },
};
