/**
 * Change an item on the receipt (or add one): its name, how many and the price on the number
 * keys. And GST, a service charge or a discount for the whole bill, as an amount or a percentage.
 */
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { AddOn, Line } from '@/data/receipt';
import { inr, inrExact } from '@/lib/format';
import { colors, fonts, gutter } from '@/theme/tokens';

import { Sheet } from '../Sheet';
import { showToast } from '../Toast';
import { Txt } from '../Txt';

import {
  AmountBox,
  BigButton,
  Cta,
  Keypad,
  PillToggle,
  SheetFoot,
  SheetHead,
  SheetNote,
  Stepper,
  Tiles,
} from './parts';

export type LineEdit = { name: string; qty: number; price: number };

/** Open it with a fresh `key` each time. No `line` means a new one. */
export function LineSheet({
  open,
  line,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  line?: Line;
  onSave: (e: LineEdit) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(line?.name ?? '');
  const [qty, setQty] = useState(line?.qty ?? 1);
  const [amt, setAmt] = useState(line ? String(Math.round(line.price)) : '');
  const [focus, setFocus] = useState(false);
  const price = Number(amt || 0);

  function save() {
    if (!name.trim()) return showToast('Give it a name');
    if (!price) return showToast('Type the price');
    onSave({ name: name.trim(), qty, price });
  }

  return (
    <Sheet open={open} onClose={onClose} label={line ? 'Edit item' : 'Add an item'}>
      <SheetHead title={line ? 'Edit item' : 'Add an item'} onClose={onClose} />
      <TextInput
        value={name}
        onChangeText={setName}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder="What was it?"
        placeholderTextColor={colors.inkHint}
        accessibilityLabel="Item name"
        maxLength={60}
        autoCapitalize="sentences"
        style={[styles.name, focus && { borderColor: colors.line }]}
      />
      <View style={styles.qty}>
        <Txt variant="lead">How many</Txt>
        <Stepper
          shown={String(qty)}
          what="of it"
          canLess={qty > 1}
          canMore={qty < 99}
          onLess={() => setQty(qty - 1)}
          onMore={() => setQty(qty + 1)}
        />
      </View>
      <AmountBox value={amt} />
      <Txt variant="label" color={colors.inkHint} style={styles.each}>
        {qty > 1 && price ? `${inr(price / qty)} each` : ' '}
      </Txt>
      <Keypad value={amt} onChange={setAmt} />
      <SheetFoot>
        {line ? (
          <>
            {onDelete ? <BigButton label="Delete" onPress={onDelete} /> : null}
            <BigButton label="Save" lime onPress={save} />
          </>
        ) : (
          <Cta label="Add item" onPress={save} />
        )}
      </SheetFoot>
    </Sheet>
  );
}

const ADD_ON: Record<AddOn, { title: string; note: string; picks: number[] }> = {
  tax: { title: 'GST', note: 'Shared by what each person had', picks: [5, 12, 18] },
  service: { title: 'Service charge', note: 'Shared by what each person had', picks: [5, 10] },
  discount: { title: 'Discount', note: 'Comes off by what each person had', picks: [10, 15, 20] },
};

export const addOnTitle = (k: AddOn) => ADD_ON[k].title;

/** An add-on as it's saved: the amount, and the rate when it was given as a percentage. */
export type AddOnValue = { amount: number; rate?: number };

const pctOf = (items: number, rate: number) => Math.round(items * rate) / 100;
const trim = (n: number) => String(Math.round(n * 100) / 100);

/**
 * GST, service charge or a discount for the whole bill, as an amount (₹117) or a percentage of
 * the items (5%), which then follows them. Open it with a fresh `key` each time.
 */
export function AddOnSheet({
  open,
  kind,
  value,
  items,
  fromScan = false,
  onSave,
  onClose,
}: {
  open: boolean;
  kind: AddOn;
  value: AddOnValue;
  /** What the items add up to, for a percentage. */
  items: number;
  /** It was read off the receipt. */
  fromScan?: boolean;
  /** Zero takes it off the bill. */
  onSave: (v: AddOnValue) => void;
  onClose: () => void;
}) {
  const { title, note, picks } = ADD_ON[kind];
  const had = value.amount > 0;
  const [mode, setMode] = useState<'pct' | 'amt'>(value.rate !== undefined || !had ? 'pct' : 'amt');
  const [pct, setPct] = useState(value.rate !== undefined ? trim(value.rate) : '');
  const [amt, setAmt] = useState(
    had && value.rate === undefined ? String(Math.round(value.amount)) : '',
  );
  const rate = Number(pct || 0);
  const amount = mode === 'pct' ? pctOf(items, rate) : Number(amt || 0);

  function switchTo(m: 'pct' | 'amt') {
    // Carry the number across, so 5% becomes ₹117 and back.
    if (m === 'amt' && rate) setAmt(String(Math.round(amount)));
    if (m === 'pct' && amount && items) setPct(trim((amount / items) * 100));
    setMode(m);
  }

  function save() {
    if (!amount && !had) {
      return showToast(mode === 'pct' ? 'Pick or type a percentage' : 'Type the amount');
    }
    if (mode === 'pct' && rate > 100) return showToast('That’s more than 100%');
    if (kind === 'discount' && amount > items) return showToast('That’s more than the items');
    onSave(mode === 'pct' ? { amount, rate } : { amount });
  }

  const sum =
    mode === 'pct'
      ? `${rate ? trim(rate) : 0}% of ${inrExact(items)} = ${inrExact(amount)}`
      : amount && items
        ? `That’s ${trim((amount / items) * 100)}% of ${inrExact(items)}`
        : ' ';

  return (
    <Sheet open={open} onClose={onClose} label={title} tall>
      <SheetHead title={title} onClose={onClose} />
      {fromScan ? <SheetNote>Read from the receipt. Change it if it’s wrong.</SheetNote> : null}
      <PillToggle
        options={[
          ['pct', '% of the items'],
          ['amt', '₹ amount'],
        ]}
        value={mode}
        onChange={switchTo}
        label={`${title} as a percentage or an amount`}
      />
      <AmountBox value={mode === 'pct' ? pct : amt} unit={mode === 'pct' ? '%' : '₹'} />
      <Txt variant="label" color={colors.inkSoft} style={styles.each}>
        {sum}
      </Txt>
      <Txt variant="small" color={colors.inkHint} style={styles.each}>
        {note}
      </Txt>
      {mode === 'pct' ? (
        <Tiles
          tiles={picks.map((p) => ({ label: `${p}%`, value: p, shown: inrExact(pctOf(items, p)) }))}
          value={rate}
          onPick={(v) => setPct(String(v))}
        />
      ) : null}
      <Keypad
        value={mode === 'pct' ? pct : amt}
        onChange={mode === 'pct' ? setPct : setAmt}
        decimal={mode === 'pct'}
      />
      <View style={{ flex: 1 }} />
      <SheetFoot>
        {had ? (
          <>
            <BigButton label="Remove" onPress={() => onSave({ amount: 0 })} />
            <BigButton label="Save" lime onPress={save} />
          </>
        ) : (
          <Cta label={`Add ${title === 'GST' ? 'GST' : title.toLowerCase()}`} onPress={save} />
        )}
      </SheetFoot>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  name: {
    height: 46,
    marginTop: 6,
    marginHorizontal: gutter,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.chipEdge,
    borderRadius: 12,
    backgroundColor: colors.paper,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginHorizontal: gutter,
    paddingVertical: 4,
    paddingLeft: 14,
    paddingRight: 4,
    borderWidth: 1.5,
    borderColor: colors.chipEdge,
    borderRadius: 12,
  },
  each: { textAlign: 'center', fontSize: 13, minHeight: 18 },
});
