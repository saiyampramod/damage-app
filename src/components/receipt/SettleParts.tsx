/**
 * Settle up, for a bill or a group: the same four pieces on both, in the order a person needs
 * them. Where you stand (BalanceCard), the payments you're part of (PaymentCard), your totals
 * (TotalsCard: what was spent, what you paid, your share, what's moved since, your balance), and
 * everyone's balance (EveryoneList), each opening to what they paid, their share and who pays whom.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ME } from '@/data/mock';
import { nameOf } from '@/data/quick';
import { byBill, itemKey, wasReminded, type Item, type Totals } from '@/data/store';
import type { Bill, PersonId, Transfer } from '@/data/types';
import { inr, listNames } from '@/lib/format';
import { colors, fonts, gutter, radius, shadow, stroke } from '@/theme/tokens';

import { Icon } from '../Icon';
import { signed } from '../money/Signed';
import { Txt } from '../Txt';
import { nudgeItems, settleItems } from '../v2/money';

import { BigButton, Face, ShareLine } from './parts';


/** A payment as an Item, from your side: + they pay you, − you pay them. */
export function itemOf(bill: Bill, t: Transfer): Item {
  return {
    person: t.to === ME ? t.from : t.to,
    bill,
    amount: t.to === ME ? t.amount : -t.amount,
    transfer: t,
  };
}

/** "You pay Jay", "Jay pays you", "Sris pays Om". */
export const payWords = (t: Transfer) =>
  `${t.from === ME ? 'You pay' : `${nameOf(t.from)} pays`} ${t.to === ME ? 'you' : nameOf(t.to)}`;

/** Where you stand: the one number, who it's with, and how many payments are done. */
export function BalanceCard({ balance, transfers }: { balance: number; transfers: Transfer[] }) {
  // Reads the example data, which changes in place: not memoised by the React Compiler.
  'use no memo';
  const open = transfers.filter((t) => !t.done && (t.from === ME || t.to === ME));
  const ids = [...new Set(open.map((t) => (t.to === ME ? t.from : t.to)))];
  const done = transfers.filter((t) => t.done).length;
  const square = Math.abs(balance) < 0.5;
  const allDone = transfers.length > 0 && done === transfers.length;
  return (
    <View style={styles.balance}>
      <Txt variant="eyebrow" color={colors.inkSoft}>
        YOUR BALANCE
      </Txt>
      {square && allDone ? (
        <View style={styles.squareRow}>
          <View style={styles.squareTick}>
            <Icon name="check" size={18} strokeWidth={3.4} color={colors.ink} />
          </View>
          <Txt style={styles.squareText}>All square!</Txt>
        </View>
      ) : (
        <Txt style={styles.big}>{inr(balance)}</Txt>
      )}
      <Txt variant="label" style={styles.who}>
        {square ? (
          allDone ? (
            'Every payment is done'
          ) : (
            'You’re square'
          )
        ) : balance < 0 ? (
          <>
            <Txt variant="label" color={colors.outText}>
              You owe
            </Txt>{' '}
            {listNames(ids.map(nameOf))}
          </>
        ) : (
          <>
            {listNames(ids.map(nameOf))} {ids.length === 1 ? 'owes' : 'owe'}{' '}
            <Txt variant="label" color={colors.inText}>
              you
            </Txt>
          </>
        )}
      </Txt>
      {transfers.length ? (
        <>
          <View style={styles.progress} accessibilityElementsHidden>
            <View style={[styles.progressFill, { width: `${(done / transfers.length) * 100}%` }]} />
          </View>
          <Txt variant="label" color={colors.inkSoft} style={styles.progressText}>
            {done} of {transfers.length} payments settled
          </Txt>
        </>
      ) : null}
    </View>
  );
}

/**
 * One payment you're part of, with what you can do about it: Nudge and Got it when they owe you,
 * Pay when you owe them (it opens UPI, then asks "Did it go through?"). `locked` is a payment on
 * a bill whose group is settling it instead.
 */
