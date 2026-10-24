/**
 * A person or a group as one line of People's chat list (like WhatsApp's chats). Both carry the
 * same things: the name, what happened last, when it happened, where you stand (+₹ green owes
 * you, −₹ red you owe) and a lime count of bills waiting on you, like an unread badge.
 *
 * They look different on purpose, both in Damage's own style (the founder's pick, "stickers and
 * passes"): a person is a sticker (their round avatar with a black ring, a small hard shadow and
 * a slight tilt, alternating down the list); a group is its pass from Home, flat, at exactly a
 * person's height (`group/GroupPass` `PassLine`). Tap to open the person or the group.
 *
 * Tried and rejected for groups here: the full pass with its shadow (popped too much), the pass
 * shrunk to an avatar, a colour circle, and people as name badges.
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Chat } from '@/data/chats';
import type { PersonId } from '@/data/types';
import { billById } from '@/data/store';
import { chatTime, inr } from '@/lib/format';
import { colors, fonts, gutter, radius, shadow, stroke } from '@/theme/tokens';

import { PASS_INSET, PassLine } from './group/GroupPass';
import { PersonSticker } from './ledger/parts';
import { Signed } from './money/Signed';
import { Txt } from './Txt';

const AVATAR = 50;
/** One line's height, a person's or a group's. */
export const ROW = 74;

function label(c: Chat) {
  const square = Math.abs(c.amount) < 0.5;
  const money = square
    ? c.done
      ? 'settled'
      : 'square'
    : c.amount > 0
      ? `${c.kind === 'group' ? 'you get back' : 'owes you'} ${inr(c.amount)}`
      : `you owe ${inr(c.amount)}`;
  return `${c.kind === 'group' ? 'Group ' : ''}${c.name}, ${money}. ${c.preview}. ${chatTime(c.date)}${c.waiting ? `. ${c.waiting} waiting on you` : ''}`;
}

/**
 * A person as a sticker, the People look: their round avatar with a black ring, a small hard
 * shadow and a slight tilt that alternates down a list (`index`). Used wherever people are a
 * list to pick from, so they look the same as on People (Who paid, the payer sheet).
 */
export function PeopleSticker({ id, index = 0, size = AVATAR }: { id: PersonId; index?: number; size?: number }) {
  return (
    <View
      style={[
        styles.sticker,
        { width: size, height: size, borderRadius: size / 2, transform: [{ rotate: index % 2 ? '3deg' : '-3deg' }] },
      ]}>
      <PersonSticker id={id} size={size - stroke.s * 2} />
    </View>
  );
}

/** The name and what happened last, then the day, the amount and the count. */
function Content({ c }: { c: Chat }) {
  const square = Math.abs(c.amount) < 0.5;
  return (
    <>
      <View style={styles.text}>
        <Txt variant="rowTitle" numberOfLines={1} color={c.done ? colors.inkMuted : colors.ink}>
          {c.name}
        </Txt>
        <Txt variant="rowSub" color={colors.inkSoft} numberOfLines={1}>
          {c.preview}
        </Txt>
      </View>
      <View style={styles.right}>
        <Txt
          variant="small"
          color={c.waiting ? colors.ink : colors.inkHint}
          style={c.waiting ? { fontFamily: fonts.bodyHeavy } : null}>
          {chatTime(c.date)}
        </Txt>
        <View style={styles.bottom}>
          {c.waiting ? (
            <View style={styles.badge}>
              <Txt variant="micro" style={styles.badgeText}>
                {c.waiting}
              </Txt>
            </View>
          ) : null}
          {square ? (
            <Txt variant="small" color={colors.inkHint}>
              {c.done ? 'Settled' : 'Square'}
            </Txt>
          ) : (
            <Signed value={c.amount} size={15} />
          )}
        </View>
      </View>
    </>
  );
}

export function ChatRow({
  chat: c,
  first = false,
  index = 0,
}: {
  chat: Chat;
  /** No rule above it: the top of the list, or straight after a group's pass. */
  first?: boolean;
  /** Its place in the list, which way the sticker tilts. */
  index?: number;
}) {
  // Reads the example data, which changes in place: not memoised by the React Compiler.
  'use no memo';
  const group = c.kind === 'group' ? billById(c.id) : undefined;
  if (group) {
    return (
      <PassLine group={group} height={ROW} muted={c.done} label={label(c)}>
        <Content c={c} />
      </PassLine>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(`/person/${c.id}`)}
      accessibilityRole="button"
      accessibilityLabel={label(c)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
      {first ? null : <View style={styles.rule} />}
      <PeopleSticker id={c.id} index={index} />
      <Content c={c} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    height: ROW,
    paddingLeft: gutter,
    // The same right edge as a group's pass content, so the amounts line up down the list.
    paddingRight: gutter + PASS_INSET,
  },
  rule: {
    position: 'absolute',
    top: 0,
    left: gutter + AVATAR + 14,
    right: 0,
    height: 1,
    backgroundColor: colors.hairline,
  },
  sticker: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: stroke.s,
    borderColor: colors.line,
    boxShadow: shadow.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: { flex: 1, minWidth: 0, gap: 3 },
  right: { alignItems: 'flex-end', gap: 5, maxWidth: 120 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 14, color: colors.ink },
});
