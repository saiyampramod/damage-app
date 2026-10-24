/**
 * One item on the bill while it's being tagged: its name (tap to change it) and price, chips for
 * how many people, how many were ordered and whether it's all claimed, then a row of faces:
 * Add, Me, and everyone on it with how many they had. Tap a face once to arm it ("Remove?"),
 * again to take them off. The arrow opens what each person's part of it costs.
 */
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ME } from '@/data/mock';
import { nameOf } from '@/data/quick';
import { had, isTagged, leftOf, units, whoHad, type Line } from '@/data/receipt';
import type { PersonId } from '@/data/types';
import { inr } from '@/lib/format';
import { colors, gutter, shadow, stroke } from '@/theme/tokens';

import { Icon } from '../Icon';
import { Txt } from '../Txt';

import { Badge, Chip, Face, ShareLine } from './parts';

function Slot({
  label,
  onPress,
  accessibilityLabel,
  warn = false,
  children,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  warn?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.slot, pressed && { transform: [{ scale: 0.94 }] }]}>
      <View style={styles.slotFace}>{children}</View>
      <Txt
        variant="small"
        color={warn ? colors.outText : colors.inkSoft}
        numberOfLines={1}
        style={styles.slotName}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function ItemCard({
  line: l,
  people,
  open,
  armed,
  flash,
  onEdit,
  onSplit,
  onMe,
  onFace,
  onToggle,
}: {
  line: Line;
  /** Everyone on the bill, in order. */
  people: PersonId[];
  /** The breakdown under it is showing. */
  open: boolean;
  /** Someone on it was tapped once and is waiting for the second tap. */
  armed?: PersonId;
  /** Just jumped to: a quick lime wash. */
  flash: boolean;
  onEdit: () => void;
  onSplit: () => void;
  onMe: () => void;
  onFace: (p: PersonId) => void;
  onToggle: () => void;
}) {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  const ids = people.filter((p) => whoHad(l).includes(p));
  const many = l.qty > 1;
  const left = leftOf(l);
  const done = isTagged(l);
  const state = !ids.length ? 'none' : done ? 'done' : 'part';
  const everyone = ids.length === people.length;

  return (
    <View
      style={[
        styles.card,
        state === 'part' && { boxShadow: shadow.s },
        state === 'done' && styles.done,
        flash && { backgroundColor: colors.highlightSoft },
      ]}>
      <View style={styles.head}>
        <Pressable
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${l.name}`}
          hitSlop={{ top: 10, bottom: 10 }}
          style={{ flex: 1, minWidth: 0 }}>
          <Txt variant="rowTitle" numberOfLines={1}>
            {l.name}
          </Txt>
        </Pressable>
        <Txt variant="bodyStrong" style={{ fontSize: 17, lineHeight: 22 }}>
          {inr(l.price)}
        </Txt>
        <Pressable
          onPress={onToggle}
          disabled={!ids.length}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled: !ids.length }}
          accessibilityLabel={`Show the split for ${l.name}`}
          style={[
            styles.more,
            open && { borderColor: colors.line, transform: [{ rotate: '180deg' }] },
            !ids.length && { opacity: 0.3 },
          ]}>
          <Icon name="down" size={14} strokeWidth={3} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.chips}>
        <Chip
          text={
            ids.length ? `${ids.length} ${ids.length === 1 ? 'person' : 'people'}` : 'Nobody yet'
          }
        />
        <Chip text={`Qty ${l.qty}`} />
        {state === 'part' ? <Chip tone="dark" text={`${units(left)} left`} /> : null}
        {state === 'done' ? <Chip tone="ok" text="Tagged" /> : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripIn}>
        <Slot
          label={everyone ? (many ? 'Split' : 'Edit') : 'Add'}
          onPress={onSplit}
          accessibilityLabel={
            everyone ? `Edit the split for ${l.name}` : `Add someone to ${l.name}`
          }>
          <View style={styles.add}>
            <Icon
              name={everyone ? 'tune' : 'plus'}
              size={18}
              strokeWidth={2.6}
              color={colors.ink}
            />
          </View>
        </Slot>
        {!had(l, ME) ? (
          <Slot
            label="Me"
            onPress={onMe}
            accessibilityLabel={
              many && left > 1e-6
                ? `Choose how many ${l.name} you had`
                : `Add yourself to ${l.name}`
            }>
            {/* Less faded than before (0.45 was too dull, the founder's call), still lighter than
                someone who's on the item. */}
            <View style={styles.meIdle}>
              <Face id={ME} />
            </View>
          </Slot>
        ) : null}
        {ids.map((p) => {
          const warn = armed === p;
          return (
            <Slot
              key={p}
              label={warn ? 'Remove?' : p === ME ? 'Me' : nameOf(p)}
              warn={warn}
              onPress={() => onFace(p)}
              accessibilityLabel={
                warn
                  ? `Tap again to take ${nameOf(p)} off ${l.name}`
                  : `Take ${nameOf(p)} off ${l.name}`
              }>
              <Face id={p} ring={warn ? 'warn' : 'on'} />
              <View style={styles.badge}>
                <Badge text={warn ? '×' : units(l.tags[p])} warn={warn} />
              </View>
            </Slot>
          );
        })}
      </ScrollView>

      {open && ids.length ? (
        <View style={styles.split}>
          {ids.map((p) => (
            <ShareLine
              key={p}
              label={`${nameOf(p)}${many ? ` × ${units(l.tags[p])}` : ''}`}
              value={inr((l.price * l.tags[p]) / l.qty)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  meIdle: { opacity: 0.75 },
  card: {
    marginHorizontal: gutter,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.paper,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 16,
  },
  done: { boxShadow: `4px 4px 0px ${colors.highlight}` },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  more: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.chipEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  strip: { marginTop: 10, marginHorizontal: -4 },
  stripIn: { gap: 10, paddingHorizontal: 4, paddingTop: 5, paddingBottom: 2 },
  slot: { alignItems: 'center', gap: 6, minWidth: 52 },
  slotFace: { width: 51, height: 51, alignItems: 'center', justifyContent: 'center' },
  slotName: { maxWidth: 56 },
  add: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { position: 'absolute', right: -4, bottom: -3 },
  split: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.chipEdge,
    borderRadius: 12,
  },
});
