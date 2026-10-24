/**
 * Recurring bill: rent, Wi-Fi, the maid, Netflix, the gym, or your own. How much (or "it changes
 * every time", and you're asked when it's due), who it's split with (a group or people), who pays,
 * how often (weekly, monthly, yearly, on the day you pick) and when it ends (never, after a few
 * times, or on a date). A line at the bottom says it back in words. `?id=` edits one.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton } from '@/components/CircleButton';
import { DottedBackground } from '@/components/DottedBackground';
import { Icon, type IconName } from '@/components/Icon';
import { Cta, Face, KeyButton, PillToggle, Stepper } from '@/components/receipt/parts';
import { WhoSheet } from '@/components/receipt/WhoPopup';
import { Toggle } from '@/components/social/parts';
import { showToast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import { ME } from '@/data/mock';
import { nameOf } from '@/data/quick';
import {
  MONTH,
  PRESETS,
  WEEKDAY,
  dueText,
  endsText,
  nextDue,
  recurringById,
  repeatText,
  saveRecurring,
  stopRecurring,
  type Ends,
  type Repeat,
} from '@/data/recurring';
import { addQuickBill, billById, useStore } from '@/data/store';
import type { Bill, PersonId } from '@/data/types';
import { inr, listNames } from '@/lib/format';
import { colors, fonts, gutter, radius, shadow, stroke } from '@/theme/tokens';

const REPEATS: [Repeat, string][] = [
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['yearly', 'Yearly'],
];
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
type EndKind = Ends['kind'];

/** The end of each of the next 12 months, for "Ends on". */
function monthEnds(): { iso: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, label: `${MONTH[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` };
  });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt variant="eyebrow" color={colors.inkHint} accessibilityRole="header">
        {title.toUpperCase()}
      </Txt>
      {children}
    </View>
  );
}

