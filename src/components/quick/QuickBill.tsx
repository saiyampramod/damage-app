/**
 * The Quick bill pop-up, over the + screen. Top to bottom: the bill's name (tap to rename, the
 * icon picks another kind), who it's split with (last time's pick filled in), a big centred
 * amount with the number keys up, Paid by and Split side by side, then Add.
 * Add closes it and leaves you on the + screen. Close with the grab bar or a tap outside.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { PaidBySheet, SplitSheet } from '@/components/expense/BillSheets';
import {
  billName,
  evenPaid,
  newEntry,
  num,
  paidLabel,
  paidOf,
  sharesOf,
  problem,
  shown,
  tidy,
  type Entry,
} from '@/components/expense/split';
import { lastPick, rememberPick } from '@/data/lastPick';
import { ME } from '@/data/mock';
import { addQuickBill } from '@/data/store';
import {
  category,
  defaultName,
  groupById,
  groupPeople,
  nameOf,
  type CategoryId,
} from '@/data/quick';
import type { PersonId } from '@/data/types';
import { inrExact, listNames } from '@/lib/format';
import { colors, fonts, gutter, radius, stroke } from '@/theme/tokens';

import { Icon } from '../Icon';
import { Sheet } from '../Sheet';
import { Txt } from '../Txt';
import { cleanAmount, newDraft } from './draft';
import { Cta, Disc } from './parts';
import { CategoryPicker } from './Pickers';
import { WhoSheet } from './WhoSheet';

type Pick = 'who' | 'payer' | 'split' | 'cat' | null;

type Props = {
  open: boolean;
  /** The tile it was opened from. */
  start: CategoryId;
  /** Opened from a group's Add expense: the bill goes into this group. */
  inGroup?: string;
  onClose: () => void;
  /** Called with a short line for the + screen, e.g. "Fuel · ₹2,400 added to Coorg weekend". */
  onAdded: (line: string) => void;
};

