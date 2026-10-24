/**
 * A group as a pass (the founder's pick): a white ticket with a stub in the group's own colour
 * (`groupColor`, chosen when the group is made) carrying its kind icon, a perforated line with two
 * punched notches, then the name, who's in and where you stand.
 *
 * - `GroupPass`: Home's Groups row. The name in poster type, people and bills under it, the faces
 *   and the amount (+₹ green you get back, −₹ red you owe, with the words) along the bottom.
 * - `GroupPassRow`: the same pass, one line tall: stub, name, "Trip · 6 people · 3 bills", amount.
 *   Same colour, same notches, so it reads as the same thing.
 * - `PassLine`: the pass as a line of People's chat list (WhatsApp-style, people and groups
 *   together), a person's height, flat (no shadow). People there are stickers (`ChatRow`).
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { ME, people } from '@/data/mock';
import { groupColor, groupView } from '@/data/store';
import type { Bill, PersonId } from '@/data/types';
import { inr } from '@/lib/format';
import { colors, fonts, gutter, shadow, stroke } from '@/theme/tokens';

import { Icon } from '../Icon';
import { PersonSticker } from '../ledger/parts';
import { Signed, wayWords } from '../money/Signed';
import { Txt } from '../Txt';

import { KIND_ICON, KIND_WORD } from './kinds';

export const PASS_WIDTH = 248;
const PASS_HEIGHT = 152;
const STUB = 64;
const ROW_STUB = 48;
const NOTCH = 20;


/** The others in a group (you're in every one), account people only. */
export const faceIds = (g: Bill): PersonId[] =>
  g.people.filter((p) => p !== ME && !people[p]?.guest);

/** Where the perforation sits from the pass's outer left edge, for a stub this wide. */
const cutAt = (stub: number) => stroke.m + stub + stroke.m / 2;

/** The perforation: a dashed line down the full height. */
function Perforation() {
  return (
    <View style={styles.perf}>
      <Svg width={stroke.m} height="100%">
        <Line
          x1={stroke.m / 2}
          y1={0}
          x2={stroke.m / 2}
          y2="100%"
          stroke={colors.line}
          strokeWidth={stroke.m}
          strokeDasharray="6 4"
        />
      </Svg>
    </View>
  );
}

/** The two half-circles punched out of the top and bottom edge at the perforation. */
function Notches({ stub }: { stub: number }) {
  const left = cutAt(stub) - NOTCH / 2;
  return (
    <>
      <View pointerEvents="none" style={[styles.notchClip, { left, top: 0 }]}>
        <View style={[styles.notch, { top: -NOTCH / 2 }]} />
      </View>
      <View pointerEvents="none" style={[styles.notchClip, { left, bottom: 0 }]}>
        <View style={[styles.notch, { top: 1 }]} />
      </View>
    </>
  );
}

function label(g: Bill, balance: number, people: number, bills: number) {
  const kind = KIND_WORD[g.groupKind ?? 'outing'];
  const money =
    Math.abs(balance) < 0.5
      ? 'you’re square'
      : balance > 0
        ? `you get back ${inr(balance)}`
        : `you owe ${inr(balance)}`;
  return `${g.name}, ${kind.toLowerCase()}, ${people} people, ${bills} ${bills === 1 ? 'bill' : 'bills'}, ${money}`;
}

