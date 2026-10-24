import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import { BillLine } from '@/components/BillLine';
import { Label, PersonSticker } from '@/components/ledger/parts';
import { Placeholder } from '@/components/Placeholder';
import { showToast } from '@/components/Toast';
import { nudgeItems, nudgedAll, settleItems, usePay } from '@/components/v2/money';
import { AskPay, BigButton, BigButtons, Hero, PlainPage } from '@/components/v2/parts';
import { bills, people } from '@/data/mock';
import { accept, friendState, sendRequest } from '@/data/social';
import {
  billCountWith,
  billsIn,
  doneWith,
  itemKey,
  openWith,
  settledJustNow,
  total,
  useStore,
  type Item,
} from '@/data/store';
import { inr, shortDate } from '@/lib/format';

const sharesABill = (id: string) => bills.some((b) => b.people.includes(id));
const newestFirst = (a: Item, b: Item) => b.bill.date.localeCompare(a.bill.date);
/** The oldest bill behind an amount (a group counts its first bill). */
const oldestOf = (i: Item) =>
  i.bill.kind === 'group'
    ? billsIn(i.bill.id).reduce((m, b) => (b.date < m ? b.date : m), i.bill.date)
    : i.bill.date;

/**
 * A person. Their avatar and name, the one number with "owes you" or "you owe", a line on
 * what it covers, then two big buttons: Settle up (mark it all paid, with Undo) and Nudge, or
 * Pay when you owe them (opens UPI, then asks "Did it go through?" right there). Under that,
 * what it's for, then Settled: each bill or group as the same line as on Bills (`BillLine`, the
 * founder's call), with the amount between you and them and no buttons of its own. No boxes.
 */
export default function PersonScreen() {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const { id = '', pay: payParam } = useLocalSearchParams<{ id: string; pay?: string }>();
  const person = people[id];
  const items = person ? openWith(id).sort(newestFirst) : [];
  const p = usePay();

  // Pay from a list (?pay=1) starts paying as the page opens.
  const started = useRef(false);
  useEffect(() => {
    if (payParam !== '1' || started.current || !items.some((i) => i.amount < 0)) return;
    started.current = true;
    p.pay(items);
  });

  if (!person)
    return <Placeholder title="Person" back points={['This person isn’t in your bills.']} />;

  const name = person.name;
  const x = total(items);
  const n = billCountWith(id);
  const oldest = items.map(oldestOf).sort()[0];
  const done = doneWith(id).sort(
    (a, b) =>
      Number(settledJustNow(b.transfer)) - Number(settledJustNow(a.transfer)) || newestFirst(a, b),
  );

  return (
    <PlainPage>
      <Hero
        lead={<PersonSticker id={id} size={72} />}
        title={name}
        amount={items.length ? inr(x) : undefined}
        dir={
          items.length
            ? x > 0
              ? { text: 'owes you', tone: 'in' }
              : x < 0
                ? { text: 'you owe', tone: 'out' }
                : { text: 'evens out' }
            : undefined
        }
        sum={
          items.length
            ? `Across ${n} ${n === 1 ? 'bill' : 'bills'}, the oldest from ${shortDate(new Date(oldest))}.`
            : done.length || sharesABill(id)
              ? `You and ${name} are square.`
              : `No bills with ${name} yet.`
        }>
        {!items.length ? (
          <BigButtons>
            {friendState(id) === 'friend' ? null : friendState(id) === 'outgoing' ? (
              <BigButton label="Request sent" onPress={() => showToast(`Waiting on ${name}`)} />
            ) : (
              <BigButton
                label={friendState(id) === 'incoming' ? 'Accept friend' : 'Add friend'}
                onPress={() => {
                  if (friendState(id) === 'incoming') accept(id);
                  else sendRequest(id);
                  showToast(friendState(id) === 'friend' ? `You and ${name} are friends` : `Request sent to ${name}`);
                }}
              />
            )}
            <BigButton lime label="Split a bill" onPress={() => router.push('/add')} />
          </BigButtons>
        ) : p.asking ? (
          <AskPay person={p.asking.person} amount={p.asking.amount} onNo={p.notYet} onYes={p.yes} />
        ) : (
          <BigButtons>
            <BigButton
              label="Settle up"
              onPress={() =>
                settleItems(
                  items,
                  x > 0
                    ? `${name} paid you ${inr(x)}`
                    : x < 0
                      ? `Marked ${inr(x)} to ${name} as paid`
                      : `Settled up with ${name}`,
                )
              }
            />
            {x > 0 ? (
              <BigButton
                lime
                icon="bell"
                label={nudgedAll(items) ? 'Nudge again' : 'Nudge'}
                onPress={() => nudgeItems(items)}
              />
            ) : x < 0 ? (
              // The net: what you owe them less what they owe you (one payment clears both).
              <BigButton lime label={`Pay ${inr(x)}`} onPress={() => p.pay(items)} />
            ) : null}
          </BigButtons>
        )}
      </Hero>

      {items.length ? (
        <>
          <Label text={x >= 0 ? `${name} owes you for` : `You owe ${name} for`} />
          {items.map((i, k) => (
            <BillLine
              key={itemKey(i)}
              bill={i.bill}
              first={k === 0}
              as={{
                value: i.amount,
                label: i.amount > 0 ? `${name} owes you` : `You owe ${name}`,
                tone: i.amount > 0 ? 'owed' : 'owe',
              }}
            />
          ))}
        </>
      ) : null}

      {done.length ? (
        <>
          <Label text="Settled" />
          {done.map((i, k) => (
            <BillLine
              key={`${itemKey(i)}:${k}`}
              bill={i.bill}
              first={k === 0}
              as={{
                label: settledJustNow(i.transfer) ? 'Settled just now' : 'Settled',
                tone: 'done',
                muted: true,
              }}
            />
          ))}
        </>
      ) : null}
    </PlainPage>
  );
}