/** Everyone on the bill for this group or these friends, you first. */
function listedFor(gid: string | null, ppl: PersonId[], extra: PersonId[]): PersonId[] {
  const g = groupById(gid);
  return [ME, ...(g ? [...groupPeople(g).filter((id) => id !== ME), ...extra] : ppl)];
}
const toggled = (list: PersonId[], id: PersonId) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export function QuickBill({ open, start, inGroup, onClose, onAdded }: Props) {
  const { width } = useWindowDimensions();
  const [group, setGroup] = useState<string | null>(null);
  const [people, setPeople] = useState<PersonId[]>([]);
  const [extra, setExtra] = useState<PersonId[]>([]);
  const [e, setE] = useState<Entry>(() => newEntry(start));
  const [pick, setPick] = useState<Pick>(null);
  const [amtFocus, setAmtFocus] = useState(false);
  const [nameW, setNameW] = useState(0);
  const amtRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  // A fresh bill each time it opens: last time's people filled in, number keys up.
  useEffect(() => {
    if (!open) return;
    const last = lastPick(start);
    const g = groupById(inGroup ?? last?.group ?? null);
    setGroup(g ? g.id : null);
    setPeople(g ? [] : (last?.people ?? []));
    setExtra([]);
    setE(newEntry(start));
    setPick(null);
    // The number keys come up with the sheet, in one move (the field also has autoFocus,
    // for when it's only just been mounted).
    const f = requestAnimationFrame(() => amtRef.current?.focus());
    return () => cancelAnimationFrame(f);
  }, [open, start, inGroup]);

  const g = groupById(group);
  const listed = listedFor(group, people, extra);
  const ins = listed.filter((id) => !e.out.includes(id));
  const chosen = !!g || people.length > 0;
  const total = num(e.amt);

  function focusAmount(delay = 0) {
    if (delay) setTimeout(() => amtRef.current?.focus(), delay);
    else amtRef.current?.focus();
  }
  function openPick(p: Pick) {
    Keyboard.dismiss();
    setPick(p);
  }
  // Back to the pop-up: the number keys come back.
  function closePick() {
    setPick(null);
    focusAmount(40);
  }
  function close() {
    Keyboard.dismiss();
    setPick(null);
    onClose();
  }

  /* who */
  function pickGroup(id: string) {
    setGroup(id);
    setPeople([]);
    setExtra([]);
    setE((x) => tidy({ ...x, out: [] }, listedFor(id, [], [])));
  }
  function toggleOut(id: PersonId) {
    setE((x) => ({ ...x, out: toggled(x.out, id) }));
  }
  function toggleFriend(id: PersonId) {
    const nextExtra = g ? toggled(extra, id) : extra;
    const nextPeople = g ? people : toggled(people, id);
    if (g) setExtra(nextExtra);
    else setPeople(nextPeople);
    setE((x) =>
      tidy({ ...x, out: x.out.filter((o) => o !== id) }, listedFor(group, nextPeople, nextExtra)),
    );
  }
  function friendsInstead() {
    if (!g) return;
    const next = [...groupPeople(g).filter((id) => id !== ME), ...extra];
    setGroup(null);
    setPeople(next);
    setExtra([]);
    setE((x) => tidy({ ...x, out: [] }, listedFor(null, next, [])));
  }

  function add() {
    rememberPick([start, e.cat], { group, people });
    Keyboard.dismiss();
    addQuickBill({
      name: billName(e),
      amount: total,
      ins,
      paid: paidOf(e),
      share: e.mode === 'eq' ? undefined : sharesOf(e, ins),
      groupId: g?.id,
    });
    onAdded(`${billName(e)} · ${inrExact(total)} added${g ? ` to ${g.name}` : ''}`);
  }

  // The button says what's missing and opens the fix, then adds.
  let cta: { label: string; onPress: () => void };
  if (!total) cta = { label: 'Type the amount', onPress: () => focusAmount() };
  else if (!chosen) cta = { label: 'Pick who to split with', onPress: () => openPick('who') };
  else {
    const p = problem(e, ins);
    cta = p
      ? {
          label: p.label,
          onPress: () =>
            p.fix === 'amount'
              ? focusAmount()
              : openPick(p.fix === 'people' ? 'who' : p.fix === 'payer' ? 'payer' : 'split'),
        }
      : { label: `Add ${inrExact(total)}${g ? ` to ${g.name}` : ''}`, onPress: add };
  }

  const whoName = g ? g.name : listNames(people.map(nameOf));
  const amountText = shown(e.amt);
  const amountSize = amountText.length <= 5 ? 64 : amountText.length <= 7 ? 52 : 42;
  const splitText =
    e.mode === 'eq'
      ? total && ins.length > 1
        ? `${inrExact(total / ins.length)} each`
        : 'Equally'
      : e.mode === 'shares'
        ? 'By shares'
        : 'Amounts';
  const nameMax = width - gutter * 2 - 44 - 10 - 26;

  return (
    <>
      <Sheet open={open} onClose={close} label="Quick bill">
        <View style={{ paddingHorizontal: gutter }}>
          {/* The name on top: tap to rename. The icon picks another kind of bill. */}
          <View style={styles.titleRow}>
            <Pressable
              onPress={() => openPick('cat')}
              accessibilityRole="button"
              accessibilityLabel={`Kind of bill: ${category(e.cat).label}. Change`}
              style={({ pressed }) => pressed && { transform: [{ scale: 0.92 }] }}>
              <Disc icon={category(e.cat).icon} size={44} fill={colors.highlight} />
            </Pressable>
            <Pressable
              onPress={() => nameRef.current?.focus()}
              accessible={false}
              style={styles.nameWrap}>
              {/* Measures the name so the box is as wide as the text and the pencil sits after it. */}
              <Txt
                style={[styles.nameText, styles.measure]}
                numberOfLines={1}
                onLayout={(ev) => setNameW(ev.nativeEvent.layout.width)}>
                {e.name || 'Name it'}
              </Txt>
              <TextInput
                ref={nameRef}
                value={e.name}
                onChangeText={(name) => setE((x) => ({ ...x, name }))}
                placeholder="Name it"
                placeholderTextColor={colors.inkHint}
                accessibilityLabel="Bill name"
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={() => focusAmount()}
                style={[styles.nameText, styles.nameInput, { width: Math.min(nameW + 6, nameMax) }]}
              />
              <Icon name="pen" size={18} color={colors.ink} />
            </Pressable>
          </View>

          {/* Who it's split with. Last time's pick is already here. */}
          <Pressable
            onPress={() => openPick('who')}
            accessibilityRole="button"
            accessibilityLabel={chosen ? `Split with ${whoName}. Change` : 'Pick who to split with'}
            style={({ pressed }) => [styles.who, pressed && styles.pressed]}>
            <Disc
              icon={g ? 'flag' : 'people'}
              size={32}
              fill={chosen ? colors.highlight : colors.paper}
            />
            <Txt
              variant="label"
              numberOfLines={1}
              color={chosen ? colors.ink : colors.inkHint}
              style={{ flex: 1, fontSize: 15 }}>
              {chosen ? whoName : 'Split with…'}
            </Txt>
            {chosen && ins.length < listed.length ? (
              <Txt variant="label" style={{ fontSize: 13 }}>
                {ins.length} of {listed.length}
              </Txt>
            ) : null}
            <Icon name="down" size={18} strokeWidth={2.8} color={colors.ink} />
          </Pressable>

          {/* The amount, big and centred. A see-through field on top takes the typing. */}
          <View style={styles.amtWrap}>
            <View style={styles.amtRow} pointerEvents="none">
              <Txt style={styles.rupee}>₹</Txt>
              <Txt
                style={[
                  styles.amt,
                  { fontSize: amountSize, lineHeight: Math.round(amountSize * 1.45) },
                ]}
                color={e.amt ? colors.ink : colors.inkHint}
                numberOfLines={1}>
                {amountText}
              </Txt>
              {amtFocus ? (
                <View style={[styles.caret, { height: Math.round(amountSize * 0.78) }]} />
              ) : null}
            </View>
            <TextInput
              ref={amtRef}
              value={e.amt}
              onChangeText={(t) =>
                setE((x) => {
                  const next = { ...x, amt: cleanAmount(t) };
                  // Several payers nobody's typed for yet: keep them even as the total changes.
                  return next.paid && !next.paidTyped ? evenPaid(next) : next;
                })
              }
              onFocus={() => setAmtFocus(true)}
              onBlur={() => setAmtFocus(false)}
              keyboardType="decimal-pad"
              autoFocus
              caretHidden
              accessibilityLabel={`Amount in rupees, ${amountText}`}
              style={styles.amtInput}
            />
          </View>

          {/* Paid by and Split, side by side. */}
          <View style={styles.tiles}>
            <Tile
              label="Paid by"
              value={paidLabel(e)}
              onPress={() => openPick(chosen ? 'payer' : 'who')}
            />
            <Tile
              label="Split"
              value={splitText}
              onPress={() => openPick(chosen ? 'split' : 'who')}
            />
          </View>

          <Cta label={cta.label} onPress={cta.onPress} style={{ marginTop: 12 }} />
        </View>
      </Sheet>

      <WhoSheet
        open={pick === 'who'}
        group={g}
        people={people}
        extra={extra}
        out={e.out}
        onGroup={pickGroup}
        onToggleOut={toggleOut}
        onToggleFriend={toggleFriend}
        onFriendsInstead={friendsInstead}
        onClose={closePick}
      />
      <PaidBySheet
        open={pick === 'payer'}
        entry={e}
        listed={listed}
        onChange={setE}
        onClose={closePick}
      />
      <SplitSheet
        open={pick === 'split'}
        entry={e}
        listed={listed}
        ins={ins}
        onChange={setE}
        onToggle={toggleOut}
        onClose={closePick}
      />
      <CategoryPicker
        open={pick === 'cat'}
        draft={{ ...newDraft(e.cat), name: e.name }}
        withName={false}
        onName={(name) => setE((x) => ({ ...x, name }))}
        onCat={(id) =>
          setE((x) => {
            // Swap the name too, unless they typed their own.
            const typedOwn = x.name.trim() && x.name !== defaultName(x.cat);
            return { ...x, cat: id, name: typedOwn ? x.name : defaultName(id) };
          })
        }
        onClose={closePick}
      />
    </>
  );
}

