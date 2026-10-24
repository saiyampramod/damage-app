/** Who paid: pick a payer, then "You paid…" with the amount on the number keys. */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { nameOf } from '@/data/quick';
import type { PersonId } from '@/data/types';
import { inr } from '@/lib/format';
import { colors } from '@/theme/tokens';

import { PeopleSticker } from '../ChatRow';
import { Sheet } from '../Sheet';
import { Txt } from '../Txt';

import { AmountBox, BigButton, Face, Keypad, SheetFoot, SheetHead, Tiles } from './parts';

/** "Who paid?": everyone on the bill who hasn't been added as a payer yet. */
export function PayerSheet({
  open,
  people,
  onPick,
  onClose,
}: {
  open: boolean;
  people: PersonId[];
  onPick: (p: PersonId) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Who paid?">
      <SheetHead title="Who paid?" onClose={onClose} />
      <ScrollView style={{ maxHeight: 420 }}>
        {people.map((p, i) => (
          <Pressable
            key={p}
            onPress={() => onPick(p)}
            accessibilityRole="button"
            accessibilityLabel={`${nameOf(p)} paid`}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
            {i ? <View style={styles.rule} /> : null}
            <PeopleSticker id={p} index={i} />
            <Txt variant="rowTitle" numberOfLines={1} style={{ flex: 1 }}>
              {nameOf(p)}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ height: 8 }} />
    </Sheet>
  );
}

/**
 * "You paid…": the amount, quick tiles for the full bill, what's left and half, and the keys.
 * Nobody can have paid more than the bill less what the others paid: past that the amount turns
 * red, one short underlined line in black says "Use max ₹X" (tap it to use that), and Save stays off. Short and
 * on one line, in a space that's always kept, so nothing jumps (the founder's call). Open it with
 * a fresh `key` each time.
 */
export function PaidSheet({
  open,
  person,
  total,
  others,
  start,
  onSave,
  onClose,
}: {
  open: boolean;
  person: PersonId;
  /** The whole bill. */
  total: number;
  /** What everyone else has paid already. */
  others: number;
  /** The amount to start from: what they paid, or what's left. */
  start: number;
  onSave: (n: number) => void;
  onClose: () => void;
}) {
  const [amt, setAmt] = useState(start > 0 ? String(Math.round(start)) : '');
  const [fresh, setFresh] = useState(start > 0);
  const room = Math.round(total - others);
  const half = Math.round(total / 2);
  const tiles = [
    { label: 'Full bill', value: Math.round(total) },
    ...(room > 0 && room !== Math.round(total) ? [{ label: 'What’s left', value: room }] : []),
    { label: 'Half', value: half },
  ]
    .filter((t) => t.value <= room)
    .map((t) => ({ ...t, shown: inr(t.value) }));
  const n = Number(amt || 0);
  // The most this person can have paid: the bill less what everyone else already paid.
  const most = Math.max(0, room);
  const over = n > most;
  const useMost = () => {
    setAmt(String(most));
    setFresh(false);
  };

  return (
    <Sheet open={open} onClose={onClose} label={`${nameOf(person)} paid`} tall>
      <SheetHead
        title={`${nameOf(person)} paid…`}
        lead={<Face id={person} size={32} />}
        onClose={onClose}
      />
      <AmountBox value={amt} faint={fresh} warn={over} />
      {/* Always the same height, so nothing below moves when it shows up. */}
      <View style={styles.limit}>
        {over ? (
          most > 0 ? (
            <Pressable
              onPress={useMost}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Too much. Use the most, ${inr(most)}`}
              accessibilityLiveRegion="polite"
              style={({ pressed }) => [styles.limitLink, pressed && { opacity: 0.7 }]}>
              <Txt variant="label" style={[styles.limitText, styles.limitUnderline]}>
                Use max {inr(most)}
              </Txt>
            </Pressable>
          ) : (
            <Txt variant="label" style={styles.limitText} accessibilityLiveRegion="polite">
              The bill’s already covered
            </Txt>
          )
        ) : null}
      </View>
      {tiles.length ? (
        <Tiles
          tiles={tiles}
          value={n}
          onPick={(v) => {
            setAmt(String(v));
            setFresh(false);
          }}
        />
      ) : null}
      <Keypad
        value={amt}
        fresh={fresh}
        onChange={(v) => {
          setAmt(v);
          setFresh(false);
        }}
      />
      <View style={{ flex: 1 }} />
      <SheetFoot>
        <BigButton label="Cancel" onPress={onClose} />
        <BigButton label="Save" lime disabled={!n || over} onPress={() => (over ? undefined : onSave(n))} />
      </SheetFoot>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  limit: { height: 34, marginTop: -8, marginBottom: 4, alignItems: 'center', justifyContent: 'center' },
  limitLink: { height: 30, paddingHorizontal: 12, justifyContent: 'center' },
  limitText: { fontSize: 13.5, lineHeight: 18 },
  limitUnderline: { textDecorationLine: 'underline' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 74,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  rule: {
    position: 'absolute',
    top: 0,
    left: 82,
    right: 0,
    height: 1,
    backgroundColor: colors.hairline,
  },
});
