/**
 * Dashboard: your month in bills. Your share this month and how it compares with last month, your
 * spend limit (how much of it you've used, what's left a day), week by week, "The receipts don't
 * lie" (biggest hit, partner in crime, danger day), who you split with most, spend by group, and
 * Finance control (warn at 80%, check big bills, Sunday summary, chase old money). ‹ › steps
 * through the months. Share my month sends it as text (a story card image comes later). A bill
 * counts once its damage is revealed. The limit and controls live in `data/limits.ts`.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DottedBackground } from '@/components/DottedBackground';
import { StatusShade } from '@/components/Screen';
import { Icon } from '@/components/Icon';
import { Label, TabTop } from '@/components/ledger/parts';
import { LimitSheet } from '@/components/money/LimitSheet';
import { BigButton, Face } from '@/components/receipt/parts';
import { Toggle } from '@/components/social/parts';
import { Txt } from '@/components/Txt';
import { controls, daysLeft, setControl } from '@/data/limits';
import { nameOf } from '@/data/quick';
import {
  addMonths,
  monthName,
  monthOf,
  monthStats,
  months,
  sameMonth,
  type Month,
} from '@/data/stats';
import { useStore } from '@/data/store';
import { inr } from '@/lib/format';
import { shareText } from '@/lib/pay';
import { colors, fonts, gutter, radius, shadow, stroke } from '@/theme/tokens';

const DOCK = 64;
const WEEK_LABELS = ['1–7', '8–14', '15–21', '22–28', '29+'];

/** ₹1.2k for the small labels over the bars. */
const short = (n: number) => (n >= 1000 ? `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : inr(n));

export default function DashboardScreen() {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const insets = useSafeAreaInsets();
  const all = months();
  const now = monthOf(new Date());
  const [at, setAt] = useState<Month>(now);
  const k = all.findIndex((x) => sameMonth(x, at));
  const prev = k > 0 ? all[k - 1] : undefined;
  const next = k >= 0 && k < all.length - 1 ? all[k + 1] : undefined;

  const s = monthStats(at);
  const last = monthStats(addMonths(at, -1));
  const diff = s.total - last.total;
  const peak = Math.max(...s.weeks, 1);
  const thisWeek = sameMonth(at, now) ? Math.min(4, Math.floor((new Date().getDate() - 1) / 7)) : -1;
  const name = monthName(at);
  const most = Math.max(...s.withMost.map((w) => w.bills), 1);
  const topGroup = Math.max(...s.byGroup.map((c) => c.total), 1);
  const [sheet, setSheet] = useState<null | 'limit' | 'big'>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const openSheet = (k: 'limit' | 'big') => {
    setSheetKey(sheetKey + 1);
    setSheet(k);
  };

  // The limit, against what you've spent in the month on screen.
  const limit = controls.limit;
  const isNow = sameMonth(at, now);
  const used = limit ? s.total / limit : 0;
  const left = limit ? limit - s.total : 0;
  const days = daysLeft();
  const warn = !!limit && used >= 0.8;
  const limitWords = !limit
    ? ''
    : left < 0
      ? `${inr(-left)} over your limit${isNow ? '. It resets on the 1st.' : ''}`
      : isNow
        ? `${inr(left)} left · ${days} ${days === 1 ? 'day' : 'days'} to go · about ${inr(left / days)} a day`
        : `${inr(left)} under your limit`;

  async function shareMonth() {
    const lines = [
      `My ${name} on Damage: ${inr(s.total)} across ${s.count} ${s.count === 1 ? 'bill' : 'bills'}.`,
      s.biggest ? `Biggest hit: ${s.biggest.bill.name}, ${inr(s.biggest.share)}.` : '',
      s.partner ? `Partner in crime: ${nameOf(s.partner.person)} (${s.partner.bills} bills).` : '',
      s.danger ? `Danger day: ${s.danger.day}.` : '',
    ].filter(Boolean);
    await shareText(lines.join('\n'));
  }

  return (
    <View style={{ flex: 1 }}>
      <DottedBackground />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 12) + 6 + DOCK + 28,
        }}
        showsVerticalScrollIndicator={false}>
        <TabTop title="Dashboard" />

        <View style={styles.months}>
          <Pressable
            onPress={() => prev && setAt(prev)}
            disabled={!prev}
            accessibilityRole="button"
            accessibilityLabel={prev ? `Show ${monthName(prev)}` : 'No earlier months'}
            accessibilityState={{ disabled: !prev }}
            style={[styles.step, !prev && { opacity: 0.3 }]}>
            <Icon name="back" size={20} strokeWidth={2.6} color={colors.ink} />
          </Pressable>
          <Txt variant="rowTitle" accessibilityRole="header" style={{ fontSize: 17 }}>
            {name} {at.y}
          </Txt>
          <Pressable
            onPress={() => next && setAt(next)}
            disabled={!next}
            accessibilityRole="button"
            accessibilityLabel={next ? `Show ${monthName(next)}` : 'This is the latest month'}
            accessibilityState={{ disabled: !next }}
            style={[styles.step, !next && { opacity: 0.3 }]}>
            <Icon name="chevron" size={20} strokeWidth={2.6} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Txt variant="eyebrow" color={colors.inkSoft}>
            YOUR SHARE IN {name.toUpperCase()}
          </Txt>
          <Txt style={styles.big}>{inr(s.total)}</Txt>
          <Txt variant="label" style={{ fontSize: 14, textAlign: 'center' }}>
            {s.count ? `Across ${s.count} ${s.count === 1 ? 'bill' : 'bills'}` : 'No bills revealed yet'}
            {last.total > 0 && s.count ? (
              <>
                {' · '}
                <Txt variant="label" style={{ fontSize: 14 }}>
                  {inr(Math.abs(diff))} {diff > 0 ? 'more' : 'less'}
                </Txt>
                {` than ${monthName(addMonths(at, -1))}`}
              </>
            ) : null}
          </Txt>
        </View>

        <Label
          text="Spend limit"
          action={{ label: limit ? 'Change' : 'Set one', onPress: () => openSheet('limit') }}
        />
        {limit ? (
          <View
            style={styles.card}
            accessible
            accessibilityLabel={`Spend limit ${inr(limit)} a month. ${inr(s.total)} used, ${Math.round(used * 100)} percent. ${limitWords}`}>
            <View style={styles.limitTop}>
              <Txt style={styles.limitNum}>{inr(s.total)}</Txt>
              <Txt variant="label" color={colors.inkSoft} style={{ fontSize: 14 }}>
                of {inr(limit)} {isNow ? 'this month' : `in ${name}`}
              </Txt>
              <Txt variant="label" style={{ marginLeft: 'auto', fontSize: 14 }}>
                {Math.round(used * 100)}%
              </Txt>
            </View>
            <View style={styles.limitTrack}>
              <View
                style={[
                  styles.limitFill,
                  { width: `${Math.min(1, used) * 100}%` },
                  left < 0 && { backgroundColor: colors.outText },
                ]}
              />
              <View style={styles.mark80} />
            </View>
            <Txt variant="rowSub" color={warn ? colors.outText : colors.inkSoft} style={{ marginTop: 8 }}>
              {limitWords}
            </Txt>
          </View>
        ) : (
          <View style={styles.card}>
            <Txt variant="body" color={colors.inkSoft}>
              Pick how much you want your share of bills to come to in a month. You’ll see how much of
              it is gone and what’s left a day.
            </Txt>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <BigButton label="Set a monthly limit" lime light onPress={() => openSheet('limit')} />
            </View>
          </View>
        )}

        {s.count ? (
          <>
            <Label text="Week by week" />
            <View style={styles.card}>
              <View
                style={styles.chart}
                accessible
                accessibilityLabel={s.weeks
                  .map((w, i) => `Days ${WEEK_LABELS[i]}: ${inr(w)}`)
                  .join('. ')}>
                {s.weeks.map((w, i) => (
                  <View key={i} style={styles.col}>
                    <Txt variant="micro" color={w ? colors.ink : colors.inkHint} style={{ fontSize: 11 }}>
                      {w ? short(w) : '—'}
                    </Txt>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(4, Math.round((w / peak) * 110)) },
                        i === thisWeek && styles.barNow,
                        !w && styles.barNone,
                      ]}
                    />
                    <Txt variant="micro" color={i === thisWeek ? colors.ink : colors.inkHint} style={{ fontSize: 11 }}>
                      {WEEK_LABELS[i]}
                    </Txt>
                  </View>
                ))}
              </View>
              {thisWeek >= 0 ? (
                <Txt variant="rowSub" color={colors.inkHint} style={{ marginTop: 10 }}>
                  The lime bar is this week.
                </Txt>
              ) : null}
            </View>

            <Label text="The receipts don’t lie" />
            {s.biggest ? (
              <Pressable
                onPress={() => router.push(`/bill/${s.biggest!.bill.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Biggest hit: ${s.biggest.bill.name}, your share ${inr(s.biggest.share)}`}
                style={({ pressed }) => [styles.card, styles.hit, pressed && styles.pressed]}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Txt variant="eyebrow" color={colors.inkHint}>
                    BIGGEST HIT
                  </Txt>
                  <Txt variant="rowTitle" numberOfLines={1}>
                    {s.biggest.bill.name}
                  </Txt>
                </View>
                <Txt style={styles.hitAmount}>{inr(s.biggest.share)}</Txt>
              </Pressable>
            ) : null}
            <View style={styles.two}>
              {s.partner ? (
                <Pressable
                  onPress={() => router.push(`/person/${s.partner!.person}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Partner in crime: ${nameOf(s.partner.person)}, ${s.partner.bills} bills together`}
                  style={({ pressed }) => [styles.card, styles.half, pressed && styles.pressed]}>
                  <Txt variant="eyebrow" color={colors.inkHint}>
                    PARTNER IN CRIME
                  </Txt>
                  <View style={styles.partner}>
                    <Face id={s.partner.person} size={34} />
                    <Txt variant="rowTitle" numberOfLines={1} style={{ flex: 1 }}>
                      {nameOf(s.partner.person)}
                    </Txt>
                  </View>
                  <Txt variant="rowSub" color={colors.inkSoft}>
                    {s.partner.bills} {s.partner.bills === 1 ? 'bill' : 'bills'} together
                  </Txt>
                </Pressable>
              ) : null}
              {s.danger ? (
                <View style={[styles.card, styles.half]} accessible accessibilityLabel={`Danger day: ${s.danger.day}, ${inr(s.danger.total)}`}>
                  <Txt variant="eyebrow" color={colors.inkHint}>
                    DANGER DAY
                  </Txt>
                  <Txt variant="rowTitle" style={{ marginTop: 6 }}>
                    {s.danger.day}
                  </Txt>
                  <Txt variant="rowSub" color={colors.inkSoft}>
                    {inr(s.danger.total)} gone
                  </Txt>
                </View>
              ) : null}
            </View>

            {s.withMost.length ? (
              <>
                <Label text="Who you split with most" />
                <View style={[styles.card, { paddingVertical: 4 }]}>
                  {s.withMost.map((w, i) => (
                    <Pressable
                      key={w.person}
                      onPress={() => router.push(`/person/${w.person}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`${nameOf(w.person)}, ${w.bills} bills, your share ${inr(w.spent)}`}
                      style={[styles.who, i > 0 && styles.ruled]}>
                      <Face id={w.person} size={34} />
                      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                        <View style={styles.whoTop}>
                          <Txt variant="rowTitle" numberOfLines={1} style={{ flex: 1, fontSize: 15 }}>
                            {nameOf(w.person)}
                          </Txt>
                          <Txt variant="label" color={colors.inkSoft} style={{ fontSize: 13 }}>
                            {w.bills} {w.bills === 1 ? 'bill' : 'bills'}
                          </Txt>
                        </View>
                        <View style={styles.track}>
                          <View style={[styles.fill, { width: `${(w.bills / most) * 100}%` }]} />
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {s.byGroup.length ? (
              <>
                <Label text="By group" />
                <View style={[styles.card, { paddingVertical: 4 }]}>
                  {s.byGroup.map((c, i) => (
                    <View key={c.name} style={[styles.circleRow, i > 0 && styles.ruled]}>
                      <View style={styles.whoTop}>
                        <Txt variant="rowTitle" numberOfLines={1} style={{ flex: 1, fontSize: 15 }}>
                          {c.name}
                        </Txt>
                        <Txt variant="rowTitle" style={{ fontSize: 15 }}>
                          {inr(c.total)}
                        </Txt>
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${(c.total / topGroup) * 100}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

          </>
        ) : (
          <Txt variant="body" color={colors.inkSoft} style={styles.empty}>
            Once a bill’s damage is revealed, your share of it shows up here.
          </Txt>
        )}

        <Label text="Finance control" />
        <View style={[styles.card, { paddingVertical: 2 }]}>
          <ControlRow
            title="Warn me at 80%"
            sub={limit ? `A heads-up once ${inr(limit * 0.8)} of my ${inr(limit)} is gone` : 'Needs a spend limit first'}
            value={controls.warnAt80 && !!limit}
            disabled={!limit}
            onChange={(v) => setControl('warnAt80', v)}
          />
          <ControlRow
            ruled
            title="Check big bills"
            sub={`Ask before I add a bill over ${inr(controls.bigBill)}`}
            value={controls.checkBig}
            onChange={(v) => setControl('checkBig', v)}
            change={{ label: 'Change amount', onPress: () => openSheet('big') }}
          />
          <ControlRow
            ruled
            title="Sunday summary"
            sub="What I spent that week, every Sunday morning"
            value={controls.weekly}
            onChange={(v) => setControl('weekly', v)}
          />
          <ControlRow
            ruled
            title="Chase old money"
            sub="Remind me when someone has owed me for over 2 weeks"
            value={controls.chaseOld}
            onChange={(v) => setControl('chaseOld', v)}
          />
        </View>

        {s.count ? (
          <View style={{ flexDirection: 'row', marginTop: 18, marginHorizontal: gutter }}>
            <BigButton label={`Share my ${name}`} icon="upload" onPress={shareMonth} />
          </View>
        ) : null}
      </ScrollView>
      <LimitSheet
        key={`limit${sheetKey}`}
        open={sheet === 'limit'}
        title="Monthly spend limit"
        note="Your share of bills in a month. Nothing stops a bill going over it: it's a line to watch."
        value={controls.limit}
        picks={[
          ['Tight', 5000],
          ['Steady', 8000],
          ['Easy', 10000],
          ['Big month', 15000],
        ]}
        onSave={(n) => {
          setControl('limit', n);
          setSheet(null);
        }}
        onRemove={
          controls.limit
            ? () => {
                setControl('limit', null);
                setSheet(null);
              }
            : undefined
        }
        onClose={() => setSheet(null)}
      />
      <LimitSheet
        key={`big${sheetKey}`}
        open={sheet === 'big'}
        title="A big bill is over"
        note="Adding a bill bigger than this asks you to check it first."
        value={controls.bigBill}
        picks={[
          ['Strict', 1000],
          ['Usual', 2000],
          ['Relaxed', 5000],
          ['Only huge', 10000],
        ]}
        onSave={(n) => {
          setControl('bigBill', n);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <StatusShade />
    </View>
  );
}

/** One finance control: what it does in a line, a switch, and sometimes a Change link. */
function ControlRow({
  title,
  sub,
  value,
  onChange,
  disabled = false,
  ruled = false,
  change,
}: {
  title: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  ruled?: boolean;
  change?: { label: string; onPress: () => void };
}) {
  return (
    <View style={[styles.control, ruled && styles.ruled]}>
      <View style={{ flex: 1, minWidth: 0, gap: 2, opacity: disabled ? 0.5 : 1 }}>
        <Txt variant="rowTitle" style={{ fontSize: 15 }}>
          {title}
        </Txt>
        <Txt variant="rowSub" color={colors.inkSoft}>
          {sub}
        </Txt>
        {change ? (
          <Pressable onPress={change.onPress} hitSlop={10} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
            <Txt variant="label" style={{ fontSize: 13.5, textDecorationLine: 'underline' }}>
              {change.label}
            </Txt>
          </Pressable>
        ) : null}
      </View>
      <View pointerEvents={disabled ? 'none' : 'auto'} style={disabled ? { opacity: 0.5 } : null}>
        <Toggle value={value} onChange={onChange} label={title} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  months: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: gutter - 6,
    marginTop: 2,
  },
  step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hero: {
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: gutter,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.highlightSoft,
    boxShadow: shadow.s,
  },
  big: { fontFamily: fonts.display, fontSize: 44, lineHeight: 58 },
  card: {
    marginHorizontal: gutter,
    padding: 14,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: 'none' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 160 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  bar: {
    width: '100%',
    maxWidth: 44,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: colors.action,
  },
  barNow: { backgroundColor: colors.highlight },
  barNone: { borderColor: colors.hairline, backgroundColor: colors.quiet },
  hit: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  hitAmount: { fontFamily: fonts.display, fontSize: 24, lineHeight: 34 },
  two: { flexDirection: 'row', gap: 12, marginHorizontal: gutter },
  half: { flex: 1, marginHorizontal: 0, minHeight: 112, gap: 4 },
  partner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 8 },
  whoTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruled: { borderTopWidth: 1.5, borderTopColor: colors.hairline },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.quiet, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.action },
  circleRow: { gap: 6, minHeight: 56, paddingVertical: 10, justifyContent: 'center' },
  limitTop: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  limitNum: { fontFamily: fonts.display, fontSize: 26, lineHeight: 36 },
  limitTrack: {
    height: 16,
    marginTop: 8,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.quiet,
    overflow: 'hidden',
  },
  limitFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.highlight },
  /** The 80% line on the limit bar. */
  mark80: {
    position: 'absolute',
    left: '80%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.line,
  },
  control: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12 },
  empty: { marginTop: 16, marginHorizontal: gutter, textAlign: 'center' },
});
