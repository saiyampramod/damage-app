import { Pressable, StyleSheet, View } from 'react-native';

import type { PersonId } from '@/data/types';
import { colors, radius, shadow, stroke } from '@/theme/tokens';

import { DashedLine } from './DashedLine';
import { GroupBadge, type GroupMark } from './group/GroupBadge';
import { wayColor } from './money/Signed';
import { PersonSticker } from './ledger/parts';
import { Smooth } from './Smooth';
import { Txt } from './Txt';

/**
 * owed  – money coming back to you (black; the number in bright green, with a +)
 * owe   – you owe (white; the number in red with a −)
 * needs – the bill is waiting on you to do something (lime)
 * done  – settled or square (paper)
 */
export type TagTone = 'owed' | 'owe' | 'needs' | 'done';

/** The group a bill is in: drawn as the pass stub in small (its colour and kind icon), then its name. */
export type TagGroup = GroupMark;

type Props = {
  tone: TagTone;
  kicker: string;
  title: string;
  amount: string;
  label: string;
  /** Who's on it, as avatars along the bottom. */
  people: PersonId[];
  /** The one button. None when there's nothing to do (settled, square). */
  action?: string;
  /** Settled: faded, with a smaller shadow. */
  muted?: boolean;
  /** The amount as a number (+ coming to you, − you owe): colours the number. */
  value?: number;
  /**
   * The group the bill is in. It sits in the kicker line, in place of "Bill": a small badge in the
   * group's colour with its kind icon, then the name. The line is the same height either way, so
   * every tag is the same size.
   */
  group?: TagGroup;
  onPress?: () => void;
  onLongPress?: () => void;
  onAction?: () => void;
  tilt?: number;
  width?: number;
};

const TONES = {
  owed: {
    fill: colors.owedFill,
    text: colors.onOwed,
    soft: colors.onOwedSoft,
    rule: colors.onOwed,
    actionFill: colors.actionOnDark,
    actionText: colors.onActionOnDark,
  },
  owe: {
    fill: colors.oweFill,
    text: colors.onOwe,
    soft: colors.inkSoft,
    rule: colors.line,
    actionFill: colors.action,
    actionText: colors.onAction,
  },
  done: {
    fill: colors.paper,
    text: colors.ink,
    soft: colors.inkSoft,
    rule: colors.line,
    actionFill: colors.action,
    actionText: colors.onAction,
  },
  needs: {
    fill: colors.needsFill,
    text: colors.onNeeds,
    soft: colors.onNeedsSoft,
    rule: colors.line,
    actionFill: colors.action,
    actionText: colors.onAction,
  },
} as const;

export const PRICE_TAG_WIDTH = 170;

/** A bill or a group, shown as a price tag on a string. */
export function PriceTag({
  tone,
  kicker,
  title,
  amount,
  label,
  people,
  action,
  muted = false,
  value,
  group,
  onPress,
  onLongPress,
  onAction,
  tilt = 0,
  width = PRICE_TAG_WIDTH,
}: Props) {
  const t = TONES[tone];
  // The number says which way it goes: bright green on a black tag (coming back), red on a white
  // one (you owe). A lime tag (waiting on you) keeps its number black.
  const way =
    value === undefined || muted || tone === 'needs' || tone === 'done'
      ? t.text
      : tone === 'owed'
        ? colors.inOnInk
        : wayColor(value);
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;

  return (
    <Smooth style={{ transform: [{ rotate: `${tilt}deg` }], opacity: muted ? 0.5 : 1 }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={450}
        accessibilityRole="button"
        accessibilityLabel={`${title}${group ? `, in ${group.name}` : ''}. ${amount}. ${label}.`}
        style={({ pressed }) => [
          styles.tag,
          {
            width,
            backgroundColor: t.fill,
            transform: [{ translateX: pressed ? 3 : 0 }, { translateY: pressed ? 3 : 0 }],
            boxShadow: pressed ? 'none' : muted ? shadow.xs : shadow.m,
          },
        ]}>
        <View style={styles.hole} />
        <View style={styles.kicker}>
          {group ? (
            <>
              <GroupBadge group={group} />
              <Txt variant="micro" color={t.text} numberOfLines={1} style={{ flexShrink: 1 }}>
                {group.name}
              </Txt>
              <Txt variant="micro" color={t.soft} numberOfLines={1}>
                · {kicker}
              </Txt>
            </>
          ) : (
            <Txt variant="micro" color={t.soft} numberOfLines={1}>
              {kicker}
            </Txt>
          )}
        </View>
        <Txt variant="card" color={t.text} numberOfLines={2} style={styles.title}>
          {title}
        </Txt>
        <Txt variant="bodyLarge" color={way} style={styles.amount}>
          {amount}
        </Txt>
        <Txt variant="small" color={t.text} numberOfLines={1}>
          {label}
        </Txt>
        <DashedLine thickness={2} color={t.rule} style={styles.rule} />
        <View style={styles.footer}>
          <View style={styles.faces}>
            {shown.map((p, i) => (
              <View key={`${p}${i}`} style={{ marginLeft: i ? -6 : 0 }}>
                <PersonSticker id={p} size={26} ring />
              </View>
            ))}
            {extra > 0 ? (
              <View
                style={[
                  styles.face,
                  { marginLeft: -6, borderColor: tone === 'owed' ? colors.onOwed : colors.line },
                ]}>
                <Txt variant="micro">+{extra}</Txt>
              </View>
            ) : null}
          </View>
          {action ? (
            <Pressable
              onPress={onAction}
              accessibilityRole="button"
              accessibilityLabel={`${action}: ${title}`}
              hitSlop={8}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: t.actionFill, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}>
              <Txt variant="small" color={t.actionText} style={styles.actionText}>
                {action}
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Smooth>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: radius.m,
    paddingTop: 30,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  hole: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.page,
  },
  title: { fontSize: 20, lineHeight: 23, marginTop: 3, minHeight: 46 },
  amount: { marginTop: 6 },
  /** One height with or without a group, so every tag is the same size. */
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 18 },
  rule: { marginTop: 12, marginBottom: 10 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faces: { flexDirection: 'row', alignItems: 'center', minHeight: 34 },
  face: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: stroke.s,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { lineHeight: 16 },
});
