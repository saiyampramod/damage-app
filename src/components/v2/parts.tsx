/**
 * Pieces for Bills (tags + list), People, and the person and group pages:
 *
 * - PlainPage: a page with only a back arrow on top; the hero carries the name.
 * - Hero: who or what, the one number, which way it goes, a line on what it means, then the
 *   two things to do (BigButtons) or the "Did it go through?" question (AskPay).
 * - KeyButton: Got it / Pay on a row. GroupStack: a group's icon, a small tag on a stack of two.
 * - PersonLine: a person on People, no buttons. AmountKey: the right side of a row with its button.
 * - Lists sit straight on the paper (no card around them).
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { people } from '@/data/mock';
import type { PersonId } from '@/data/types';
import { inr } from '@/lib/format';
import { colors, fonts, gutter, radius, shadow, stroke } from '@/theme/tokens';

import { DashedLine } from '../DashedLine';
import { DottedBackground } from '../DottedBackground';
import { Signed } from '../money/Signed';
import { Icon, type IconName } from '../Icon';
import { MiniTag, PersonSticker, type MiniTone } from '../ledger/parts';
import { Txt } from '../Txt';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** A person, group or bill page with only a back arrow on top. */
export function PlainPage({ children, overlay }: { children: ReactNode; overlay?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <DottedBackground />
      <View style={[styles.pageTop, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}>
          <Icon name="back" size={24} strokeWidth={2.6} color={colors.ink} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {overlay}
    </View>
  );
}

type Dir = { text: string; tone?: 'in' | 'out' };

export function Hero({
  lead,
  kicker,
  title,
  amount,
  dir,
  sum,
  children,
}: {
  lead?: ReactNode;
  kicker?: string;
  title: string;
  amount?: string;
  dir?: Dir;
  sum?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.hero}>
      {lead}
      {kicker ? (
        <Txt variant="eyebrow" color={colors.inkHint} style={styles.kicker}>
          {kicker.toUpperCase()}
        </Txt>
      ) : null}
      <Txt variant="title" accessibilityRole="header" style={styles.heroTitle}>
        {title}
      </Txt>
      {amount ? (
        <Txt
          variant="amountLarge"
          color={dir?.tone === 'in' ? colors.inText : dir?.tone === 'out' ? colors.outText : colors.ink}
          style={styles.heroAmount}>
          {dir?.tone === 'in' ? '+' : dir?.tone === 'out' ? '−' : ''}
          {amount}
        </Txt>
      ) : null}
      {dir ? (
        <Txt
          variant="label"
          color={
            dir.tone === 'in' ? colors.inText : dir.tone === 'out' ? colors.outText : colors.inkSoft
          }
          style={styles.heroDir}>
          {dir.text}
        </Txt>
      ) : null}
      {sum ? (
        <Txt variant="body" color={colors.inkHint} style={styles.heroSum}>
          {sum}
        </Txt>
      ) : null}
      {children ? <View style={styles.heroActs}>{children}</View> : null}
    </View>
  );
}

export function BigButtons({ children }: { children: ReactNode }) {
  return <View style={styles.bigRow}>{children}</View>;
}

/** A big button: white with a black edge, or lime for the main one. */
export function BigButton({
  label,
  onPress,
  lime = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  lime?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.big,
        { backgroundColor: lime ? colors.go : colors.paper },
        pressed && styles.bigPressed,
      ]}>
      {icon ? <Icon name={icon} size={18} strokeWidth={2.4} color={colors.ink} /> : null}
      <Txt variant="rowTitle" numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** After Pay opens UPI: the question, right where the buttons were. */
export function AskPay({
  person,
  amount,
  onNo,
  onYes,
}: {
  person: PersonId;
  amount: number;
  onNo: () => void;
  onYes: () => void;
}) {
  return (
    <View style={{ width: '100%' }}>
      <DashedLine thickness={2} color={colors.line} />
      <Txt variant="rowTitle" style={styles.ask}>
        {`Did ${inr(amount)} to ${people[person]?.name ?? 'them'} go through?`}
      </Txt>
      <BigButtons>
        <BigButton label="Not yet" onPress={onNo} />
        <BigButton lime label="Yes, it’s paid" onPress={onYes} />
      </BigButtons>
    </View>
  );
}

/** The small button on a row: Got it (they paid you) or Pay (dark). */
export function KeyButton({
  label,
  onPress,
  dark = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  dark?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.key,
        dark && { backgroundColor: colors.action },
        pressed && { transform: [{ translateX: 1 }, { translateY: 1 }], boxShadow: 'none' },
      ]}>
      <Txt variant="small" color={dark ? colors.onAction : colors.ink} style={styles.keyText}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** A group's icon: the small price tag sitting on a stack of two more. */
