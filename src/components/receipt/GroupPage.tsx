/**
 * A group, in the same two-tab shape as a bill (option B). Bills: who's in, what's been spent,
 * every bill with where it stands and what it means for you, and Add expense, which opens what
 * the damage button opens with the group already picked. Settle up: the group's totals, like
 * Splitwise: your balance, the payments you're part of, your totals and everyone's balance.
 *
 * The group's payments square whatever is still open on its revealed bills. Every bill can also be
 * cleared on its own, right on its card (the founder's rule): Pay when you owe on it (UPI, then
 * "Did it go through?" in the card), Remind and Got it when you're owed. The group's tally then
 * works itself out again without it. What you and someone already paid each other through the
 * group isn't offered again on a bill (`coveredByGroup`).
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ME } from '@/data/mock';
import { NEEDS_YOU } from '@/data/money';
import { nameOf } from '@/data/quick';
import { shares } from '@/data/receipt';
import {
  STATUS_WORD,
  billsIn,
  clearable,
  coveredByGroup,
  receiptOf,
  setGroupPeople,
  total,
  totalsOf,
  useStore,
} from '@/data/store';
import type { Bill, GroupKind } from '@/data/types';
import { inr, listNames, shortDate } from '@/lib/format';
import { shareText } from '@/lib/pay';
import { colors, gutter, shadow, stroke, type as typeScale } from '@/theme/tokens';

import { DashedLine } from '../DashedLine';
import { Icon } from '../Icon';
import { BillTag, Label } from '../ledger/parts';
import { MoveSheet } from '../ledger/sheets';
import { showToast } from '../Toast';
import { Txt } from '../Txt';
import { usePay } from '../v2/money';
import { AskPay, KeyButton } from '../v2/parts';

import { WhoSheet } from './WhoPopup';

import {
  BigButton,
  BottomBar,
  Card,
  CardLabel,
  Chip,
  Cta,
  Face,
  Frame,
  HeadButton,
  ShareLine,
  SheetNote,
  StepTabs,
} from './parts';
import {
  BalanceCard,
  BillByBill,
  EveryoneList,
  PaymentCard,
  TotalsCard,
  itemOf,
  payWords,
} from './SettleParts';

type Tab = 'bills' | 'settle';

const KIND: Record<GroupKind, [string, string]> = {
  trip: ['Trip', 'Trip spending'],
  outing: ['Outing', 'Group spending'],
  monthly: ['Monthly', 'Group spending'],
};

/** Who paid a bill, in a few words: "Om paid", "You and Riya paid", "Nobody yet". */
function paidBy(b: Bill): string {
  const r = receiptOf(b.id);
  const ids = r ? Object.keys(r.paid).filter((p) => r.paid[p] > 0) : [];
  if (!ids.length) return 'nobody paid yet';
  if (ids.length > 2) return `${ids.length} people paid`;
  return `${listNames(ids.map(nameOf))} paid`;
}

/** Where a bill in the group stands, when there's nothing on it for you to clear. */
function stateOf(b: Bill, g: Bill): { text: string; tone: 'plain' | 'dark' | 'ok'; off: boolean } {
  if (NEEDS_YOU.includes(b.status)) {
    return { text: STATUS_WORD[b.status], tone: 'dark', off: false };
  }
  const own = b.transfers.length > 0 && b.transfers.every((t) => t.done);
  if (own) return { text: 'Settled on its own', tone: 'ok', off: true };
  if (g.status === 'settled') return { text: 'Settled in the group', tone: 'ok', off: true };
  const mine = b.transfers.filter((t) => t.from === ME || t.to === ME);
  if (mine.length && mine.every((t) => t.done)) return { text: 'Settled for you', tone: 'ok', off: true };
  if (mine.length && mine.every((t) => t.done || coveredByGroup(b, t)))
    return { text: 'Paid through the group', tone: 'ok', off: true };
  return { text: 'Nothing for you to settle', tone: 'plain', off: true };
}

type Payer = ReturnType<typeof usePay>;

/**
 * One bill in the group: what it was and what it means for you. You owe on it: Pay (opens UPI,
 * then asks "Did it go through?" right here). You're owed: just the amount, no buttons (the
 * founder dropped Remind and Got it here; reminding and marking paid live on Settle up).
 */
