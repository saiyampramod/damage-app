/**
 * A bill as a line item, for everything on Bills after the first few price tags: the small price
 * tag (`MiniTag`: its colour says where it stands, a ₹ on it), the name, then the group's badge
 * and name or the date and total, and on the right the same amount and words its price tag would
 * show. Tap to open, hold to move it into a group.
 *
 * A person's page uses the same line for what's between you and them (the founder: "the bill
 * should look the same as in Bills"): `as` swaps in that amount, its words and its tag colour,
 * and a group gets its own badge and "Group · 4 bills".
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { billsIn, groupColor } from '@/data/store';
import type { Bill } from '@/data/types';
import { inr, shortDate } from '@/lib/format';
import { colors, gutter } from '@/theme/tokens';

import { miniTone, tagFor } from './billTag';
import { GroupBadge } from './group/GroupBadge';
import { KIND_ICON } from './group/kinds';
import { BillTag, type MiniTone } from './ledger/parts';
import { Signed, signed } from './money/Signed';
import { Txt } from './Txt';

export type LineAs = { value?: number; label: string; tone: MiniTone; muted?: boolean };

export function BillLine({
  bill,
  first = false,
  onLongPress,
  as,
}: {
  bill: Bill;
  first?: boolean;
  onLongPress?: () => void;
  /** What to show in place of the bill's own tag: an amount with someone, its words, its colour. */
  as?: LineAs;
}) {
  // Reads the example data, which changes in place: not memoised by the React Compiler.
  'use no memo';
  const own = tagFor(bill);
  const t = as
    ? {
        ...own,
        value: as.value,
        label: as.label,
        muted: as.muted ?? false,
        amount: as.value === undefined ? inr(bill.total) : signed(as.value),
      }
    : own;
  const tone = as ? as.tone : miniTone(bill);
  const isGroup = bill.kind === 'group';
  // A group on a person's page carries its own badge.
  const badge = isGroup
    ? { name: bill.name, color: groupColor(bill), icon: KIND_ICON[bill.groupKind ?? 'outing'] }
    : t.group;
  const date = shortDate(new Date(`${bill.date}T12:00:00`));
  const sub = isGroup
    ? `Group · ${billsIn(bill.id).length} bills`
    : t.group
      ? `${t.group.name} · ${date}`
      : `${date} · ${inr(bill.total)}`;
  // Like its tag: only what you owe is red; money coming back stays black (no green on bills).
  const coloured = t.value !== undefined && !t.muted && t.value <= -0.5;
  return (
    <Pressable
      onPress={() => router.push(`/bill/${bill.id}`)}
      onLongPress={onLongPress}
      delayLongPress={450}
      accessibilityRole="button"
      accessibilityLabel={`${bill.name}${t.group ? `, in ${t.group.name}` : ''}, ${sub}. ${t.amount}, ${t.label}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
      {first ? null : <View style={styles.rule} />}
      <BillTag tone={tone} />
      <View style={styles.text}>
        <Txt variant="rowTitle" color={t.muted ? colors.inkMuted : colors.ink} numberOfLines={1}>
          {bill.name}
        </Txt>
        <View style={styles.sub}>
          {badge ? <GroupBadge group={badge} size={16} /> : null}
          <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1} style={{ flexShrink: 1 }}>
            {sub}
          </Txt>
        </View>
      </View>
      <View style={styles.right}>
        {coloured ? (
          <Signed value={t.value!} />
        ) : (
          <Txt variant="rowTitle" color={t.muted ? colors.inkMuted : colors.ink}>
            {t.amount}
          </Txt>
        )}
        <Txt variant="small" color={colors.inkSoft} numberOfLines={1}>
          {t.label}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: gutter,
  },
  rule: {
    position: 'absolute',
    top: 0,
    left: 70,
    right: 0,
    height: 1,
    backgroundColor: colors.hairline,
  },
  text: { flex: 1, minWidth: 0, gap: 3 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  right: { alignItems: 'flex-end', gap: 1, maxWidth: 130 },
});