export function GroupStack({ tone }: { tone: MiniTone }) {
  const edge = tone === 'done' ? colors.inkMuted : colors.line;
  return (
    <View
      style={styles.stack}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.plate,
          {
            borderColor: edge,
            transform: [{ translateX: 7 }, { translateY: -4 }, { rotate: '8deg' }],
          },
        ]}
      />
      <View
        style={[
          styles.plate,
          {
            borderColor: edge,
            transform: [{ translateX: 3 }, { translateY: -2 }, { rotate: '2deg' }],
          },
        ]}
      />
      <View style={styles.plateTop}>
        <MiniTag tone={tone} />
      </View>
    </View>
  );
}

/** A dashed row that adds something ("Add a bill"). */
export function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.add, pressed && { backgroundColor: colors.pressed }]}>
      <Icon name="plus" size={18} strokeWidth={2.8} color={colors.ink} />
      <Txt variant="rowTitle">{label}</Txt>
    </Pressable>
  );
}

/** A person on People: which way the money goes, across how many bills, and the amount. No buttons. */
export function PersonLine({
  id,
  net,
  bills,
  first,
  onPress,
}: {
  id: PersonId;
  net: number;
  bills: number;
  first?: boolean;
  onPress: () => void;
}) {
  const name = people[id]?.name ?? 'Someone';
  const owed = net >= 0.5;
  const owe = net <= -0.5;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        owed
          ? `${name}, owes you ${inr(net)}`
          : owe
            ? `${name}, you owe ${inr(net)}`
            : `${name}, square`
      }
      style={({ pressed }) => [styles.person, pressed && { backgroundColor: colors.pressed }]}>
      {first ? null : <View style={styles.divider} />}
      <PersonSticker id={id} size={40} />
      <View style={styles.text}>
        <Txt variant="rowTitle" numberOfLines={1}>
          {name}
        </Txt>
        <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
          {owed || owe
            ? `${owed ? 'Owes you' : 'You owe'} · ${bills} ${bills === 1 ? 'bill' : 'bills'}`
            : 'All square'}
        </Txt>
      </View>
      {owed || owe ? <Signed value={net} /> : null}
    </Pressable>
  );
}

/** The right side of a row on a person or group page: the amount, maybe a word, and its button. */
export function AmountKey({
  amount,
  caption,
  button,
}: {
  amount: number;
  caption?: 'in' | 'out';
  button?: ReactNode;
}) {
  return (
    <View style={styles.amountKey}>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Txt variant="rowTitle">{inr(amount)}</Txt>
        {caption ? (
          <Txt variant="small" color={caption === 'in' ? colors.inText : colors.outText}>
            {caption === 'in' ? 'owes you' : 'you owe'}
          </Txt>
        ) : null}
      </View>
      {button}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 },
  pageTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 },
  hero: { alignItems: 'center', paddingHorizontal: gutter, paddingTop: 4 },
  kicker: { marginTop: 10, textAlign: 'center' },
  heroTitle: { fontSize: 26, lineHeight: 36, textAlign: 'center', marginTop: 4 },
  heroAmount: { fontSize: 40, lineHeight: 52 },
  heroDir: { fontSize: 15, lineHeight: 20 },
  heroSum: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6, maxWidth: 300 },
  heroActs: { width: '100%', marginTop: 16 },
  bigRow: { flexDirection: 'row', gap: 10, width: '100%' },
  big: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.m,
    boxShadow: shadow.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  bigPressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: shadow.xs },
  ask: { textAlign: 'center', marginTop: 14, marginBottom: 10 },
  key: {
    height: 34,
    paddingHorizontal: 12,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.paper,
    boxShadow: shadow.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontSize: 13, lineHeight: 16 },
  stack: { width: 40, height: 44 },
  plate: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: 30,
    height: 38,
    borderWidth: stroke.s,
    borderRadius: 8,
    backgroundColor: colors.paper,
  },
  plateTop: { position: 'absolute', left: 5, top: 5 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    marginHorizontal: gutter,
    marginTop: 22,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: radius.m,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  divider: {
    position: 'absolute',
    top: 0,
    left: 68,
    right: 0,
    height: 1,
    backgroundColor: colors.hairline,
  },
  text: { flex: 1, minWidth: 0, gap: 2 },
  dir: { fontFamily: fonts.bodyBold },
  amountKey: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
