import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { DashedLine } from '@/components/DashedLine';
import { Icon } from '@/components/Icon';
import {
  AddOnSheet,
  LineSheet,
  addOnTitle,
  type AddOnValue,
  type LineEdit,
} from '@/components/receipt/LineSheet';
import { BigButton, BottomBar, Chip, Frame } from '@/components/receipt/parts';
import { showToast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import { groupById } from '@/data/quick';
import {
  emptyReceipt,
  grandTotal,
  linesTotal,
  newLine,
  ofItems,
  sampleRead,
  type AddOn,
  type Line,
  type Receipt,
} from '@/data/receipt';
import { addReceiptBill } from '@/data/store';
import { inrExact, shortDate } from '@/lib/format';
import { colors, fonts, gutter, radius, stroke } from '@/theme/tokens';

/** The order a printed bill shows them in: service, then any discount, then GST. */
const ADD_ON_ORDER: AddOn[] = ['service', 'discount', 'tax'];

const num = { fontVariant: ['tabular-nums' as const] };

/** One item in a bill's columns: how many, what it was, what one costs, the amount. */
function ItemRow({ line, onPress }: { line: Line; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Change ${line.qty} ${line.name} at ${inrExact(line.price / line.qty)}, ${inrExact(line.price)}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Txt variant="body" style={[styles.qtyCol, num]}>
        {line.qty}
      </Txt>
      <Txt variant="body" numberOfLines={2} style={[styles.itemCol, styles.itemName]}>
        {line.name}
      </Txt>
      <Txt variant="body" color={colors.inkSoft} style={[styles.rateCol, styles.amt, num]}>
        {inrExact(line.price / line.qty)}
      </Txt>
      <Txt variant="label" style={[styles.amtCol, styles.amt, num]}>
        {inrExact(line.price)}
      </Txt>
    </Pressable>
  );
}

/** The torn bottom of the receipt. */
function Zigzag() {
  const [w, setW] = useState(0);
  let edge = '';
  let fill = `M0 0 H${w} V2`;
  for (let x = w; x > 0; x -= 12) fill += ` L${x - 6} 11 L${Math.max(x - 12, 0)} 2`;
  for (let x = 0; x < w; x += 12) edge += `L${x + 6} 11 L${Math.min(x + 12, w)} 2 `;
  return (
    <View style={styles.zigzag} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Svg width={w} height={13}>
          <Path d={`${fill} Z`} fill={colors.paper} />
          <Path d={`M0 2 ${edge}`} fill="none" stroke={colors.line} strokeWidth={stroke.m} />
          <Path d={`M1.25 0V2M${w - 1.25} 0V2`} stroke={colors.line} strokeWidth={stroke.m} />
        </Svg>
      ) : null}
    </View>
  );
}

/**
 * Check it: what came off the receipt, to fix before the bill is made. Qty, item and amount in
 * columns like the printed bill; tap any line to change it. The subtotal, then GST, service and
 * discount as the receipt showed them, with a clear button to add any that weren't on it (as an
 * amount or a percentage). Create bill opens the bill and asks who's in.
 */