export function PaymentCard({
  item,
  asking,
  onPay,
  onYes,
  onNotYet,
  locked,
  why,
}: {
  item: Item;
  asking: boolean;
  onPay: () => void;
  onYes: () => void;
  onNotYet: () => void;
  /** Words for why there's nothing to do here ("Settling in the Goa trip tally"). */
  locked?: string;
  /** How the amount was worked out, behind a "How it adds up" drop-down (a group's bills). */
  why?: ReactNode;
}) {
  // Reads the example data, which changes in place: not memoised by the React Compiler.
  'use no memo';
  const [open, setOpen] = useState(false);
  const t = item.transfer;
  const owed = t.to === ME;
  const name = nameOf(item.person);
  const reminded = wasReminded(itemKey(item));
  return (
    <View style={[styles.payment, t.done && !open && styles.paymentDone]}>
      <View style={styles.paymentTop}>
        <Face id={item.person} size={40} />
        <View style={styles.grow}>
          <Txt variant="rowTitle" numberOfLines={1}>
            {owed ? `${name} pays you` : `You pay ${name}`}
          </Txt>
          {t.done ? (
            <View style={styles.doneRow}>
              <Icon name="check" size={13} strokeWidth={3.2} color={colors.inkHint} />
              <Txt variant="label" color={colors.inkHint} style={{ fontSize: 13 }}>
                {owed ? 'Collected' : 'Paid'}
              </Txt>
            </View>
          ) : (
            <Txt variant="rowSub" color={owed ? colors.inText : colors.outText}>
              {owed ? (reminded ? 'Nudged' : 'To collect') : 'To pay'}
            </Txt>
          )}
        </View>
        <Txt variant="rowTitle" color={t.done ? colors.inkMuted : colors.ink}>
          {inr(t.amount)}
        </Txt>
      </View>
      {t.done ? null : locked ? (
        <View style={styles.locked}>
          <Icon name="lock" size={15} strokeWidth={2.6} color={colors.inkSoft} />
          <Txt variant="label" color={colors.inkSoft} style={{ flex: 1, fontSize: 13 }}>
            {locked}
          </Txt>
        </View>
      ) : asking ? (
        <View style={styles.ask}>
          <Txt variant="rowTitle" accessibilityLiveRegion="polite">
            Did {inr(t.amount)} to {name} go through?
          </Txt>
          <View style={styles.actions}>
            <BigButton label="Not yet" height={46} light onPress={onNotYet} />
            <BigButton label="Yes, it’s paid" height={46} light lime onPress={onYes} />
          </View>
        </View>
      ) : owed ? (
        <View style={styles.actions}>
          <BigButton
            label={reminded ? 'Nudge again' : 'Nudge'}
            icon="bell"
            height={46}
            light
            onPress={() => nudgeItems([item])}
          />
          <BigButton
            label="Got it"
            height={46}
            light
            lime
            onPress={() => settleItems([item], `${name} paid you ${inr(t.amount)}`)}
          />
        </View>
      ) : (
        <View style={styles.actions}>
          <BigButton label={`Pay ${inr(t.amount)}`} height={46} light lime onPress={onPay} />
        </View>
      )}
      {why ? (
        <>
          <Pressable
            onPress={() => setOpen(!open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={`How ${inr(t.amount)} adds up. ${open ? 'Hide' : 'Show'} it bill by bill`}
            style={({ pressed }) => [styles.whyToggle, pressed && { opacity: 0.7 }]}>
            <Txt variant="label" color={colors.ink} style={{ fontSize: 13 }}>
              How it adds up
            </Txt>
            <View style={open ? { transform: [{ rotate: '180deg' }] } : null}>
              <Icon name="down" size={14} strokeWidth={2.8} color={colors.ink} />
            </View>
          </Pressable>
          {open ? <View style={styles.why}>{why}</View> : null}
        </>
      ) : null}
    </View>
  );
}

/** One line of the totals, the amount on the right. */
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Txt style={[styles.rowText, strong && styles.heavy]} numberOfLines={1}>
        {label}
      </Txt>
      <Txt style={[styles.rowText, styles.heavy]}>{value}</Txt>
    </View>
  );
}

/**
 * Your totals, like Splitwise's: what was spent, what you paid, your share (tap to see it line by
 * line), payments you've made and got since, and the balance that leaves.
 */
