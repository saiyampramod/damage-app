/**
 * "Who had Lemonade?", like the web app's quantity split: pick who had an item and split it
 * evenly, or (when more than one was ordered) say how many each person had. The bar and the
 * words under it show what's still unclaimed. Plus the quick "How many were yours?" behind Me.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { ME } from '@/data/mock';
import { nameOf } from '@/data/quick';
import {
  each,
  evenAmong,
  evenWhole,
  leftOf,
  units,
  whoHad,
  withUnits,
  type Line,
  type Tags,
} from '@/data/receipt';
import type { PersonId } from '@/data/types';
import { inr } from '@/lib/format';
import { colors, gutter, radius, shadow, stroke } from '@/theme/tokens';

import { Icon } from '../Icon';
import { Sheet } from '../Sheet';
import { Txt } from '../Txt';

import {
  BigButton,
  Face,
  PillToggle,
  SheetFoot,
  SheetHead,
  SheetNote,
  SplitBar,
  Stepper,
} from './parts';

type Mode = 'even' | 'custom';

/** What the bar says, in words: green when it's all claimed, black with a dot while it isn't. */
function splitWords(
  qty: number,
  sel: PersonId[],
  custom: boolean,
  assigned: number,
): { text: string; done: boolean } {
  if (custom) {
    if (Math.abs(assigned - qty) < 1e-6)
      return { text: `All ${units(qty)} accounted for`, done: true };
    return { text: `${units(qty - assigned)} of ${units(qty)} still unassigned`, done: false };
  }
  if (!sel.length) return { text: 'Nobody’s on this yet', done: false };
  if (sel.length === 1)
    return {
      text: sel[0] === ME ? 'All of it on you' : `All of it on ${nameOf(sel[0])}`,
      done: true,
    };
  return { text: `Split evenly between ${sel.length}`, done: true };
}