/** "Paid by · You ▾" or "Split · ₹600 each ▾" */
function Tile({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}. Change`}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="micro" color={colors.inkSoft} style={styles.tileLabel}>
          {label}
        </Txt>
        <Txt variant="label" numberOfLines={1} style={{ fontSize: 15, lineHeight: 19 }}>
          {value}
        </Txt>
      </View>
      <Icon name="down" size={16} strokeWidth={2.8} color={colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    marginBottom: 10,
  },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minHeight: 44 },
  // Bowlby One sits tall: lines a good bit taller than the size, or iOS crops the tops.
  nameText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 32, includeFontPadding: false },
  measure: { position: 'absolute', left: 0, top: 0, opacity: 0 },
  nameInput: { color: colors.ink, padding: 0, height: 40, minWidth: 40 },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    paddingLeft: 6,
    paddingRight: 12,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    boxShadow: `2px 2px 0px ${colors.shade}`,
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: 'none' },
  amtWrap: { height: 116, justifyContent: 'center' },
  amtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  rupee: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 48,
    marginRight: 6,
    includeFontPadding: false,
  },
  amt: { fontFamily: fonts.display, flexShrink: 1, includeFontPadding: false },
  caret: { width: 3, marginLeft: 4, backgroundColor: colors.ink },
  amtInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: colors.paper,
  },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 56,
    paddingLeft: 12,
    paddingRight: 10,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
    boxShadow: `2px 2px 0px ${colors.shade}`,
  },
  tileLabel: { textTransform: 'uppercase', letterSpacing: 0.4 },
});
