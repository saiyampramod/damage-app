/**
 * The receipts behind the example bills, so every bill opens exactly like one you scanned:
 * Items | Settle while it's open, then the damage. Nothing here is a total or a payment;
 * `store.ts` works those out from these lines with the same maths as a real receipt.
 */
import { evenAmong, type Line, type Receipt } from './receipt';
import type { PersonId } from './types';

/**
 * [name, how many, price of the whole line, who had it]. A list of people shares it evenly;
 * `{ riya: 1, om: 2 }` says how many each had; leaving it out means nobody has tagged it yet.
 */
type Row = [string, number, number, (PersonId[] | Record<PersonId, number>)?];

type Sample = {
  rows: Row[];
  tax?: number;
  service?: number;
  discount?: number;
  /** Who paid towards the bill. A name on its own paid all of it. */
  paid?: PersonId | Record<PersonId, number>;
};

const all4 = ['me', 'kabir', 'neth', 'om'];
const goa = ['me', 'jay', 'riya', 'sris', 'tanvi', 'om'];
const crawl = ['me', 'jay', 'riya', 'om'];
const flat = ['me', 'jay', 'riya', 'neth'];
const bastian = ['me', 'jay', 'riya', 'tanvi', 'om'];

export const SAMPLES: Record<string, Sample> = {
  /* Still being tagged: the wings are nobody's yet. */
  toit: {
    rows: [
      ['Wheat beer pitcher', 1, 1100, ['me', 'jay', 'riya', 'neth']],
      ['IPA pint', 3, 1080, { jay: 1, riya: 1, neth: 1 }],
      ['Masala fries', 1, 360, ['me', 'riya']],
      ['Pepperoni pizza', 1, 760, ['jay', 'neth']],
      ['Peri peri wings', 1, 520],
    ],
    tax: 380,
    paid: 'me',
  },
  /* Tagged, but nobody has said who paid. */
  brunch: {
    rows: [
      ['Eggs Benedict', 2, 900, { me: 1, riya: 1 }],
      ['Avocado toast', 1, 420, ['sris']],
      ['Pancake stack', 1, 380, ['tanvi']],
      ['Shakshuka', 1, 440, ['ananya']],
      ['Cold brew', 5, 900, { me: 1, riya: 1, sris: 1, tanvi: 1, ananya: 1 }],
    ],
    tax: 200,
  },
  /* Ready to reveal. */
  cab: {
    rows: [
      ['Airport drop', 1, 1100, ['me', 'neth', 'om']],
      ['Toll', 1, 80, ['me', 'neth', 'om']],
    ],
    paid: 'neth',
  },

  /* Revealed. */
  bastian: {
    rows: [
      ['Mezze platter', 1, 1250, bastian],
      ['Truffle fries', 1, 690, bastian],
      ['Margherita pizza', 2, 1580, bastian],
      ['Grilled fish', 1, 1490, bastian],
      ['Pasta arrabbiata', 1, 980, bastian],
      ['Brownie sundae', 2, 1150, bastian],
    ],
    tax: 360,
    paid: 'me',
  },
  'office-lunch': {
    rows: [
      ['Paneer tikka', 1, 480, all4],
      ['Fresh lime soda', 4, 400, all4],
      ['Veg thali', 1, 380, ['me']],
      ['Gulab jamun', 1, 200, ['me']],
      ['Mutton biryani', 1, 640, ['neth']],
      ['Kebab platter', 1, 540, ['neth']],
      ['Butter chicken', 1, 620, ['om']],
      ['Garlic naan', 2, 160, ['om']],
      ['Mango lassi', 2, 600, { om: 1, kabir: 1 }],
      ['Fish curry meal', 1, 680, ['kabir']],
      ['Raita', 1, 100, ['kabir']],
    ],
    paid: 'kabir',
  },
  chai: {
    rows: [
      ['Masala chai', 8, 640, { me: 2, om: 2, kabir: 4 }],
      ['Vada pav', 8, 480, { me: 2, om: 2, kabir: 4 }],
      ['Bun maska', 4, 480, { me: 1, om: 1, kabir: 2 }],
    ],
    paid: 'kabir',
  },
  movie: {
    rows: [
      ['Tickets', 4, 1000, ['me', 'riya', 'sris', 'tanvi']],
      ['Caramel popcorn', 1, 370, ['riya']],
      ['Cheese nachos', 1, 270, ['tanvi']],
      ['Cold coffee', 1, 220, ['sris']],
    ],
    paid: 'sris',
  },
  'chai-run': {
    rows: [
      ['Cutting chai', 4, 80, ['me', 'jay']],
      ['Bun maska', 2, 100, ['me', 'jay']],
    ],
    paid: 'me',
  },
  meghana: {
    rows: [
      ['Chicken biryani', 2, 900, all4],
      ['Paneer biryani', 1, 440, all4],
      ['Chicken 65', 1, 380, all4],
      ['Mutton fry', 1, 510, all4],
    ],
    tax: 110,
    paid: 'me',
  },

  /* Bills inside groups. */
  'goa-villa': {
    rows: [
      ['Villa, 3 nights', 1, 8400, goa],
      ['Airport pickup', 1, 600, ['me', 'riya', 'tanvi']],
    ],
    paid: 'om',
  },
  'goa-shack': {
    rows: [
      ['Butter garlic prawns', 2, 1380, goa],
      ['Goan fish thali', 3, 1500, { riya: 1, sris: 1, tanvi: 1 }],
      ['Chicken cafreal', 1, 520, ['jay', 'om']],
      ['Kingfisher', 6, 1260, { me: 1, jay: 2, om: 2, sris: 1 }],
      ['Bebinca', 2, 360, ['me', 'tanvi']],
      ['Calamari fry', 1, 320, goa],
    ],
    tax: 260,
    paid: { me: 2000, riya: 3600 },
  },
  'goa-scooter': {
    rows: [
      ['Scooters, 3 days', 3, 2700, goa],
      ['Petrol', 1, 1100, ['jay', 'riya', 'sris', 'om']],
    ],
    paid: 'jay',
  },
  'crawl-toit': {
    rows: [
      ['Wheat beer pitcher', 2, 1600, crawl],
      ['Loaded nachos', 1, 420, ['jay', 'riya', 'om']],
    ],
    tax: 180,
    paid: 'me',
  },
  'crawl-arbor': {
    rows: [
      ['IPA pint', 4, 1200, { me: 1, jay: 1, riya: 1, om: 1 }],
      ['Masala fries', 1, 280, ['riya', 'om']],
    ],
    tax: 160,
    paid: 'jay',
  },
  'crawl-biryani': {
    rows: [
      ['Chicken biryani', 3, 1050, { me: 1, jay: 1, om: 1 }],
      ['Veg biryani', 1, 290, ['riya']],
      ['Coke', 1, 140, ['riya']],
    ],
    paid: 'riya',
  },
  'crawl-cab': {
    rows: [['Cab home', 1, 800, crawl]],
    paid: 'om',
  },
  'flat-power': {
    rows: [['Electricity, September', 1, 1600, flat]],
    paid: 'me',
  },
  'flat-wifi': {
    rows: [['Wi-Fi, October', 1, 800, flat]],
    paid: 'me',
  },
  'reunion-dinner': {
    rows: [
      ['Sharing platters', 3, 2400, goa],
      ['Cocktails', 6, 2700, { me: 1, jay: 1, riya: 1, sris: 1, tanvi: 1, om: 1 }],
    ],
    tax: 600,
    service: 500,
    paid: 'jay',
  },
  'reunion-dessert': {
    rows: [
      ['Gelato', 6, 1500, { me: 1, jay: 1, riya: 1, sris: 1, tanvi: 1, om: 1 }],
      ['Waffle', 1, 250, ['riya']],
    ],
    paid: 'tanvi',
  },
};

