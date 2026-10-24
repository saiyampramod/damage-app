/** The sheets on Add expense: who paid, how it's split, changing the group, and adding people. */
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ME } from '@/data/mock';
import { everyone, groupPeople, nameOf, openGroups } from '@/data/quick';
import type { Bill, PersonId } from '@/data/types';
import { inrExact } from '@/lib/format';
import { colors, fonts, gutter, radius, stroke } from '@/theme/tokens';

import { Icon } from '../Icon';
import { cleanAmount } from '../quick/draft';
import {
  CheckBox,
  Cta,
  ListLabel,
  OptionRow,
  PersonSticker,
  PickerHead,
  Radio,
  Rule,
  SearchField,
} from '../quick/parts';
import { Sheet } from '../Sheet';
import { Txt } from '../Txt';
import {
  addsUp,
  evenly,
  evenPaid,
  num,
  paidTally,
  settlePayers,
  sharesOf,
  splitTally,
  type Entry,
  type SplitMode,
} from './split';

/* ---------- shared pieces ---------- */

/** Two or three options in one pill; the picked one is black. */
function Seg<T extends string>({
  value,
  options,
  onPick,
  label,
}: {
  value: T;
  options: [T, string][];
  onPick: (v: T) => void;
  label: string;
}) {
  return (
    <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(([v, text]) => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onPick(v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[styles.segBtn, on && { backgroundColor: colors.action }]}>
            <Txt variant="label" color={on ? colors.onAction : colors.ink} numberOfLines={1}>
              {text}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "Adds up to ₹15,000 ✓" in lime, or what's left in white. */
function Tally({ text }: { text: string }) {
  const ok = addsUp(text);
  return (
    <View style={[styles.tally, ok && { backgroundColor: colors.highlight }]}>
      <Txt variant="label" accessibilityLiveRegion="polite">
        {text}
      </Txt>
    </View>
  );
}

/** A ₹ box for one person's amount. */
function Money({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <View style={styles.money}>
      <Txt style={styles.moneyRupee}>₹</Txt>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(cleanAmount(t))}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={colors.inkHint}
        accessibilityLabel={label}
        selectTextOnFocus
        style={styles.moneyInput}
      />
    </View>
  );
}

/** A person's row in a sheet: something on the left (optional), sticker, name, then whatever's on the right. */
function PersonLine({
  id,
  dim = false,
  left,
  children,
}: {
  id: PersonId;
  dim?: boolean;
  left?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View>
      <View style={styles.line}>
        {left}
        <View style={{ opacity: dim ? 0.4 : 1 }}>
          <PersonSticker id={id} size={34} />
        </View>
        <Txt
          variant="lead"
          numberOfLines={1}
          color={dim ? colors.inkSoft : colors.ink}
          style={styles.name}>
          {nameOf(id)}
        </Txt>
        {children}
      </View>
      <Rule />
    </View>
  );
}

const whatPaid = (id: PersonId) => (id === ME ? 'What you paid' : `What ${nameOf(id)} paid`);
const shareOf = (id: PersonId) => (id === ME ? 'Your share' : `${nameOf(id)}’s share`);

/* ---------- Who paid? ---------- */

export function PaidBySheet({
  open,
  entry: e,
  listed,
  onChange,
  onClose,
}: {
  open: boolean;
  entry: Entry;
  /** Everyone on the page; someone left out of the split can still have paid. */
  listed: PersonId[];
  onChange: (e: Entry) => void;
  onClose: () => void;
}) {
  const multi = !!e.paid;

  function close() {
    onChange(settlePayers(e));
    onClose();
  }
  function mode(m: 'one' | 'multi') {
    if (m === 'multi' && !e.paid) onChange({ ...e, paid: { [e.payer]: e.amt }, paidTyped: false });
    if (m === 'one' && e.paid) onChange({ ...e, payer: Object.keys(e.paid)[0] ?? ME, paid: null });
  }
  function toggle(id: PersonId) {
    const paid = { ...(e.paid ?? {}) };
    if (id in paid) delete paid[id];
    else paid[id] = '';
    const next = { ...e, paid };
    onChange(e.paidTyped ? next : evenPaid(next));
  }

  return (
    <Sheet open={open} onClose={close} label="Who paid?" tall grab={false}>
      <View style={styles.headWrap}>
        <PickerHead title="Who paid?" onClose={close} />
        <View style={styles.top}>
          <Seg
            value={multi ? 'multi' : 'one'}
            options={[
              ['one', 'One person'],
              ['multi', 'More than one'],
            ]}
            onPick={mode}
            label="Who paid"
          />
          {multi ? <Tally text={paidTally(e)} /> : null}
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets>
        {listed.map((id) => {
          if (!e.paid)
            return (
              <OptionRow
                key={id}
                onPress={() => {
                  onChange({ ...e, payer: id, paid: null });
                  onClose();
                }}
                role="radio"
                checked={e.payer === id}
                label={nameOf(id)}>
                <PersonSticker id={id} size={34} />
                <Txt variant="lead" numberOfLines={1} style={styles.name}>
                  {nameOf(id)}
                </Txt>
                <Radio on={e.payer === id} />
              </OptionRow>
            );
          const on = id in e.paid;
          const paid = e.paid;
          return (
            <PersonLine
              key={id}
              id={id}
              dim={!on}
              left={
                <Pressable
                  onPress={() => toggle(id)}
                  hitSlop={10}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={id === ME ? 'You paid' : `${nameOf(id)} paid`}>
                  <CheckBox on={on} />
                </Pressable>
              }>
              {on ? (
                <Money
                  value={paid[id] ?? ''}
                  onChange={(v) => onChange({ ...e, paid: { ...paid, [id]: v }, paidTyped: true })}
                  label={whatPaid(id)}
                />
              ) : null}
            </PersonLine>
          );
        })}
      </ScrollView>
      <View style={styles.foot}>
        <Cta label="Done" onPress={close} />
      </View>
    </Sheet>
  );
}

/* ---------- How to split? ---------- */

export function SplitSheet({
  open,
  entry: e,
  listed,
  ins,
  onChange,
  onToggle,
  onClose,
}: {
  open: boolean;
  entry: Entry;
  listed: PersonId[];
  ins: PersonId[];
  onChange: (e: Entry) => void;
  /** Leave someone out of this bill, or bring them back. */
  onToggle: (id: PersonId) => void;
  onClose: () => void;
}) {
  const t = num(e.amt);
  const sh = sharesOf(e, ins);

  function mode(m: SplitMode) {
    const typed = ins.some((id) => e.amts[id]);
    onChange(
      m === 'amt' && !typed && t ? { ...e, mode: m, amts: evenly(t, ins) } : { ...e, mode: m },
    );
  }
  function step(id: PersonId, d: number) {
    const n = Math.max(1, Math.min(20, (e.shares[id] ?? 1) + d));
    onChange({ ...e, shares: { ...e.shares, [id]: n } });
  }
  const value = (id: PersonId) => (
    <Txt style={styles.value} numberOfLines={1}>
      {t && ins.includes(id) ? inrExact(sh[id] ?? 0) : '—'}
    </Txt>
  );

  let rows: ReactNode;
  if (e.mode === 'eq') {
    rows = listed.map((id) => {
      const on = ins.includes(id);
      return (
        <PersonLine
          key={id}
          id={id}
          dim={!on}
          left={
            id === ME ? (
              <View accessible accessibilityLabel="You’re in">
                <CheckBox on />
              </View>
            ) : (
              <Pressable
                onPress={() => onToggle(id)}
                hitSlop={10}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${nameOf(id)} is in`}>
                <CheckBox on={on} />
              </Pressable>
            )
          }>
          {value(id)}
        </PersonLine>
      );
    });
  } else if (e.mode === 'shares') {
    rows = ins.map((id) => {
      const n = e.shares[id] ?? 1;
      return (
        <PersonLine key={id} id={id}>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => step(id, -1)}
              disabled={n <= 1}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`Fewer shares for ${nameOf(id)}`}
              style={[styles.stepBtn, n <= 1 && { opacity: 0.35 }]}>
              <Icon name="minus" size={16} strokeWidth={3} color={colors.ink} />
            </Pressable>
            <Txt variant="bodyStrong" style={styles.stepN} accessibilityLabel={`${n} shares`}>
              {n}
            </Txt>
            <Pressable
              onPress={() => step(id, 1)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`More shares for ${nameOf(id)}`}
              style={styles.stepBtn}>
              <Icon name="plus" size={16} strokeWidth={3} color={colors.ink} />
            </Pressable>
          </View>
          {value(id)}
        </PersonLine>
      );
    });
  } else {
    rows = ins.map((id) => (
      <PersonLine key={id} id={id}>
        <Money
          value={e.amts[id] ?? ''}
          onChange={(v) => onChange({ ...e, amts: { ...e.amts, [id]: v } })}
          label={shareOf(id)}
        />
      </PersonLine>
    ));
  }

  return (
    <Sheet open={open} onClose={onClose} label="How to split?" tall grab={false}>
      <View style={styles.headWrap}>
        <PickerHead title="How to split?" onClose={onClose} />
        <View style={styles.top}>
          <Seg
            value={e.mode}
            options={[
              ['eq', 'Equally'],
              ['shares', 'Shares'],
              ['amt', 'Amounts'],
            ]}
            onPick={mode}
            label="How to split"
          />
          {e.mode === 'amt' ? <Tally text={splitTally(e, ins)} /> : null}
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets>
        {rows}
      </ScrollView>
      <View style={styles.foot}>
        <Cta label="Done" onPress={onClose} />
      </View>
    </Sheet>
  );
}

/* ---------- Change: a different group, or friends ---------- */

export function ChangeSheet({
  open,
  current,
  moving,
  onGroup,
  onFriends,
  onClose,
}: {
  open: boolean;
  /** The group on the page now, or null for friends. */
  current: string | null;
  /** How many bills are already added (they move too). */
  moving: number;
  onGroup: (id: string) => void;
  onFriends: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Split with" tall grab={false}>
      <View style={styles.headWrap}>
        <PickerHead title="Split with" onClose={onClose} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <ListLabel title="Groups" />
        {openGroups().map((g) => {
          const n = groupPeople(g).length;
          const on = current === g.id;
          return (
            <OptionRow
              key={g.id}
              onPress={() => onGroup(g.id)}
              role="radio"
              checked={on}
              label={`${g.name}, ${n} people`}>
              <View style={styles.box}>
                <Icon name="flag" size={18} color={colors.ink} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="lead" numberOfLines={1} style={{ fontFamily: fonts.bodyHeavy }}>
                  {g.name}
                </Txt>
                <Txt variant="small">{n} people</Txt>
              </View>
              <Radio on={on} />
            </OptionRow>
          );
        })}
        <ListLabel title="Or" />
        <OptionRow onPress={onFriends} label="Friends, no group. Pick people one by one">
          <View style={styles.box}>
            <Icon name="people" size={18} color={colors.ink} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="lead" style={{ fontFamily: fonts.bodyHeavy }}>
              Friends, no group
            </Txt>
            <Txt variant="small">Pick people one by one</Txt>
          </View>
          <Icon name="chevron" size={20} strokeWidth={2.8} color={colors.ink} />
        </OptionRow>
      </ScrollView>
      {moving ? (
        <View style={styles.foot}>
          <Txt variant="small" style={styles.note}>
            {moving === 1
              ? 'The bill you’ve added here moves too.'
              : `The ${moving} bills you’ve added here move too.`}
          </Txt>
        </View>
      ) : null}
    </Sheet>
  );
}

/* ---------- Add people ---------- */

export function AddPeopleSheet({
  open,
  group,
  picked,
  onToggle,
  onClose,
}: {
  open: boolean;
  /** In a group, only people who aren't in it yet are listed, and anyone ticked joins it. */
  group: Bill | undefined;
  picked: PersonId[];
  onToggle: (id: PersonId) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const inGroup = group ? groupPeople(group) : [];
  const pool = everyone().filter(
    (id) => !inGroup.includes(id) && (!query || nameOf(id).toLowerCase().includes(query)),
  );

  function close() {
    setQ('');
    onClose();
  }

  return (
    <Sheet open={open} onClose={close} label="Add people" tall grab={false}>
      <View style={styles.headWrap}>
        <PickerHead title="Add people" onClose={close} />
        <View style={styles.top}>
          <SearchField value={q} onChangeText={setQ} placeholder="Search people on Damage" />
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {pool.map((id) => {
          const on = picked.includes(id);
          return (
            <OptionRow
              key={id}
              onPress={() => onToggle(id)}
              role="checkbox"
              checked={on}
              label={nameOf(id)}>
              <PersonSticker id={id} size={34} picked={on} />
              <Txt
                variant="lead"
                numberOfLines={1}
                style={[styles.name, on && { fontFamily: fonts.bodyHeavy }]}>
                {nameOf(id)}
              </Txt>
              <CheckBox on={on} />
            </OptionRow>
          );
        })}
        {!pool.length ? (
          <View style={styles.empty}>
            <Txt variant="label" style={{ textAlign: 'center' }}>
              {query
                ? `No one called “${q.trim()}” on Damage`
                : `Everyone you split with is already in ${group?.name ?? 'here'}`}
            </Txt>
            {query ? (
              <Txt variant="small" style={{ textAlign: 'center' }}>
                Add the bill, then send them its link.
              </Txt>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.foot}>
        {group ? (
          <Txt variant="small" style={[styles.note, { marginBottom: 10 }]}>
            Anyone you add joins {group.name} too.
          </Txt>
        ) : null}
        <Cta label="Done" onPress={close} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  headWrap: { paddingTop: 14 },
  top: { paddingHorizontal: gutter, gap: 10, paddingBottom: 6 },
  body: { paddingHorizontal: gutter, paddingBottom: 16 },
  foot: {
    borderTopWidth: stroke.m,
    borderColor: colors.line,
    paddingHorizontal: gutter,
    paddingTop: 10,
  },
  note: { fontSize: 13, lineHeight: 18 },
  seg: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  segBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tally: {
    alignSelf: 'center',
    minHeight: 32,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingVertical: 6 },
  name: { flex: 1, minWidth: 0 },
  money: {
    width: 128,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 10,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  moneyRupee: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22 },
  moneyInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    textAlign: 'right',
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
    padding: 0,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 20,
    minWidth: 68,
    textAlign: 'right',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepN: { minWidth: 22, textAlign: 'center' },
  box: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: 18,
    borderWidth: stroke.m,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: radius.m,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
});