/** A small pickable chip: a day, a month, a person. */
function Pick({
  label,
  on,
  onPress,
  a11y,
  wide = false,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  a11y?: string;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={a11y ?? label}
      style={[styles.pick, wide && { paddingHorizontal: 14 }, on && styles.pickOn]}>
      <Txt variant="label" style={{ fontSize: 14 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export default function RecurringScreen() {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const old = id ? recurringById(id) : undefined;

  const [name, setName] = useState(old?.name ?? '');
  const [icon, setIcon] = useState<IconName>(old?.icon ?? 'repeat');
  const [amt, setAmt] = useState(old?.amount ? String(old.amount) : '');
  const [ask, setAsk] = useState(old ? old.amount === null : false);
  const [groupId, setGroupId] = useState<string | undefined>(old?.groupId);
  const [ppl, setPpl] = useState<PersonId[]>(old?.people ?? [ME]);
  const [payer, setPayer] = useState<PersonId>(old?.payer ?? ME);
  const [repeat, setRepeat] = useState<Repeat>(old?.repeat ?? 'monthly');
  const [day, setDay] = useState(old?.day ?? (old?.repeat === 'weekly' ? 1 : 1));
  const [month, setMonth] = useState(old?.month ?? new Date().getMonth());
  const [endKind, setEndKind] = useState<EndKind>(old?.ends.kind ?? 'never');
  const [times, setTimes] = useState(old?.ends.kind === 'after' ? old.ends.times : 6);
  const [until, setUntil] = useState(old?.ends.kind === 'on' ? old.ends.date : monthEnds()[5].iso);
  const [addNow, setAddNow] = useState(false);
  const [who, setWho] = useState<{ open: boolean; mode: 'people' | 'group'; key: number }>({
    open: false,
    mode: 'people',
    key: 0,
  });

  const group = groupId ? billById(groupId) : undefined;
  const amount = parseFloat(amt);
  const hasAmount = ask || (Number.isFinite(amount) && amount > 0);
  const others = ppl.filter((p) => p !== ME);
  const draft: Bill = {
    id: 'recurring-draft',
    kind: 'bill',
    name: name || 'Recurring bill',
    date: new Date().toISOString().slice(0, 10),
    status: 'tag',
    total: 0,
    people: ppl,
    transfers: [],
    groupId,
  };
  const ends: Ends =
    endKind === 'after' ? { kind: 'after', times } : endKind === 'on' ? { kind: 'on', date: until } : { kind: 'never' };
  const rule = { repeat, day: repeat === 'weekly' ? day % 7 : day, month };
  const whoText = group
    ? `${group.name} · ${ppl.length} people`
    : others.length
      ? listNames(['You', ...others.map(nameOf)])
      : 'Just you so far';

  function pickRepeat(r: Repeat) {
    setRepeat(r);
    if (r === 'weekly' && day > 6) setDay(1);
  }

  function save() {
    const clean = name.trim();
    if (!clean) return showToast('Give it a name first');
    if (!hasAmount) return showToast('Type the amount, or say it changes every time');
    if (!others.length) return showToast('Pick who it’s split with');
    const r = {
      id: old?.id ?? `rec-${Date.now().toString(36)}`,
      name: clean,
      icon,
      amount: ask ? null : amount,
      repeat,
      day: rule.day,
      month,
      ends,
      groupId,
      people: ppl,
      payer: ppl.includes(payer) ? payer : ME,
    };
    saveRecurring(r);
    if (addNow && !ask) {
      addQuickBill({ name: clean, amount, ins: ppl, paid: { [r.payer]: amount }, groupId });
    }
    showToast(
      `${clean} saved · next ${dueText(nextDue(r))}${addNow && !ask ? ' · today’s added' : ''}`,
    );
    router.back();
  }

  function stop() {
    if (!old) return;
    stopRecurring(old.id);
    showToast(`${old.name} won’t come round again`);
    router.back();
  }

  const cta = !name.trim()
    ? { label: 'Give it a name', kind: 'grey' as const }
    : !hasAmount
      ? { label: 'Type the amount', kind: 'grey' as const }
      : !others.length
        ? { label: 'Pick who it’s split with', kind: 'grey' as const }
        : { label: old ? 'Save changes' : 'Save recurring bill', kind: 'lime' as const };

  return (
    <View style={{ flex: 1 }}>
      <DottedBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.head, { paddingTop: insets.top + 6 }]}>
          <CircleButton size={44} accessibilityLabel="Close" onPress={() => router.back()}>
            <Icon name="close" size={22} color={colors.ink} />
          </CircleButton>
          <Txt variant="title" accessibilityRole="header">
            Recurring bill
          </Txt>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Section title="What is it?">
            <View style={styles.presets}>
              {PRESETS.map((p) => {
                const on = name.trim().toLowerCase() === p.name.toLowerCase();
                return (
                  <Pressable
                    key={p.name}
                    onPress={() => {
                      setName(p.name);
                      setIcon(p.icon);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => [styles.preset, on && styles.presetOn, pressed && { opacity: 0.85 }]}>
                    <Icon name={p.icon} size={22} color={colors.ink} />
                    <Txt variant="label" style={{ fontSize: 14 }}>
                      {p.name}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                const p = PRESETS.find((x) => x.name.toLowerCase() === t.trim().toLowerCase());
                setIcon(p ? p.icon : 'repeat');
              }}
              placeholder="Or type your own: Cook, Cylinder, Spotify"
              placeholderTextColor={colors.inkHint}
              maxLength={40}
              autoCapitalize="words"
              accessibilityLabel="Name of the recurring bill"
              style={styles.input}
            />
          </Section>

          <Section title="How much?">
            {ask ? (
              <Txt variant="body" color={colors.inkSoft} style={{ fontSize: 14, lineHeight: 20 }}>
                You’ll be asked for the amount each time it’s due, like an electricity bill.
              </Txt>
            ) : (
              <View style={styles.amountBox}>
                <Txt style={styles.rupee}>₹</Txt>
                <TextInput
                  value={amt}
                  onChangeText={(t) => setAmt(t.replace(/[^0-9.]/g, '').slice(0, 9))}
                  placeholder="0"
                  placeholderTextColor={colors.inkHint}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Amount in rupees"
                  style={styles.amountInput}
                />
              </View>
            )}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="rowTitle" style={{ fontSize: 15 }}>
                  It changes every time
                </Txt>
                <Txt variant="rowSub" color={colors.inkHint}>
                  Electricity, groceries, the cook’s extra days
                </Txt>
              </View>
              <Toggle value={ask} onChange={setAsk} label="The amount changes every time" />
            </View>
          </Section>

          <Section title="Split with">
            <View style={styles.whoCard}>
              <View style={styles.whoTop}>
                <View style={styles.faces}>
                  {ppl.slice(0, 4).map((p, i) => (
                    <View key={p} style={{ marginLeft: i ? -10 : 0 }}>
                      <Face id={p} size={30} />
                    </View>
                  ))}
                </View>
                <Txt variant="rowTitle" numberOfLines={2} style={{ flex: 1, fontSize: 15 }}>
                  {whoText}
                </Txt>
              </View>
              <View style={styles.whoBtns}>
                <KeyButton
                  label={group ? 'Change group' : 'A group'}
                  onPress={() => setWho((w) => ({ open: true, mode: 'group', key: w.key + 1 }))}
                />
                <KeyButton
                  label="People"
                  onPress={() => setWho((w) => ({ open: true, mode: 'people', key: w.key + 1 }))}
                />
              </View>
            </View>
            {others.length ? (
              <>
                <Txt variant="label" color={colors.inkSoft} style={{ marginTop: 12, fontSize: 13 }}>
                  Who pays it?
                </Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowChips}>
                  {ppl.map((p) => (
                    <Pick key={p} label={nameOf(p)} on={payer === p} onPress={() => setPayer(p)} wide />
                  ))}
                </ScrollView>
              </>
            ) : null}
          </Section>

          <Section title="How often?">
            <PillToggle
              options={REPEATS}
              value={repeat}
              onChange={pickRepeat}
              label="How often"
              style={styles.flush}
            />
            {repeat === 'weekly' ? (
              <View style={styles.week}>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setDay(d)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: day % 7 === d }}
                    accessibilityLabel={WEEKDAY[d]}
                    style={[styles.weekDay, day % 7 === d && styles.pickOn]}>
                    <Txt variant="label" style={{ fontSize: 13 }}>
                      {WEEKDAY[d].slice(0, 2)}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                {repeat === 'yearly' ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowChips}>
                    {MONTH.map((m, i) => (
                      <Pick key={m} label={m} on={month === i} onPress={() => setMonth(i)} />
                    ))}
                  </ScrollView>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowChips}>
                  {DAYS.map((d) => (
                    <Pick
                      key={d}
                      label={String(d)}
                      on={day === d}
                      onPress={() => setDay(d)}
                      a11y={`On the ${d}`}
                    />
                  ))}
                </ScrollView>
              </>
            )}
          </Section>

          <Section title="Ends">
            <PillToggle
              options={[
                ['never', 'Never'],
                ['after', 'After'],
                ['on', 'On a date'],
              ]}
              value={endKind}
              onChange={setEndKind}
              label="When it ends"
              style={styles.flush}
            />
            {endKind === 'after' ? (
              <View style={styles.after}>
                <Stepper
                  shown={String(times)}
                  onLess={() => setTimes((t) => Math.max(1, t - 1))}
                  onMore={() => setTimes((t) => Math.min(60, t + 1))}
                  canLess={times > 1}
                  canMore={times < 60}
                  what="times"
                  outlined
                />
                <Txt variant="label" style={{ fontSize: 15 }}>
                  {times === 1 ? 'time' : 'times'}
                </Txt>
              </View>
            ) : endKind === 'on' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowChips}>
                {monthEnds().map((m) => (
                  <Pick key={m.iso} label={m.label} on={until === m.iso} onPress={() => setUntil(m.iso)} wide />
                ))}
              </ScrollView>
            ) : null}
          </Section>

          {name.trim() && hasAmount && others.length ? (
            <View style={styles.summary} accessibilityLiveRegion="polite">
              <Txt variant="body" style={{ fontSize: 15, lineHeight: 22 }}>
                <Txt variant="rowTitle" style={{ fontSize: 15 }}>
                  {name.trim()}
                </Txt>
                {`: ${ask ? 'the amount you type' : inr(amount)}, ${repeatText(rule).toLowerCase()}, split ${ppl.length} ways${group ? ` in ${group.name}` : ''}. ${payer === ME ? 'You pay' : `${nameOf(payer)} pays`}. ${endsText(ends)}. Next: ${dueText(nextDue(rule))}.`}
              </Txt>
            </View>
          ) : null}

          {!old && !ask ? (
            <View style={[styles.switchRow, { marginHorizontal: gutter, marginTop: 14 }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt variant="rowTitle" style={{ fontSize: 15 }}>
                  Add this one now too
                </Txt>
                <Txt variant="rowSub" color={colors.inkHint}>
                  Puts today’s on Bills, so it’s settled with everything else
                </Txt>
              </View>
              <Toggle value={addNow} onChange={setAddNow} label="Add this one now too" />
            </View>
          ) : null}

          {old ? (
            <Pressable onPress={stop} accessibilityRole="button" style={styles.stop}>
              <Txt variant="label" color={colors.outText}>
                Stop this recurring bill
              </Txt>
            </Pressable>
          ) : null}
        </ScrollView>

        <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
          <Cta label={cta.label} kind={cta.kind} onPress={save} />
        </View>
      </KeyboardAvoidingView>

      <WhoSheet
        key={who.key}
        open={who.open}
        mode={who.mode}
        bill={draft}
        onDone={(gid, ids) => {
          // Picking people makes it a bill between people; picking a group puts it in the group.
          setGroupId(who.mode === 'group' ? gid : undefined);
          setPpl([ME, ...ids.filter((p) => p !== ME)]);
          if (!ids.includes(payer) && payer !== ME) setPayer(ME);
          setWho((w) => ({ ...w, open: false }));
        }}
        onClose={() => setWho((w) => ({ ...w, open: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingBottom: 6,
  },
  section: { marginTop: 18, marginHorizontal: gutter, gap: 10 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    width: '31.5%',
    flexGrow: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
  },
  presetOn: { backgroundColor: colors.highlight, boxShadow: shadow.s },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 64,
    paddingHorizontal: 16,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  rupee: { fontFamily: fonts.display, fontSize: 26, lineHeight: 34 },
  amountInput: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  whoCard: {
    padding: 12,
    gap: 10,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.paper,
  },
  whoTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faces: { flexDirection: 'row' },
  whoBtns: { flexDirection: 'row', gap: 8 },
  rowChips: { gap: 6, paddingVertical: 2, paddingRight: 8 },
  pick: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  pickOn: { backgroundColor: colors.highlight },
  week: { flexDirection: 'row', gap: 4 },
  weekDay: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  after: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flush: { marginHorizontal: 0, marginTop: 0 },
  summary: {
    marginTop: 20,
    marginHorizontal: gutter,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.highlightSoft,
  },
  stop: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 16 },
  foot: {
    flexDirection: 'row',
    paddingHorizontal: gutter,
    paddingTop: 10,
    backgroundColor: colors.page,
    borderTopWidth: 1.5,
    borderTopColor: colors.hairline,
  },
});