/** On a revealed bill or group: the people who have paid back what they owed. */
export const PAID_BACK: Record<string, PersonId[]> = {
  bastian: ['riya', 'tanvi', 'om'],
  'office-lunch': ['neth'],
  chai: ['om'],
  movie: ['riya', 'tanvi'],
  'goa-trip': ['sris'],
  'flat-bills': ['jay', 'riya'],
};

/** The example receipt for a bill, built fresh. Undefined when it has none. */
export function sampleReceipt(billId: string): Receipt | undefined {
  const s = SAMPLES[billId];
  if (!s) return undefined;
  const lines: Line[] = s.rows.map(([name, qty, price, who], i) => {
    const line: Line = { id: `${billId}-${i}`, name, qty, price, mode: 'even', tags: {} };
    if (Array.isArray(who)) return { ...line, ...evenAmong(line, who) };
    if (who) return { ...line, mode: 'units', tags: { ...who } };
    return line;
  });
  const r: Receipt = {
    lines,
    tax: s.tax ?? 0,
    service: s.service ?? 0,
    discount: s.discount ?? 0,
    paid: {},
  };
  if (typeof s.paid === 'string') {
    r.paid[s.paid] = lines.reduce((a, l) => a + l.price, 0) + r.tax + r.service - r.discount;
  } else if (s.paid) r.paid = { ...s.paid };
  return r;
}