/** Open it with a fresh `key` each time so it starts from the item as it is now. */
export function SplitSheet({
  open,
  line: l,
  people,
  onDone,
  onClose,
}: {
  open: boolean;
  line: Line;
  /** Everyone on the bill, you first. */
  people: PersonId[];
  onDone: (t: Tags) => void;
  onClose: () => void;
}) {
  const { height } = useWindowDimensions();
  const many = l.qty > 1;
  const [mode, setMode] = useState<Mode>(many && l.mode === 'units' ? 'custom' : 'even');
  const [sel, setSel] = useState<PersonId[]>(() => people.filter((p) => whoHad(l).includes(p)));
  const [qty, setQty] = useState<Record<PersonId, number>>(() =>
    l.mode === 'units' ? { ...l.tags } : {},
  );

  const custom = many && mode === 'custom';
  const q = (p: PersonId) => qty[p] ?? 0;
  const assigned = sel.reduce((a, p) => a + q(p), 0);
  const room = l.qty - assigned;
  const all = sel.length === people.length;
  const words = splitWords(l.qty, sel, custom, assigned);
  const amount = (p: PersonId) =>
    !sel.includes(p) ? 0 : custom ? q(p) * each(l) : l.price / sel.length;
  const inOrder = (ids: PersonId[]) => people.filter((p) => ids.includes(p));

  /** Whole units as evenly as they go between these people. */
  const spread = (ids: PersonId[]) => {
    const w = evenWhole(l.qty, ids.length);
    return Object.fromEntries(ids.map((p, i) => [p, w[i] ?? 0]));
  };

  function pickMode(m: Mode) {
    if (m === mode) return;
    setQty(m === 'custom' ? spread(sel) : {});
    setMode(m);
  }
  function everyone() {
    setSel(all ? [] : people);
    if (custom) setQty(all ? {} : spread(people));
  }
  function toggle(p: PersonId) {
    if (sel.includes(p)) {
      setSel(sel.filter((x) => x !== p));
      const next = { ...qty };
      delete next[p];
      setQty(next);
    } else setSel(inOrder([...sel, p]));
  }
  function step(p: PersonId, d: number) {
    const n = Math.max(0, Math.min(q(p) + d, q(p) + room));
    setQty({ ...qty, [p]: n });
    if (!sel.includes(p)) setSel(inOrder([...sel, p]));
  }
  function done() {
    if (custom) {
      let t: Tags = { mode: 'units', tags: {} };
      for (const p of sel) t = withUnits({ ...l, ...t }, p, q(p));
      onDone(t);
    } else onDone(evenAmong(l, sel));
  }

  return (
    <Sheet open={open} onClose={onClose} label={`Who had ${l.name}?`}>
      <SheetHead title={`Who had ${l.name}?`} onClose={onClose} />
      {many ? (
        <PillToggle<Mode>
          options={[
            ['even', 'Split evenly'],
            ['custom', 'Someone had more'],
          ]}
          value={mode}
          onChange={pickMode}
          label={`How to split ${l.name}`}
        />
      ) : null}
      <ScrollView
        style={{ maxHeight: Math.round(height * 0.5) }}
        keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={everyone}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: all }}
          accessibilityLabel={`Everyone had this, ${sel.length} of ${people.length}`}
          style={[styles.allRow, all && styles.rowOn]}>
          <View style={[styles.box, all && { backgroundColor: colors.ticked }]}>
            {all ? <Icon name="check" size={13} strokeWidth={3.4} color={colors.ink} /> : null}
          </View>
          <Txt variant="rowTitle" style={{ flex: 1, fontSize: 15.5 }}>
            Everyone had this
          </Txt>
          <Txt variant="small" color={colors.inkHint}>
            {sel.length}/{people.length}
          </Txt>
        </Pressable>
        <View style={styles.rows}>
          {people.map((p) => {
            const picked = sel.includes(p);
            const on = custom ? q(p) > 0 : picked;
            const sub = on
              ? `${inr(amount(p))}${custom ? ` · ${units(q(p))} of ${units(l.qty)}` : ''}`
              : custom
                ? `0 of ${units(l.qty)}`
                : '—';
            const who = (
              <>
                <Face id={p} size={38} />
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <Txt variant="rowTitle" numberOfLines={1} style={{ fontSize: 15.5 }}>
                    {nameOf(p)}
                  </Txt>
                  <Txt variant="small" color={colors.inkSoft} style={styles.sub}>
                    {sub}
                  </Txt>
                </View>
              </>
            );
            if (custom)
              return (
                <View key={p} style={[styles.row, on && styles.rowOn]}>
                  {who}
                  <Stepper
                    outlined
                    shown={units(q(p))}
                    what={`${l.name} for ${nameOf(p)}`}
                    canLess={q(p) > 0}
                    canMore={room > 1e-6}
                    onLess={() => step(p, -1)}
                    onMore={() => step(p, 1)}
                  />
                </View>
              );
            return (
              <Pressable
                key={p}
                onPress={() => toggle(p)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${nameOf(p)} had ${l.name}`}
                style={[styles.row, on && styles.rowOn]}>
                {who}
                <View style={[styles.circle, on && { backgroundColor: colors.ticked }]}>
                  <Icon
                    name={on ? 'check' : 'plus'}
                    size={14}
                    strokeWidth={on ? 3.2 : 3}
                    color={colors.ink}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.foot}>
          <SplitBar qty={l.qty} slices={sel.map((p) => [p, custom ? q(p) : l.qty / sel.length])} />
          <View style={styles.status} accessibilityLiveRegion="polite">
            {words.done ? null : <View style={styles.dot} />}
            <Txt
              variant="label"
              color={words.done ? colors.inText : colors.ink}
              style={{ fontSize: 13 }}>
              {words.text}
            </Txt>
          </View>
        </View>
      </ScrollView>
      <SheetFoot>
        <BigButton label="Cancel" onPress={onClose} />
        <BigButton label="Done" lime onPress={done} />
      </SheetFoot>
    </Sheet>
  );
}

/** Me on an item with more than one: pick how many were yours. */
export function UnitsSheet({
  open,
  line: l,
  onPick,
  onClose,
}: {
  open: boolean;
  line: Line;
  onPick: (n: number) => void;
  onClose: () => void;
}) {
  const max = Math.round((leftOf(l) + (l.tags[ME] ?? 0)) * 1e4) / 1e4;
  const options: number[] = [];
  for (let n = 1; n <= Math.floor(max + 1e-6); n++) options.push(n);
  if (max - Math.floor(max + 1e-6) > 1e-6) options.push(max);

  return (
    <Sheet open={open} onClose={onClose} label="How many were yours?">
      <SheetHead title="How many were yours?" onClose={onClose} />
      <SheetNote>{`${l.name} · ${units(leftOf(l))} of ${l.qty} unclaimed`}</SheetNote>
      <View style={styles.units}>
        {options.map((n) => (
          <Pressable
            key={n}
            onPress={() => onPick(n)}
            accessibilityRole="button"
            accessibilityLabel={`${units(n)} of ${l.name}, ${inr(each(l) * n)}`}
            style={({ pressed }) => [styles.unit, pressed && styles.unitPressed]}>
            <Txt variant="card">{units(n)}</Txt>
            <Txt variant="small" color={colors.inkHint}>
              {inr(each(l) * n)}
            </Txt>
          </Pressable>
        ))}
      </View>
      <SheetFoot>
        <BigButton label="Cancel" onPress={onClose} />
      </SheetFoot>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    marginTop: 10,
    marginHorizontal: gutter,
    paddingHorizontal: 14,
    borderWidth: stroke.s,
    borderColor: colors.chipEdge,
    borderRadius: 14,
    backgroundColor: colors.paper,
  },
  rowOn: { borderColor: colors.line, backgroundColor: colors.highlightSoft },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rows: { gap: 8, marginTop: 8, marginHorizontal: gutter },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 62,
    paddingLeft: 12,
    paddingRight: 8,
    borderWidth: stroke.s,
    borderColor: colors.chipEdge,
    borderRadius: 14,
    backgroundColor: colors.paper,
  },
  sub: { fontSize: 12.5 },
  circle: {
    width: 30,
    height: 30,
    marginRight: 2,
    borderRadius: 15,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foot: { marginTop: 14, marginHorizontal: gutter, marginBottom: 4 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.ink },
  units: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: gutter,
    paddingTop: 12,
  },
  unit: {
    width: '22.4%',
    height: 66,
    gap: 2,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
    boxShadow: shadow.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitPressed: { transform: [{ translateX: 1 }, { translateY: 1 }], boxShadow: 'none' },
});