function BillCard({
  bill,
  group,
  onLong,
  payer,
}: {
  bill: Bill;
  group: Bill;
  onLong: () => void;
  payer: Payer;
}) {
  // Reads the example data, which changes in place: not memoised by the React Compiler.
  'use no memo';
  const open = NEEDS_YOU.includes(bill.status);
  const n = bill.mine ?? 0;
  const items = open ? [] : clearable(bill);
  const owe = items.filter((i) => i.amount < 0);
  const st = stateOf(bill, group);
  const asking = payer.asking && payer.asking.items.some((i) => i.bill.id === bill.id) ? payer.asking : null;
  // What's left for you to clear on it (some of it may already be paid through the group).
  const left = items.length ? total(items) : n;
  return (
    <View style={[styles.bill, !items.length && st.off && styles.billOff]}>
      <Pressable
        onPress={() => router.push(`/bill/${bill.id}`)}
        onLongPress={onLong}
        accessibilityRole="button"
        accessibilityLabel={`${bill.name}, ${inr(bill.total)}, ${items.length ? (n < 0 ? 'you owe' : 'you get back') : st.text}`}
        style={({ pressed }) => [styles.billRow, pressed && { opacity: 0.8 }]}>
        <BillTag tone={open ? 'needs' : n > 0 ? 'owed' : 'owe'} />
        <View style={styles.grow}>
          <Txt variant="rowTitle" numberOfLines={1}>
            {bill.name}
          </Txt>
          <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
            {shortDate(new Date(bill.date))} · {inr(bill.total)} · {paidBy(bill)}
          </Txt>
          {items.length ? null : (
            <View style={styles.chipRow}>
              <Chip text={st.text} tone={st.tone} />
            </View>
          )}
        </View>
        {open ? null : !items.length && st.off ? (
          <Txt variant="rowTitle" color={colors.inkMuted}>
            Settled
          </Txt>
        ) : (
          <View style={styles.billRight}>
            <Txt variant="rowTitle">{inr(left)}</Txt>
            <Txt
              variant="micro"
              color={left < 0 ? colors.outText : left > 0 ? colors.ink : colors.inkHint}
              style={{ fontSize: 12 }}>
              {left < 0 ? 'you owe' : left > 0 ? 'you get back' : 'square'}
            </Txt>
          </View>
        )}
        <Icon name="chevron" size={18} strokeWidth={2.6} color={colors.inkHint} />
      </Pressable>
      {asking ? (
        <View style={styles.billAsk}>
          <AskPay person={asking.person} amount={asking.amount} onNo={payer.notYet} onYes={payer.yes} />
        </View>
      ) : owe.length ? (
        <View style={styles.billActs}>
          <KeyButton
            dark
            label={`Pay ${inr(-total(owe))}`}
            accessibilityLabel={`Pay ${inr(-total(owe))} for ${bill.name}`}
            onPress={() => payer.pay(owe)}
          />
        </View>
      ) : null}
    </View>
  );
}

