// Pins the receipt maths in src/data/receipt.ts to a real four-person night, to the rupee.
// Run: node --experimental-strip-types scripts/receipt-check.mjs   (Node 22.6 or later)
import assert from 'node:assert/strict';

import {
  breakdown,
  followRates,
  evenAmong,
  evenWhole,
  forget,
  grandTotal,
  isTagged,
  leftOf,
  netFor,
  paidUp,
  payments,
  plus,
  sampleRead,
  shares,
  toTag,
  withUnits,
  without,
} from '../src/data/receipt.ts';

const people = ['me', 'riya', 'kabir', 'om'];
const { receipt: r } = sampleRead();
const line = (name) => r.lines.find((l) => l.name === name);
const tag = (name, t) => Object.assign(line(name), t);

assert.equal(grandTotal(r), 2457, 'the Truffles total');
assert.equal(r.tax, 117, 'GST as printed');

// A percentage follows the items: 5% GST on a new ₹100 line is ₹5 more; a fixed amount stays put.
{
  const t = { ...r, lines: [...r.lines, { ...r.lines[0], id: 'x', price: 100 }], rates: { tax: 5, service: 10 } };
  followRates(t);
  assert.equal(t.tax, 122, '5% of 2,440');
  assert.equal(t.service, 244, '10% of 2,440');
  const fixed = { ...r, lines: [...r.lines, { ...r.lines[0], id: 'y', price: 100 }], rates: {} };
  followRates(fixed);
  assert.equal(fixed.tax, 117, 'no rate, no change');
}
assert.equal(toTag(r).length, 6, 'nothing tagged yet');

// Who had what on the night.
tag('Classic burger', evenAmong(line('Classic burger'), ['me']));
tag('Peri peri fries', evenAmong(line('Peri peri fries'), people));
tag('Chicken wings', evenAmong(line('Chicken wings'), ['kabir', 'om']));
tag('Lemonade', withUnits(line('Lemonade'), 'me', 1));
assert.equal(leftOf(line('Lemonade')), 1, 'one lemonade still unclaimed');
assert.equal(isTagged(line('Lemonade')), false);
tag('Lemonade', withUnits(line('Lemonade'), 'riya', 1));
assert.equal(isTagged(line('Lemonade')), true);
tag('Mud pie', evenAmong(line('Mud pie'), ['riya']));
tag('Nachos', evenAmong(line('Nachos'), people));
assert.equal(toTag(r).length, 0, 'every line tagged');

const { total } = shares(r, people);
assert.deepEqual(total, { me: 811, riya: 780, kabir: 433, om: 433 }, 'shares with GST spread');
assert.equal(total.me + total.riya + total.kabir + total.om, 2457, 'shares add up to the bill');

// Your share, line by line, as the damage page shows it.
assert.deepEqual(breakdown(r, people, 'me'), {
  rows: [
    { label: 'Classic burger', value: 420 },
    { label: 'Peri peri fries ÷ 4', value: 60 },
    { label: '1 × Lemonade', value: 180 },
    { label: 'Nachos ÷ 4', value: 113 },
    { label: 'GST share', value: 38 },
  ],
  total: 811,
});

// You paid the lot.
r.paid = { me: 2457 };
assert.equal(paidUp(r), true);
assert.deepEqual(payments(r, people), [
  { from: 'riya', to: 'me', amount: 780 },
  { from: 'kabir', to: 'me', amount: 433 },
  { from: 'om', to: 'me', amount: 433 },
]);
assert.equal(netFor(r, people, 'me'), 1646);

// Riya put in 1,000 and you the rest.
r.paid = { me: 1457, riya: 1000 };
assert.deepEqual(payments(r, people), [
  { from: 'kabir', to: 'me', amount: 433 },
  { from: 'om', to: 'me', amount: 213 },
  { from: 'om', to: 'riya', amount: 220 },
]);
assert.equal(netFor(r, people, 'riya'), 220);

// Short or over is not paid up; whole rupees against a bill in paise is.
r.paid = { me: 2000 };
assert.equal(paidUp(r), false);
assert.equal(paidUp({ ...r, tax: 117.25, paid: { me: 2457 } }), true, 'paise on the bill');
assert.equal(paidUp({ ...r, paid: { me: 2456 } }), false, 'a rupee short');

// Adding and taking people off an even split shares it again.
const fries = line('Peri peri fries');
assert.deepEqual(without(fries, 'om').tags, { me: 1 / 3, riya: 1 / 3, kabir: 1 / 3 });
assert.deepEqual(Object.keys(plus(line('Classic burger'), 'riya').tags), ['me', 'riya']);

// Someone leaves the bill: their tags and payments go.
r.paid = { me: 1457, om: 1000 };
const left = forget(r, ['me', 'riya', 'kabir']);
assert.equal(left.paid.om, undefined);
assert.deepEqual(Object.keys(left.lines.find((l) => l.name === 'Nachos').tags), [
  'me',
  'riya',
  'kabir',
]);

assert.deepEqual(evenWhole(4, 3), [2, 1, 1]);
assert.deepEqual(evenWhole(2, 4), [1, 1, 0, 0]);

console.log('receipt maths: all good');
