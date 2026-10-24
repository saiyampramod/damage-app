/**
 * Settle up on a bill, once "What's the damage?" has locked it. Only about who owes whom, like
 * Splitwise: your balance, the payments you're part of (Nudge and Got it, or Pay, which opens UPI
 * and asks "Did it go through?"), your totals, and everyone's balance, each opening line by line.
 *
 * A bill in a group can be settled on its own, or with the rest of the group. One door at a time:
 * settle it here and it leaves the group's tally; once anyone pays through the group, its own
 * payments here step aside. The pencil reopens it at any time, settled or not: payments already
 * made stay, and settling up again works out only the difference.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ME } from '@/data/mock';
import { grandTotal } from '@/data/receipt';
import {
  billById,
  canReopen,
  coveredByGroup,
  groupStarted,
  paidBack,
  receiptOf,
  reopenBill,
  totalsOf,
  useStore,
} from '@/data/store';
import type { Bill } from '@/data/types';
import { inr, shortDate } from '@/lib/format';
import { colors, gutter, shadow, stroke, type as typeScale } from '@/theme/tokens';

import { Icon } from '../Icon';
import { GroupFan, Label } from '../ledger/parts';
import { showToast } from '../Toast';
import { Txt } from '../Txt';
import { usePay } from '../v2/money';

import { ReopenSheet, ShareLines } from './InfoSheets';
import { Frame, GroupBadge, HeadButton, SheetNote } from './parts';
import { BalanceCard, EveryoneList, PaymentCard, TotalsCard, itemOf } from './SettleParts';

export function DamagePage({ bill }: { bill: Bill }) {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const [reopen, setReopen] = useState(false);
  const { asking, pay, yes, notYet } = usePay();

  const r = receiptOf(bill.id);
  if (!r) return null;

  const group = bill.groupId ? billById(bill.groupId) : undefined;
  const totals = totalsOf(bill);
  const mine = totals.get(ME) ?? { paid: 0, share: 0, made: 0, got: 0, balance: 0 };
  const xs = bill.transfers;
  const ownDone = xs.length > 0 && xs.every((t) => t.done);
  const started = !!group && groupStarted(group);
  const groupSquare = !!group && group.status === 'settled' && !ownDone;
  // Every bill can be settled on its own. Only a payment the group already covered (you and they
  // paid each other through its tally, or it's settled) is shown as done there.
  const lockedFor = (t: (typeof xs)[number]) =>
    group && coveredByGroup(bill, t)
      ? groupSquare
        ? `Settled in the ${group.name} tally`
        : `Paid through ${group.name}`
      : undefined;
  const shown = groupSquare ? xs.map((t) => ({ ...t, done: true })) : xs;
  const yours = xs.filter((t) => t.from === ME || t.to === ME);
  const left = yours.filter((t) => !t.done).length;

  function doReopen() {
    setReopen(false);
    if (reopenBill(bill)) showToast('Tagging is open again');
  }

  let banner: [string, string] | undefined;
  if (group) {
    const openInGroup = group.transfers.filter((t) => !t.done).length;
    banner = ownDone
      ? ['Settled on its own', `It’s out of the ${group.name} tally.`]
      : groupSquare
        ? [`Settled in the ${group.name} tally`, 'Everyone’s square on this one.']
        : started
          ? ['Settle it here or with the group', `Payments made through ${group.name} count here too.`]
          : [
              'Or settle it with the whole group',
              `${openInGroup} ${openInGroup === 1 ? 'payment squares' : 'payments square'} ` +
                `everyone in ${group.name}.`,
            ];
  }

  return (
    <Frame
      title="Settle up"
      right={
        canReopen(bill) ? (
          <HeadButton icon="pen" label="Edit the bill" onPress={() => setReopen(true)} />
        ) : null
      }
      overlay={
        <ReopenSheet
          open={reopen}
          paid={paidBack(bill)}
          onReopen={doReopen}
          onClose={() => setReopen(false)}
        />
      }>
      <View style={styles.name}>
        <Txt style={styles.nameText} accessibilityRole="header">
          {bill.name}
        </Txt>
        <View style={styles.meta}>
          <Txt variant="label" color={colors.inkHint} style={{ fontSize: 13 }}>
            {shortDate(new Date(bill.date))} · {inr(grandTotal(r))}
          </Txt>
          {group ? <GroupBadge name={group.name} /> : null}
        </View>
      </View>

      {group && banner ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/bill/[id]', params: { id: group.id, tab: 'settle' } })
          }
          accessibilityRole="button"
          accessibilityLabel={`${banner[0]}. ${banner[1]} Open ${group.name}`}
          style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
          <GroupFan tones={['owe', 'owe', 'owe']} />
          <View style={styles.grow}>
            <Txt variant="rowTitle" style={{ fontSize: 15 }}>
              {banner[0]}
            </Txt>
            <Txt variant="rowSub" color={colors.inkSoft}>
              {banner[1]}
            </Txt>
          </View>
          <Icon name="chevron" size={18} strokeWidth={2.6} color={colors.ink} />
        </Pressable>
      ) : null}

      <BalanceCard balance={groupSquare ? 0 : mine.balance} transfers={shown} />

      <Label text="To settle" aside={yours.length ? `${left} left for you` : undefined} />
      {yours.length ? (
        yours.map((t) => {
          const it = itemOf(bill, t);
          return (
            <PaymentCard
              key={`${t.from}:${t.to}`}
              item={it}
              locked={lockedFor(t)}
              asking={!!asking?.items.some((i) => i.transfer === t)}
              onPay={() => pay([it])}
              onYes={yes}
              onNotYet={notYet}
            />
          );
        })
      ) : (
        <SheetNote>Nothing for you to settle on this one.</SheetNote>
      )}

      <Label text="Your totals" />
      <TotalsCard
        spentLabel="Bill total"
        spent={grandTotal(r)}
        totals={mine}
        breakdown={<ShareLines receipt={r} people={bill.people} person={ME} paidLabel="You paid" />}
      />

      <Label
        text="Everyone’s balance"
        aside={`${xs.length} ${xs.length === 1 ? 'payment' : 'payments'}`}
      />
      <EveryoneList
        people={bill.people}
        totals={totals}
        transfers={shown}
        detail={(p) => <ShareLines receipt={r} people={bill.people} person={p} paidLabel="Paid" />}
      />
    </Frame>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: 2 },
  name: { marginHorizontal: 20, gap: 4 },
  nameText: { ...typeScale.amount, lineHeight: 36 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginHorizontal: gutter,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: 'none' },
});
