/** The small sheets on a receipt bill: what still needs tagging, your share so far, and reopening it. */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ME } from '@/data/mock';
import { nameOf } from '@/data/quick';
import { breakdown, had, leftOf, units, whoHad, type Line, type Receipt } from '@/data/receipt';
import type { PersonId } from '@/data/types';
import { inr } from '@/lib/format';
import { colors, gutter } from '@/theme/tokens';

import { BillTag } from '../ledger/parts';
import { Sheet } from '../Sheet';
import { Txt } from '../Txt';

import { BigButton, Face, SheetFoot, SheetHead, SheetNote, ShareLine } from './parts';

const money = (v: number) => `${v < 0 ? '−' : ''}${inr(v)}`;

/** One person's share, line by line, then what they paid. */
export function ShareLines({
  receipt,
  people,
  person,
  paidLabel,
}: {
  receipt: Receipt;
  people: PersonId[];
  person: PersonId;
  /** The words for what they paid ("You paid", "Already paid"). */
  paidLabel: string;
}) {
  const { rows, total } = breakdown(receipt, people, person);
  const paid = receipt.paid[person] ?? 0;
  return (
    <>
      {rows.map((r) => (
        <ShareLine key={r.label} label={r.label} value={money(r.value)} />
      ))}
      <ShareLine
        total
        label={person === ME ? 'Your share' : `${nameOf(person)}’s share`}
        value={inr(total)}
      />
      {paid ? <ShareLine label={paidLabel} value={inr(paid)} /> : null}
    </>
  );
}

/** "Needs tagging": the items with some or all of it unclaimed. Tap one to jump to it. */
export function NeedsTaggingSheet({
  open,
  lines,
  onJump,
  onClose,
}: {
  open: boolean;
  lines: Line[];
  onJump: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Needs tagging">
      <SheetHead title="Needs tagging" onClose={onClose} />
      {lines.length ? (
        <ScrollView
          style={{ maxHeight: 440 }}
          contentContainerStyle={{ paddingHorizontal: gutter }}>
          {lines.map((l, i) => (
            <Pressable
              key={l.id}
              onPress={() => onJump(l.id)}
              accessibilityRole="button"
              accessibilityLabel={`${l.name}, ${inr(l.price)}`}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
              {i ? <View style={styles.rule} /> : null}
              <BillTag tone="owe" />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Txt variant="rowTitle" numberOfLines={1}>
                  {l.name}
                </Txt>
                <Txt variant="rowSub" color={colors.inkHint}>
                  {whoHad(l).length ? `${units(leftOf(l))} of ${l.qty} left` : 'Not tagged'}
                </Txt>
              </View>
              <Txt variant="rowTitle">{inr(l.price)}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <SheetNote>Every item is tagged.</SheetNote>
      )}
      <View style={{ height: 10 }} />
    </Sheet>
  );
}

/** "My share": what you've had so far, your part of GST and service, and what you've paid. */
export function MyShareSheet({
  open,
  receipt,
  people,
  onClose,
}: {
  open: boolean;
  receipt: Receipt;
  people: PersonId[];
  onClose: () => void;
}) {
  const mine = receipt.lines.some((l) => had(l, ME));
  return (
    <Sheet open={open} onClose={onClose} label="My share">
      <SheetHead title="My share" lead={<Face id={ME} size={32} />} onClose={onClose} />
      <View style={styles.mine}>
        {mine ? (
          <ShareLines receipt={receipt} people={people} person={ME} paidLabel="You’ve paid" />
        ) : (
          <Txt variant="body" color={colors.inkSoft}>
            Nothing tagged to you yet.
          </Txt>
        )}
      </View>
      <View style={{ height: 10 }} />
    </Sheet>
  );
}

/**
 * "Reopen this bill?": unlocks tagging to fix a mistake, settled or not. Anything already paid
 * back stays as paid, and settling up again works out only the difference.
 */
export function ReopenSheet({
  open,
  paid = 0,
  onReopen,
  onClose,
}: {
  open: boolean;
  /** What's already been paid back on the bill. */
  paid?: number;
  onReopen: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Reopen this bill?">
      <SheetHead title="Reopen this bill?" onClose={onClose} />
      <SheetNote>
        {paid > 0
          ? `This unlocks tagging again so you can fix a mistake. The ${inr(paid)} already paid stays as paid, and you’ll only settle the difference once you’re done.`
          : 'This unlocks tagging again so you can fix a mistake. You’ll settle up again once you’re done.'}
      </SheetNote>
      <SheetFoot>
        <BigButton label="Cancel" onPress={onClose} />
        <BigButton label="Reopen" lime onPress={onReopen} />
      </SheetFoot>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  rule: {
    position: 'absolute',
    top: 0,
    left: 52,
    right: 0,
    height: 1,
    backgroundColor: colors.hairline,
  },
  mine: { marginHorizontal: gutter, marginTop: 4 },
});