/** Home's pass. */
export function GroupPass({ group }: { group: Bill }) {
  // Reads the example data, which changes in place: not memoised by the React Compiler.
  'use no memo';
  const v = groupView(group);
  const ids = faceIds(group);
  const kind = group.groupKind ?? 'outing';
  const n = v.bills.length;
  const shown = ids.length > 4 ? ids.slice(0, 3) : ids;
  const more = ids.length - shown.length;
  return (
    <Pressable
      onPress={() => router.push(`/bill/${group.id}`)}
      accessibilityRole="button"
      accessibilityLabel={label(group, v.balance, ids.length + 1, n)}
      style={({ pressed }) => [styles.pass, v.settled && styles.muted, pressed && styles.pressed]}>
      <View style={[styles.card, styles.cardBig]}>
        <View style={[styles.stub, { width: STUB, backgroundColor: groupColor(group) }]}>
          <Icon name={KIND_ICON[kind]} size={26} strokeWidth={2.4} color={colors.ink} />
          <Txt variant="micro" style={styles.stubWord}>
            {KIND_WORD[kind]}
          </Txt>
        </View>
        <Perforation />
        <View style={styles.body}>
          <Txt numberOfLines={2} style={styles.name}>
            {group.name}
          </Txt>
          <Txt variant="small" color={colors.inkHint} numberOfLines={1} style={{ marginTop: 2 }}>
            {ids.length + 1} people · {n} {n === 1 ? 'bill' : 'bills'}
          </Txt>
          <View style={styles.foot}>
            <View style={styles.faces}>
              {shown.map((id, i) => (
                <View key={id} style={{ marginLeft: i ? -7 : 0, zIndex: 9 - i }}>
                  <PersonSticker id={id} size={24} ring />
                </View>
              ))}
              {more ? (
                <View style={[styles.more, { marginLeft: -7 }]}>
                  <Txt style={styles.moreText} color={colors.onAction}>
                    +{more}
                  </Txt>
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {Math.abs(v.balance) < 0.5 ? (
                <Txt variant="label" color={colors.inkSoft}>
                  Square
                </Txt>
              ) : (
                <>
                  <Signed value={v.balance} size={18} />
                  <Txt variant="small" color={colors.inkSoft} style={{ fontSize: 12 }}>
                    {wayWords(v.balance, { bill: true })}
                  </Txt>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
      <Notches stub={STUB} />
    </Pressable>
  );
}

/**
 * How far a pass line's content sits in from the pass's outer edge (its border, then 12). A
 * person's line on People pads its right side by the same, so the days and amounts of people and
 * groups line up in one column.
 */
export const PASS_INSET = stroke.m + 12;

/**
 * The pass as one line of People's chat list, as tall as a person's line: the same pass as on
 * Home (stub in the group's colour with its kind icon, the perforation, the punched notches, the
 * black edge) but flat, with no hard shadow (the founder's call: the shadow read as an extra
 * border). `children` is the line's content (`ChatRow`).
 */
export function PassLine({
  group,
  height,
  muted = false,
  label,
  children,
}: {
  group: Bill;
  height: number;
  muted?: boolean;
  label: string;
  children: ReactNode;
}) {
  const kind = group.groupKind ?? 'outing';
  return (
    <Pressable
      onPress={() => router.push(`/bill/${group.id}`)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.line, { height }, muted && styles.muted, pressed && styles.pressed]}>
      <View style={[styles.card, styles.cardLine]}>
        <View style={[styles.stub, { width: ROW_STUB, backgroundColor: groupColor(group) }]}>
          <Icon name={KIND_ICON[kind]} size={21} strokeWidth={2.4} color={colors.ink} />
        </View>
        <Perforation />
        <View style={styles.lineBody}>{children}</View>
      </View>
      <Notches stub={ROW_STUB} />
    </Pressable>
  );
}

/** The pass, one line tall. */
export function GroupPassRow({ group }: { group: Bill }) {
  // Reads the example data, which changes in place: not memoised by the React Compiler.
  'use no memo';
  const v = groupView(group);
  const ids = faceIds(group);
  const kind = group.groupKind ?? 'outing';
  const n = v.bills.length;
  return (
    <Pressable
      onPress={() => router.push(`/bill/${group.id}`)}
      accessibilityRole="button"
      accessibilityLabel={label(group, v.balance, ids.length + 1, n)}
      style={({ pressed }) => [styles.rowPass, v.settled && styles.muted, pressed && styles.pressed]}>
      <View style={[styles.card, styles.cardRow]}>
        <View style={[styles.stub, { width: ROW_STUB, backgroundColor: groupColor(group) }]}>
          <Icon name={KIND_ICON[kind]} size={21} strokeWidth={2.4} color={colors.ink} />
        </View>
        <Perforation />
        <View style={styles.rowBody}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="rowTitle" numberOfLines={1}>
              {group.name}
            </Txt>
            <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
              {KIND_WORD[kind]} · {ids.length + 1} people · {n} {n === 1 ? 'bill' : 'bills'}
              {v.settled ? ' · settled' : ''}
            </Txt>
          </View>
          {Math.abs(v.balance) < 0.5 ? (
            <Txt variant="rowSub" color={colors.inkSoft}>
              Square
            </Txt>
          ) : (
            <Signed value={v.balance} />
          )}
        </View>
      </View>
      <Notches stub={ROW_STUB} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pass: { width: PASS_WIDTH, height: PASS_HEIGHT },
  rowPass: { height: 68, marginHorizontal: gutter },
  muted: { opacity: 0.5 },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  card: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  cardBig: { borderRadius: 20, boxShadow: shadow.m },
  cardRow: { borderRadius: 16, boxShadow: shadow.s },
  stub: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  stubWord: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  perf: { width: stroke.m, alignSelf: 'stretch' },
  body: { flex: 1, minWidth: 0, paddingTop: 12, paddingBottom: 11, paddingLeft: 14, paddingRight: 13 },
  name: { fontFamily: fonts.display, fontSize: 19, lineHeight: 23 },
  foot: { marginTop: 'auto', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  faces: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  more: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.avatarRing,
    backgroundColor: colors.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { fontFamily: fonts.bodyHeavy, fontSize: 9.5, lineHeight: 12 },
  rowBody: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 14 },
  line: { marginHorizontal: gutter, marginVertical: 5 },
  cardLine: { borderRadius: 16 },
  lineBody: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, paddingRight: 12 },
  notchClip: { position: 'absolute', width: NOTCH, height: NOTCH / 2 + 1, overflow: 'hidden' },
  notch: {
    position: 'absolute',
    left: 0,
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.page,
  },
});