export function GroupPage({
  group,
  autoPay = false,
  tab: first = 'bills',
}: {
  group: Bill;
  autoPay?: boolean;
  tab?: Tab;
}) {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const [tab, setTab] = useState<Tab>(first);
  const [moving, setMoving] = useState<Bill | null>(null);
  // Opens Add people; counting up gives the sheet a fresh key each time.
  const [adding, setAdding] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const payer = usePay();
  const { asking, pay, yes, notYet } = payer;

  const inside = billsIn(group.id);
  const revealed = inside.filter((b) => !NEEDS_YOU.includes(b.status));
  const stillOpen = inside.filter((b) => NEEDS_YOU.includes(b.status));
  const onOwn = revealed.filter((b) => b.transfers.length && b.transfers.every((t) => t.done));
  const spent = inside.reduce((a, b) => a + b.total, 0);
  const counted = revealed.reduce((a, b) => a + b.total, 0);
  const totals = totalsOf(group);
  const mine = totals.get(ME) ?? { paid: 0, share: 0, made: 0, got: 0, balance: 0 };
  const xs = group.transfers;
  const yours = xs.filter((t) => t.from === ME || t.to === ME);
  const left = yours.filter((t) => !t.done).length;
  const [kindWord, spentWord] = KIND[group.groupKind ?? 'outing'];
  const addExpense = () => router.push({ pathname: '/add', params: { group: group.id } });

  // Pay on a group's tag (?pay=1) opens Settle up and starts paying.
  const started = useRef(false);
  useEffect(() => {
    if (!autoPay || started.current) return;
    const owe = yours.find((t) => !t.done && t.from === ME);
    if (!owe) return;
    started.current = true;
    setTab('settle');
    pay([itemOf(group, owe)]);
  });

  async function shareTally() {
    const open = xs.filter((t) => !t.done);
    if (!open.length) return showToast('Nothing left to settle');
    const lines = open.map((t) => `• ${payWords(t)} ${inr(t.amount)}`).join('\n');
    await shareText(`${group.name} on Damage, who pays whom:\n${lines}`);
  }

  const bar =
    tab === 'bills' ? (
      <BottomBar>
        <BigButton label="Add expense" icon="plus" height={54} onPress={addExpense} />
        <Cta label="Settle up" icon="arrow" onPress={() => setTab('settle')} />
      </BottomBar>
    ) : (
      <BottomBar>
        <BigButton label="Share who pays whom" icon="upload" height={54} onPress={shareTally} />
      </BottomBar>
    );

  return (
    <Frame
      title={tab === 'bills' ? 'Bills' : 'Settle up'}
      right={<HeadButton icon="plus" label="Add expense" onPress={addExpense} />}
      bar={bar}
      overlay={
        <>
          <MoveSheet bill={moving} onClose={() => setMoving(null)} />
          <WhoSheet
            key={adding}
            open={addOpen}
            mode="people"
            bill={group}
            onDone={(_, ids) => {
              setAddOpen(false);
              const before = group.people.length;
              const stay = setGroupPeople(group, ids);
              const added = group.people.length - before;
              if (stay.length) {
                showToast(
                  `${listNames(stay.map(nameOf))} ${stay.length === 1 ? 'stays' : 'stay'}: on a bill in it`,
                );
              } else if (added > 0) {
                showToast(`${added} ${added === 1 ? 'person' : 'people'} added to ${group.name}`);
              }
            }}
            onClose={() => setAddOpen(false)}
          />
        </>
      }>
      <View style={styles.name}>
        <Txt style={styles.nameText} accessibilityRole="header">
          {group.name}
        </Txt>
        <Chip text={`${kindWord} · ${group.people.length} people`} />
      </View>
      <StepTabs<Tab>
        steps={[
          ['bills', 'Bills', false],
          ['settle', 'Settle up', group.status === 'settled'],
        ]}
        value={tab}
        onChange={setTab}
        label="Bills or settle up"
      />

      {tab === 'bills' ? (
        <>
          <Card>
            <CardLabel text="Who’s in" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.people}>
              {group.people.map((p) => (
                <View key={p} style={styles.person}>
                  <View>
                    <Face id={p} size={46} />
                    {p === ME ? <View style={styles.meDot} /> : null}
                  </View>
                  <Txt variant="small" color={colors.inkSoft} numberOfLines={1}>
                    {nameOf(p)}
                  </Txt>
                </View>
              ))}
              <Pressable
                onPress={() => {
                  setAdding((n) => n + 1);
                  setAddOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Add someone to the group"
                style={styles.person}>
                <View style={styles.addBig}>
                  <Icon name="peoplePlus" size={20} color={colors.ink} />
                </View>
                <Txt variant="small" color={colors.inkSoft}>
                  Add
                </Txt>
              </Pressable>
            </ScrollView>
          </Card>
          <View style={styles.total}>
            <Icon name="bills" size={18} color={colors.ink} />
            <Txt variant="label" style={styles.totalLabel}>
              SPENT TOGETHER
            </Txt>
            <DashedLine kind="dotted" thickness={2} style={styles.leader} />
            <Txt variant="bodyStrong">{inr(spent)}</Txt>
          </View>
          <Label text={`Bills · ${inside.length}`} />
          {inside.map((b) => (
            <BillCard key={b.id} bill={b} group={group} onLong={() => setMoving(b)} payer={payer} />
          ))}
          <Pressable
            onPress={addExpense}
            accessibilityRole="button"
            style={({ pressed }) => [styles.addCard, pressed && { backgroundColor: colors.pressed }]}>
            <Icon name="plus" size={18} strokeWidth={2.8} color={colors.ink} />
            <Txt variant="label" style={{ fontSize: 15 }}>
              Add expense
            </Txt>
          </Pressable>
        </>
      ) : !revealed.length ? (
        <View style={{ marginTop: 16 }}>
          <SheetNote>
            Nothing to settle yet. Bills show up here once each one has had its “What’s the damage?”.
          </SheetNote>
        </View>
      ) : (
        <>
          <BalanceCard balance={mine.balance} transfers={xs} />
          {stillOpen.length ? (
            <Txt variant="label" style={styles.note}>
              {listNames(stillOpen.map((b) => b.name))} {stillOpen.length === 1 ? 'is' : 'are'} still
              open, so {stillOpen.length === 1 ? 'it isn’t' : 'they aren’t'} in these totals yet.
            </Txt>
          ) : null}
          {onOwn.length ? (
            <Txt variant="label" style={styles.note}>
              {listNames(onOwn.map((b) => b.name))} {onOwn.length === 1 ? 'was' : 'were'} settled
              on {onOwn.length === 1 ? 'its' : 'their'} own.
            </Txt>
          ) : null}

          <Label text="To settle" aside={yours.length ? `${left} left for you` : undefined} />
          {yours.length ? (
            yours.map((t) => {
              const it = itemOf(group, t);
              return (
                <PaymentCard
                  key={`${t.from}:${t.to}:${t.amount}`}
                  item={it}
                  asking={!!asking?.items.some((i) => i.transfer === t)}
                  onPay={() => pay([it])}
                  onYes={yes}
                  onNotYet={notYet}
                  why={<BillByBill group={group} person={ME} highlight={t} />}
                />
              );
            })
          ) : (
            <SheetNote>Nothing for you to settle in this group.</SheetNote>
          )}

          <Label text="Your totals" />
          <TotalsCard
            spentLabel={spentWord}
            spent={counted}
            totals={mine}
            breakdown={
              <>
                {revealed.map((b) => {
                  const r = receiptOf(b.id);
                  const v = r ? (shares(r, b.people).total[ME] ?? 0) : 0;
                  return <ShareLine key={b.id} label={b.name} value={inr(v)} />;
                })}
                <ShareLine total label="Your share" value={inr(mine.share)} />
              </>
            }
          />

          <Label
            text="Everyone’s balance"
            aside={`${xs.length} ${xs.length === 1 ? 'payment' : 'payments'}`}
          />
          <EveryoneList
            people={group.people}
            totals={totals}
            transfers={xs}
            detail={(p) => <BillByBill group={group} person={p} payments={false} />}
          />
        </>
      )}
    </Frame>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: 3 },
  name: { marginHorizontal: 20, gap: 6, alignItems: 'flex-start' },
  nameText: { ...typeScale.amount, lineHeight: 36 },
  people: { gap: 12, paddingTop: 10, paddingBottom: 2, paddingHorizontal: 2 },
  person: { alignItems: 'center', gap: 5, minWidth: 52 },
  meDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.highlight,
  },
  addBig: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginHorizontal: gutter,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.paper,
  },
  totalLabel: { fontSize: 13, letterSpacing: 0.8 },
  leader: { flex: 1, marginTop: 6, marginHorizontal: 4 },
  bill: {
    marginHorizontal: gutter,
    marginBottom: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 10,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  billActs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginLeft: 52 },
  billAsk: { marginTop: 10 },
  billOff: { boxShadow: 'none', borderColor: colors.chipEdge },
  chipRow: { flexDirection: 'row', marginTop: 2 },
  billRight: { alignItems: 'flex-end', gap: 2 },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: 'none' },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    marginHorizontal: gutter,
    marginBottom: 12,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
  },
  note: {
    marginTop: 12,
    marginHorizontal: gutter,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.highlightSoft,
    color: colors.inkSoft,
    fontSize: 13,
  },
});