export function TotalsCard({
  spentLabel,
  spent,
  totals,
  breakdown,
}: {
  spentLabel: string;
  spent: number;
  totals: Totals;
  /** Your share, line by line: items on a bill, bills in a group. */
  breakdown: ReactNode;
}) {
  // Reads the example data, which changes in place: not memoised by the React Compiler.
  'use no memo';
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card}>
      <Row label={spentLabel} value={inr(spent)} />
      <Row label="You paid" value={inr(totals.paid)} />
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Your share, ${inr(totals.share)}. ${open ? 'Hide' : 'Show'} the lines`}
        style={styles.row}>
        <View style={styles.shareLabel}>
          <Txt style={styles.rowText}>Your share</Txt>
          <View style={open ? { transform: [{ rotate: '180deg' }] } : null}>
            <Icon name="down" size={14} strokeWidth={2.8} color={colors.inkHint} />
          </View>
        </View>
        <Txt style={[styles.rowText, styles.heavy]}>{inr(totals.share)}</Txt>
      </Pressable>
      {open ? <View style={styles.breakdown}>{breakdown}</View> : null}
      <Row label="Payments you made" value={inr(totals.made)} />
      <Row label="Payments you got" value={inr(totals.got)} />
      <View style={styles.rule} />
      <Row label="Your balance" value={signed(totals.balance)} strong />
    </View>
  );
}

/** An amount in black with the words for which way it goes under it, coloured. */
function Way({ value, person, strong }: { value: number; person: PersonId; strong?: boolean }) {
  const me = person === ME;
  const square = Math.abs(value) < 0.5;
  return (
    <View style={styles.way}>
      <Txt style={[styles.mathAmount, strong && { fontSize: 16 }]}>{inr(value)}</Txt>
      <Txt
        variant="micro"
        color={square ? colors.inkHint : value < 0 ? colors.outText : colors.inText}
        style={{ fontSize: 11.5 }}>
        {square ? 'square' : value < 0 ? (me ? 'you owe' : 'owes') : me ? 'you get back' : 'gets back'}
      </Txt>
    </View>
  );
}

/**
 * How someone's group balance adds up, bill by bill: what they paid and their share on each, what
 * that leaves, what's already been paid through the group, and the payments that square it.
 * `highlight` is the payment being explained; `payments` leaves out the payment list (Everyone's
 * balance already shows it).
 */
export function BillByBill({
  group,
  person,
  highlight,
  payments = true,
}: {
  group: Bill;
  person: PersonId;
  highlight?: Transfer;
  payments?: boolean;
}) {
  // Reads the example data, which changes in place: not memoised by the React Compiler.
  'use no memo';
  const me = person === ME;
  const { rows, bills, viaGroup, balance } = byBill(group, person);
  const theirs = group.transfers.filter((t) => t.from === person || t.to === person);
  // What it would take if every bill were settled on its own.
  const separately = rows
    .filter((x) => !x.own)
    .reduce((n, x) => n + x.bill.transfers.filter((t) => t.from === person || t.to === person).length, 0);
  const paidWord = me ? 'You paid' : 'Paid';
  return (
    <View>
      {rows.map((x) => {
        const moved =
          x.moved > 0.5
            ? ` · paid back ${inr(x.moved)} on it`
            : x.moved < -0.5
              ? ` · got back ${inr(-x.moved)} on it`
              : '';
        return (
          <View key={x.bill.id} style={styles.mathRow}>
            <View style={styles.grow}>
              <Txt variant="label" numberOfLines={1} style={{ fontSize: 14 }}>
                {x.bill.name}
              </Txt>
              <Txt variant="micro" color={colors.inkHint} style={{ fontSize: 12 }}>
                {x.own
                  ? 'Settled on its own'
                  : `${paidWord} ${inr(x.paid)} · share ${inr(x.share)}${moved}`}
              </Txt>
            </View>
            <Way value={x.net} person={person} />
          </View>
        );
      })}
      <View style={styles.mathRule} />
      <View style={styles.mathRow}>
        <Txt variant="label" style={[styles.grow, { fontSize: 14 }]}>
          {rows.length === 1 ? 'From 1 bill' : `Across ${rows.length} bills`}
        </Txt>
        <Way value={bills} person={person} strong={!viaGroup} />
      </View>
      {Math.abs(viaGroup) > 0.5 ? (
        <>
          <View style={styles.mathRow}>
            <Txt variant="label" color={colors.inkSoft} style={[styles.grow, { fontSize: 14 }]}>
              {viaGroup > 0 ? 'Paid through the group' : 'Got back through the group'}
            </Txt>
            <Txt style={styles.mathAmount}>{inr(Math.abs(viaGroup))}</Txt>
          </View>
          <View style={styles.mathRow}>
            <Txt variant="label" style={[styles.grow, { fontSize: 14 }]}>
              Left to settle
            </Txt>
            <Way value={balance} person={person} strong />
          </View>
        </>
      ) : null}
      {payments && theirs.length ? (
        <View style={styles.paidAs}>
          <Txt variant="eyebrow" color={colors.inkSoft}>
            {theirs.length === 1 ? 'SETTLED IN ONE PAYMENT' : `SETTLED IN ${theirs.length} PAYMENTS`}
          </Txt>
          {theirs.map((t) => {
            const on = t === highlight;
            return (
              <View key={`${t.from}:${t.to}`} style={styles.paidAsRow}>
                <View style={[styles.dot, on && styles.dotOn]} />
                <Txt
                  variant="label"
                  numberOfLines={1}
                  color={t.done ? colors.inkMuted : colors.ink}
                  style={[styles.grow, { fontSize: 14 }, on && { fontFamily: fonts.bodyHeavy }]}>
                  {payWords(t)}
                </Txt>
                {t.done ? <Icon name="check" size={14} strokeWidth={3} color={colors.inkMuted} /> : null}
                <Txt
                  variant="label"
                  color={t.done ? colors.inkMuted : colors.ink}
                  style={[{ fontSize: 14 }, on && { fontFamily: fonts.bodyHeavy }]}>
                  {inr(t.amount)}
                </Txt>
              </View>
            );
          })}
        </View>
      ) : null}
      {payments ? (
        <Txt variant="micro" color={colors.inkSoft} style={styles.mathNote}>
          {separately > theirs.length
            ? `Damage adds every bill up first, then squares it in the fewest payments: ${theirs.length} for ${me ? 'you' : nameOf(person)} instead of ${separately}.`
            : 'Damage adds every bill up first, then squares it in the fewest payments.'}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * Everyone's balance, most owed first: Gets back, Owes or Square. Tap someone for what they paid,
 * their share (`detail`, when there's more to say) and the payments they're part of.
 */
export function EveryoneList({
  people,
  totals,
  transfers,
  detail,
}: {
  people: PersonId[];
  totals: Map<PersonId, Totals>;
  transfers: Transfer[];
  detail?: (p: PersonId) => ReactNode;
}) {
  // Reads the example data, which changes in place: not memoised by the React Compiler.
  'use no memo';
  const [open, setOpen] = useState<PersonId>();
  const bal = (p: PersonId) => totals.get(p)?.balance ?? 0;
  const order = [...people].sort((a, b) => bal(b) - bal(a));
  return (
    <>
      {order.map((p) => {
        const t = totals.get(p);
        const v = bal(p);
        const state = Math.abs(v) < 0.5 ? 'Square' : v > 0 ? 'Gets back' : 'Owes';
        const theirs = transfers.filter((x) => x.from === p || x.to === p);
        const isOpen = open === p;
        return (
          <View key={p} style={[styles.person, state === 'Square' && !isOpen && styles.personSquare]}>
            <Pressable
              onPress={() => setOpen(isOpen ? undefined : p)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${nameOf(p)}, ${state.toLowerCase()}${state === 'Square' ? '' : ` ${inr(v)}`}`}
              style={styles.personTop}>
              <Face id={p} size={40} />
              <View style={styles.grow}>
                <Txt variant="rowTitle" numberOfLines={1}>
                  {nameOf(p)}
                </Txt>
                <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
                  Paid {inr(t?.paid ?? 0)}
                </Txt>
              </View>
              <View style={isOpen ? { transform: [{ rotate: '180deg' }] } : null}>
                <Icon name="down" size={16} strokeWidth={2.8} color={colors.inkHint} />
              </View>
              <View style={styles.personRight}>
                <Txt variant="rowTitle">{inr(v)}</Txt>
                <View
                  style={[
                    styles.pill,
                    state === 'Owes' && { backgroundColor: colors.action, borderColor: colors.action },
                    state === 'Gets back' && {
                      backgroundColor: colors.highlight,
                      borderColor: colors.line,
                    },
                  ]}>
                  <Txt
                    variant="micro"
                    color={
                      state === 'Owes'
                        ? colors.onAction
                        : state === 'Gets back'
                          ? colors.ink
                          : colors.inkHint
                    }
                    style={{ fontSize: 11.5 }}>
                    {state}
                  </Txt>
                </View>
              </View>
            </Pressable>
            {isOpen ? (
              <View style={styles.personMore}>
                {detail ? (
                  detail(p)
                ) : (
                  <>
                    <ShareLine label="Paid" value={inr(t?.paid ?? 0)} />
                    <ShareLine label="Share" value={inr(t?.share ?? 0)} />
                  </>
                )}
                {theirs.length ? (
                  <View style={styles.theirs}>
                    {theirs.map((x) => (
                      <View key={`${x.from}:${x.to}`} style={styles.theirRow}>
                        <Face id={x.from} size={28} />
                        <Txt
                          variant="label"
                          color={x.done ? colors.inkMuted : colors.ink}
                          numberOfLines={1}
                          style={{ flex: 1 }}>
                          {payWords(x)}
                        </Txt>
                        {x.done ? (
                          <Icon name="check" size={15} strokeWidth={3} color={colors.inkMuted} />
                        ) : null}
                        <Txt variant="label" color={x.done ? colors.inkMuted : colors.ink}>
                          {inr(x.amount)}
                        </Txt>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: 2 },
  heavy: { fontFamily: fonts.bodyHeavy, color: colors.ink },
  balance: {
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: gutter,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.highlightSoft,
    boxShadow: shadow.s,
  },
  big: { fontFamily: fonts.display, fontSize: 44, lineHeight: 58 },
  squareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  squareTick: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.go,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareText: { fontFamily: fonts.display, fontSize: 28, lineHeight: 40 },
  who: { textAlign: 'center', fontSize: 14 },
  progress: {
    width: 210,
    height: 12,
    marginTop: 12,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.highlight },
  progressText: { fontSize: 13, marginTop: 6 },
  payment: {
    marginHorizontal: gutter,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  paymentDone: { boxShadow: 'none', borderColor: colors.chipEdge, opacity: 0.75 },
  paymentTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ask: { marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.highlightSoft,
  },
  card: {
    marginHorizontal: gutter,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 34,
  },
  rowText: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  shareLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakdown: {
    marginLeft: 2,
    marginBottom: 6,
    paddingLeft: 12,
    borderLeftWidth: stroke.s,
    borderLeftColor: colors.hairline,
  },
  rule: { height: 1.5, marginVertical: 4, backgroundColor: colors.line },
  person: {
    marginHorizontal: gutter,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  personSquare: { boxShadow: 'none', borderColor: colors.chipEdge, opacity: 0.7 },
  personTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personRight: { alignItems: 'flex-end', gap: 4 },
  pill: {
    height: 22,
    paddingHorizontal: 9,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.chipEdge,
    borderRadius: radius.pill,
  },
  personMore: {
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1.5,
    borderTopColor: colors.hairline,
  },
  theirs: { marginTop: 6 },
  theirRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  whyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 44,
    marginTop: 2,
    marginBottom: -8,
  },
  why: {
    marginTop: 6,
    paddingTop: 4,
    paddingLeft: 12,
    borderLeftWidth: stroke.s,
    borderLeftColor: colors.hairline,
  },
  mathRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 4 },
  mathAmount: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 20, color: colors.ink },
  mathRule: { height: 1.5, marginVertical: 2, backgroundColor: colors.line },
  way: { alignItems: 'flex-end' },
  paidAs: { marginTop: 10, gap: 2 },
  paidAsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.hairline },
  dotOn: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.highlight },
  mathNote: { marginTop: 8, fontSize: 12, lineHeight: 17 },
});
