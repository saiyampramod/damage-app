/**
 * Home's People row, in the look it had from the start ("biggest each way"): a big round avatar,
 * bigger for more money, the amount in white on a black pill under it, and the words that say which
 * way it goes ("Jay owes you", "You owe Kabir"). No colour on the pill. The row slides sideways and
 * ends on `SeeAllDot`. `SeeAllCard` ends the Bills and Groups rows.
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { nameOf } from '@/data/quick';
import type { PersonId } from '@/data/types';
import { inr } from '@/lib/format';
import { colors, radius, stroke } from '@/theme/tokens';

import { Icon } from '../Icon';
import { PersonSticker } from '../ledger/parts';
import { Txt } from '../Txt';

/** Each spot in the row, so it snaps one at a time. */
export const BIG_WIDTH = 104;
/** The tallest avatar; smaller ones sit on the same line so the pills line up. */
export const BIG_MAX = 84;

/** A person, big. `size` grows with the amount (the biggest is `BIG_MAX`), the way it always did. */
export function BigPerson({ id, amount, size }: { id: PersonId; amount: number; size: number }) {
  const name = nameOf(id);
  const words = amount > 0 ? `${name} owes you` : `You owe ${name}`;
  return (
    <Pressable
      onPress={() => router.push(`/person/${id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${words} ${inr(amount)}`}
      style={({ pressed }) => [styles.spot, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
      <View style={styles.faceBox}>
        <PersonSticker id={id} size={size} />
      </View>
      <View style={styles.pill}>
        <Txt variant="label" color={colors.onAction}>
          {inr(Math.abs(amount))}
        </Txt>
      </View>
      <Txt variant="small" numberOfLines={2} style={styles.caption}>
        {words}
      </Txt>
    </Pressable>
  );
}

/** The last spot in a People or Groups row: a dashed circle with an arrow. */
export function SeeAllDot({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.spot, pressed && { opacity: 0.7 }]}>
      <View style={styles.faceBox}>
        <View style={styles.dot}>
          <Icon name="arrow" size={22} strokeWidth={2.8} color={colors.ink} />
        </View>
      </View>
      <Txt variant="small" style={[styles.caption, { marginTop: 18 }]}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** The last card in the Bills row: everything else is one tap away. */
export function SeeAllCard({
  label,
  sub,
  onPress,
  width = 112,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  width?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={({ pressed }) => [styles.all, { width }, pressed && { opacity: 0.8 }]}>
      <View style={styles.arrow}>
        <Icon name="arrow" size={20} strokeWidth={2.8} color={colors.ink} />
      </View>
      <Txt variant="rowTitle" style={{ textAlign: 'center' }}>
        {label}
      </Txt>
      {sub ? (
        <Txt variant="small" color={colors.inkSoft} style={{ textAlign: 'center' }}>
          {sub}
        </Txt>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spot: { width: BIG_WIDTH, alignItems: 'center' },
  faceBox: { height: BIG_MAX, justifyContent: 'flex-end', alignItems: 'center' },
  pill: {
    marginTop: -12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.action,
    zIndex: 20,
  },
  caption: { marginTop: 8, textAlign: 'center' },
  dot: {
    width: 64,
    height: 64,
    marginBottom: 6,
    borderRadius: 32,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  all: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 20,
    backgroundColor: colors.paper,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