export default function ReviewScreen() {
  const { manual, group } = useLocalSearchParams<{ manual?: string; group?: string }>();
  const typing = manual === '1';
  const target = group ? groupById(group) : undefined;
  const [start] = useState(() => (typing ? { name: '', receipt: emptyReceipt() } : sampleRead()));
  const [name, setName] = useState(start.name);
  const [focus, setFocus] = useState(false);
  const [lines, setLines] = useState<Line[]>(start.receipt.lines);
  const [fixed, setFixed] = useState<Record<AddOn, number>>({
    tax: start.receipt.tax,
    service: start.receipt.service,
    discount: start.receipt.discount,
  });
  const [rates, setRates] = useState<Partial<Record<AddOn, number>>>(start.receipt.rates ?? {});
  // What the reader found on the receipt, so its sheet can say so.
  const [read] = useState(() => new Set(ADD_ON_ORDER.filter((k) => start.receipt[k] > 0)));
  const [open, setOpen] = useState<'line' | AddOn | null>(null);
  const [lineId, setLineId] = useState<string>();
  const [nonce, setNonce] = useState(0);
  const nameRef = useRef<TextInput>(null);

  // Until the reader is connected, a photo comes back as the example receipt. Say so.
  useEffect(() => {
    if (!typing) showToast('Reading receipts is coming next. These lines are an example.');
  }, [typing]);

  const line = lines.find((l) => l.id === lineId);
  const items = linesTotal({ lines });
  // A percentage follows the items as they change; a fixed amount stays put.
  const amountOf = (k: AddOn) => {
    const rate = rates[k];
    return rate !== undefined ? ofItems({ lines }, rate) : fixed[k];
  };
  const receipt: Receipt = {
    lines,
    tax: amountOf('tax'),
    service: amountOf('service'),
    discount: amountOf('discount'),
    rates,
    paid: {},
  };
  const total = grandTotal(receipt);
  const present = ADD_ON_ORDER.filter((k) => amountOf(k) > 0);
  const missing = ADD_ON_ORDER.filter((k) => !(amountOf(k) > 0));
  const meta = [
    shortDate(),
    `${lines.length} ${lines.length === 1 ? 'item' : 'items'}`,
    ...(target ? [`into ${target.name}`] : []),
  ].join(' · ');

  function show(kind: 'line' | AddOn, id?: string) {
    setLineId(id);
    setNonce((n) => n + 1);
    setOpen(kind);
  }
  const close = () => setOpen(null);

  function saveLine(e: LineEdit) {
    close();
    if (!line) setLines((ls) => [...ls, newLine(e.name, e.qty, e.price)]);
    else setLines((ls) => ls.map((l) => (l.id === line.id ? { ...l, ...e } : l)));
  }

  function deleteLine() {
    if (!line) return;
    const before = lines;
    close();
    setLines(lines.filter((l) => l.id !== line.id));
    showToast(`Removed ${line.name}`, { undo: () => setLines(before) });
  }

  function saveAddOn(k: AddOn, v: AddOnValue) {
    close();
    setFixed((f) => ({ ...f, [k]: v.rate === undefined ? v.amount : 0 }));
    setRates((r) => {
      const next = { ...r };
      if (v.amount > 0 && v.rate !== undefined) next[k] = v.rate;
      else delete next[k];
      return next;
    });
  }

  function create() {
    if (!lines.length) return show('line');
    if (!name.trim()) {
      nameRef.current?.focus();
      return showToast('Give the bill a name');
    }
    const id = addReceiptBill(
      name.trim(),
      { ...receipt, lines: lines.map((l) => ({ ...l, tags: {} })) },
      target?.id,
    );
    router.dismissAll();
    router.push({ pathname: '/bill/[id]', params: { id, invite: '1' } });
  }

  const label = !lines.length ? 'Add an item' : !name.trim() ? 'Name the bill' : 'Create bill';

  return (
    <Frame
      title="Check it"
      bar={
        <BottomBar>
          <BigButton
            label={typing ? 'Scan instead' : 'Retake'}
            height={54}
            onPress={() => router.back()}
          />
          <BigButton label={label} lime height={54} onPress={create} />
        </BottomBar>
      }
      overlay={
        <>
          <LineSheet
            key={`line${nonce}`}
            open={open === 'line'}
            line={line}
            onSave={saveLine}
            onDelete={line ? deleteLine : undefined}
            onClose={close}
          />
          {open && open !== 'line' ? (
            <AddOnSheet
              key={`addon${nonce}`}
              open
              kind={open}
              value={{ amount: amountOf(open), rate: rates[open] }}
              items={items}
              fromScan={read.has(open) && amountOf(open) > 0}
              onSave={(v) => saveAddOn(open, v)}
              onClose={close}
            />
          ) : null}
        </>
      }>
      <View style={[styles.name, focus && { borderBottomColor: colors.line }]}>
        <TextInput
          ref={nameRef}
          value={name}
          onChangeText={setName}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder="Name the bill"
          placeholderTextColor={colors.inkMuted}
          maxLength={60}
          autoCapitalize="words"
          returnKeyType="done"
          accessibilityLabel="Bill name"
          style={styles.nameInput}
        />
        <Icon name="pen" size={18} color={colors.inkHint} />
      </View>
      <Txt variant="label" color={colors.inkHint} style={styles.meta}>
        {meta}
      </Txt>

      <View style={styles.receipt}>
        <View style={styles.head} accessibilityElementsHidden importantForAccessibility="no">
          <Txt variant="eyebrow" color={colors.inkHint} style={styles.qtyCol}>
            QTY
          </Txt>
          <Txt variant="eyebrow" color={colors.inkHint} style={styles.itemCol}>
            ITEM
          </Txt>
          <Txt variant="eyebrow" color={colors.inkHint} style={[styles.rateCol, styles.amt]}>
            RATE
          </Txt>
          <Txt variant="eyebrow" color={colors.inkHint} style={[styles.amtCol, styles.amt]}>
            AMOUNT
          </Txt>
        </View>
        <DashedLine thickness={stroke.s} style={styles.rule} />
        {lines.map((l) => (
          <ItemRow key={l.id} line={l} onPress={() => show('line', l.id)} />
        ))}
        <Pressable
          onPress={() => show('line')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
          <Icon name="plus" size={16} strokeWidth={2.8} color={colors.ink} />
          <Txt variant="label">Add an item</Txt>
        </Pressable>
        <Txt variant="small" color={colors.inkHint} style={styles.hint}>
          Tap any line to change it.
        </Txt>

        <DashedLine thickness={stroke.s} style={styles.rule} />
        <View style={styles.sumRow}>
          <Txt variant="body" style={styles.itemCol}>
            Subtotal
          </Txt>
          <Txt variant="label" style={[styles.amt, num]}>
            {inrExact(items)}
          </Txt>
        </View>
        {present.map((k) => {
          const rate = rates[k];
          const amount = amountOf(k);
          return (
            <Pressable
              key={k}
              onPress={() => show(k)}
              accessibilityRole="button"
              accessibilityLabel={`${addOnTitle(k)}${rate !== undefined ? ` ${rate}%` : ''}, ${
                inrExact(amount)
              }. Change`}
              style={({ pressed }) => [styles.sumRow, styles.tap, pressed && styles.pressed]}>
              <View style={[styles.itemCol, styles.addOnName]}>
                <Txt variant="body">{addOnTitle(k)}</Txt>
                {rate !== undefined ? <Chip text={`${rate}%`} /> : null}
              </View>
              <Txt variant="label" style={[styles.amt, num]}>
                {k === 'discount' ? '−' : ''}
                {inrExact(amount)}
              </Txt>
            </Pressable>
          );
        })}
        {missing.length ? (
          <View style={styles.addOns}>
            {missing.map((k) => (
              <Pressable
                key={k}
                onPress={() => show(k)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${addOnTitle(k)}`}
                style={({ pressed }) => [styles.addOnChip, pressed && styles.pressed]}>
                <Icon name="plus" size={14} strokeWidth={3} color={colors.ink} />
                <Txt variant="label" style={{ fontSize: 13.5 }}>
                  {addOnTitle(k)}
                </Txt>
              </Pressable>
            ))}
          </View>
        ) : null}

        <DashedLine thickness={stroke.s} style={styles.rule} />
        <View style={styles.total}>
          <Txt variant="bodyStrong" style={{ fontSize: 17 }}>
            Total
          </Txt>
          <Txt style={[styles.totalAmount, num]}>{inrExact(total)}</Txt>
        </View>
      </View>
      <Zigzag />
    </Frame>
  );
}

const styles = StyleSheet.create({
  name: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: gutter,
    borderBottomWidth: stroke.s,
    borderBottomColor: 'transparent',
  },
  nameInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    padding: 0,
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
  },
  meta: { marginTop: 2, marginHorizontal: gutter, fontFamily: fonts.bodyBold, fontSize: 13 },
  receipt: {
    marginTop: 14,
    marginHorizontal: gutter,
    paddingTop: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.paper,
    borderWidth: stroke.m,
    borderBottomWidth: 0,
    borderColor: colors.line,
  },
  head: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  /** Four columns on every row, like a printed bill: how many, the item, the rate, the amount. */
  qtyCol: { width: 34 },
  itemCol: { flex: 1, minWidth: 0, paddingRight: 8 },
  rateCol: { width: 64 },
  amtCol: { minWidth: 74 },
  amt: { textAlign: 'right' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
    paddingVertical: 10,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  pressed: { backgroundColor: colors.pressed },
  itemName: { fontSize: 15, lineHeight: 20 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  hint: { marginTop: -2, marginBottom: 8 },
  rule: { marginHorizontal: -14, marginTop: 4, marginBottom: 4 },
  sumRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingLeft: 34 },
  tap: { minHeight: 44, marginHorizontal: -6, paddingRight: 6, paddingLeft: 40, borderRadius: 8 },
  addOnName: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  /** A dashed pill that adds GST, a service charge or a discount the receipt didn't have. */
  addOns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 34, paddingVertical: 8 },
  addOnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 10,
  },
  totalAmount: { fontFamily: fonts.display, fontSize: 30, lineHeight: 40 },
  zigzag: { marginHorizontal: gutter, height: 13 },
});
