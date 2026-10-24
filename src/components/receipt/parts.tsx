/**
 * The look of a bill made from a receipt, from the "After the scan, earlier" design: a top line
 * with the screen's name in the middle, chunky cards and buttons with hard shadows, small chips,
 * a bottom bar that fades in over the page, sheet headers and footers, the number keys and the
 * split bar. Colours, fonts and shadows all come from the theme.
 */
import { router } from 'expo-router';
import type { ReactNode, RefObject } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Pattern, Rect, Stop } from 'react-native-svg';

import type { PersonId } from '@/data/types';
import { avatarColor, colors, fonts, gutter, radius, shadow, stroke } from '@/theme/tokens';

import { DashedLine } from '../DashedLine';
import { DottedBackground } from '../DottedBackground';
import { Icon, type IconName } from '../Icon';
import { PersonSticker } from '../ledger/parts';
import { Txt } from '../Txt';

/* ---------- the screen ---------- */

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** Back on the left, the screen's name in the middle, round buttons on the right; the page scrolls under a bottom bar. */
export function Frame({
  title,
  right,
  bar,
  overlay,
  scrollRef,
  children,
}: {
  title: string;
  right?: ReactNode;
  bar?: ReactNode;
  overlay?: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <DottedBackground />
      <View style={[styles.top, { marginTop: insets.top }]}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}>
          <Icon name="back" size={24} strokeWidth={2.6} color={colors.ink} />
        </Pressable>
        <View style={styles.titleWrap} pointerEvents="none">
          <Txt variant="rowTitle" accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {title}
          </Txt>
        </View>
        <View style={styles.right}>{right}</View>
      </View>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + (bar ? 120 : 40) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {bar}
      {overlay}
    </View>
  );
}

/** A round button on the right of the top line, with a small lime count on it. */
export function HeadButton({
  icon,
  label,
  onPress,
  count,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  count?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.headBtn, pressed && styles.pressedSmall]}>
      <Icon name={icon} size={18} color={colors.ink} />
      {count ? (
        <View style={styles.headBadge}>
          <Badge text={String(count)} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** The bar at the bottom: the page fades to white behind its buttons. */
export function BottomBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
      <View style={styles.fade} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="barFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.paper} stopOpacity={0} />
              <Stop offset="1" stopColor={colors.paper} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#barFade)" />
        </Svg>
      </View>
      <View style={styles.barFill} pointerEvents="none" />
      {children}
    </View>
  );
}

/* ---------- buttons ---------- */

/** The big pill at the bottom. lime: the next step. grey: not there yet (it says what's missing). */
export function Cta({
  label,
  onPress,
  kind = 'lime',
  icon,
}: {
  label: string;
  onPress: () => void;
  kind?: 'lime' | 'grey' | 'dark';
  icon?: IconName;
}) {
  const ink = kind === 'grey' ? colors.onQuiet : kind === 'dark' ? colors.onAction : colors.onGo;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.cta,
        kind === 'lime' && styles.ctaLime,
        kind === 'grey' && { backgroundColor: colors.quiet },
        kind === 'dark' && { backgroundColor: colors.action },
        pressed && kind === 'lime' && styles.pressed,
      ]}>
      <Txt variant="rowTitle" color={ink} numberOfLines={1}>
        {label}
      </Txt>
      {icon ? <Icon name={icon} size={18} strokeWidth={2.6} color={ink} /> : null}
    </Pressable>
  );
}

/** A chunky button with a black edge and a hard shadow. */
export function BigButton({
  label,
  onPress,
  lime = false,
  icon,
  disabled = false,
  height = 52,
  light = false,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  lime?: boolean;
  icon?: IconName;
  disabled?: boolean;
  height?: number;
  /** A smaller shadow, for a button inside a card. */
  light?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.big,
        { height },
        light && { boxShadow: shadow.xs },
        lime && { backgroundColor: colors.go },
        disabled && styles.bigOff,
        style,
        pressed && !disabled && styles.pressed,
      ]}>
      {icon ? <Icon name={icon} size={18} color={disabled ? colors.inkMuted : colors.ink} /> : null}
      <Txt
        variant="rowTitle"
        color={disabled ? colors.inkMuted : colors.ink}
        numberOfLines={1}
        style={height < 50 ? { fontSize: 15 } : null}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** A small square button with a hard shadow (Copy). */
export function KeyButton({
  label,
  onPress,
  on = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  on?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={5}
      style={({ pressed }) => [
        styles.key,
        on && { backgroundColor: colors.highlight },
        pressed && styles.pressedSmall,
      ]}>
      {on ? <Icon name="check" size={14} strokeWidth={3} color={colors.ink} /> : null}
      <Txt variant="small" style={styles.heavy} accessibilityLiveRegion="polite">
        {label}
      </Txt>
    </Pressable>
  );
}

/* ---------- cards, chips and badges ---------- */

/** A white card with a black edge and a hard shadow. */
/** `bare`: no edge or shadow, just white, for a list that is the whole section (who paid). */
export function Card({ children, style, bare = false }: { children: ReactNode; style?: ViewStyle; bare?: boolean }) {
  return <View style={[styles.card, bare && styles.cardBare, style]}>{children}</View>;
}

/** Small grey capitals inside a card ("Who's here"). */
export function CardLabel({ text }: { text: string }) {
  return (
    <Txt variant="eyebrow" color={colors.inkHint}>
      {text.toUpperCase()}
    </Txt>
  );
}

/** plain: a light edge. dark: black ("1 left"). ok: lime with a tick ("Tagged"). */
export function Chip({ text, tone = 'plain' }: { text: string; tone?: 'plain' | 'dark' | 'ok' }) {
  return (
    <View
      style={[
        styles.chip,
        tone === 'dark' && { backgroundColor: colors.action, borderColor: colors.action },
        tone === 'ok' && { backgroundColor: colors.highlight, borderColor: colors.line },
      ]}>
      {tone === 'ok' ? <Icon name="check" size={12} strokeWidth={3.4} color={colors.ink} /> : null}
      <Txt variant="small" color={tone === 'dark' ? colors.onAction : colors.ink}>
        {text}
      </Txt>
    </View>
  );
}

/** A small lime count. `warn` turns it orange (about to take someone off). */
export function Badge({ text, warn = false }: { text: string; warn?: boolean }) {
  return (
    <View
      style={[
        styles.badge,
        warn && { backgroundColor: colors.outText, borderColor: colors.outText },
      ]}>
      <Txt variant="micro" color={warn ? colors.onAction : colors.ink} style={styles.badgeText}>
        {text}
      </Txt>
    </View>
  );
}

/** The group a bill is in, as a small outlined pill. */
export function GroupBadge({ name, style }: { name: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.groupBadge, style]}>
      <Txt variant="small" style={styles.heavy} numberOfLines={1}>
        {name}
      </Txt>
    </View>
  );
}

/** A person in a circle. `ring` draws the black ring of someone who's tagged. */
export function Face({
  id,
  size = 42,
  ring,
  dim = false,
}: {
  id: PersonId;
  size?: number;
  ring?: 'on' | 'warn';
  dim?: boolean;
}) {
  if (!ring) {
    return (
      <View style={dim ? { opacity: 0.45 } : null}>
        <PersonSticker id={id} size={size} />
      </View>
    );
  }
  return (
    <View
      style={[
        styles.ring,
        {
          width: size + 9,
          height: size + 9,
          borderRadius: (size + 9) / 2,
          borderColor: ring === 'warn' ? colors.outText : colors.line,
        },
      ]}>
      <PersonSticker id={id} size={size} />
    </View>
  );
}

/** One line of someone's share: "Nachos ÷ 4 ..... ₹113". `total` is the bold last line, ruled off. */
export function ShareLine({
  label,
  value,
  total = false,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <>
      {total ? <DashedLine thickness={1.5} style={{ marginTop: 4, marginBottom: 2 }} /> : null}
      <View style={styles.line}>
        <Txt
          numberOfLines={1}
          color={total ? colors.ink : colors.inkSoft}
          style={[styles.lineText, { flex: 1 }, total && styles.heavy]}>
          {label}
        </Txt>
        <Txt color={total ? colors.ink : colors.inkSoft} style={[styles.lineText, styles.heavy]}>
          {value}
        </Txt>
      </View>
    </>
  );
}

/* ---------- sheets ---------- */

/** A sheet's title in display type, something before it (an avatar), and a close cross. */
export function SheetHead({
  title,
  lead,
  onClose,
}: {
  title: string;
  lead?: ReactNode;
  onClose: () => void;
}) {
  return (
    <View style={styles.sheetHead}>
      {lead}
      <Txt variant="card" accessibilityRole="header" numberOfLines={1} style={styles.sheetTitle}>
        {title}
      </Txt>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={styles.back}>
        <Icon name="close" size={22} strokeWidth={2.6} color={colors.ink} />
      </Pressable>
    </View>
  );
}

/** A sheet's buttons, side by side at the bottom. */
export function SheetFoot({ children }: { children: ReactNode }) {
  return <View style={styles.sheetFoot}>{children}</View>;
}

/** A grey line of help in a sheet. */
export function SheetNote({ children }: { children: string }) {
  return (
    <Txt variant="body" color={colors.inkSoft} style={styles.sheetNote}>
      {children}
    </Txt>
  );
}

/* ---------- amounts ---------- */

/** The amount being typed, big and centred. Grey until it's been typed over. */
export function AmountBox({
  value,
  faint = false,
  unit = '₹',
  warn = false,
}: {
  value: string;
  faint?: boolean;
  /** ₹ goes in front; % goes after, and shows what's typed as it is (12.5). */
  unit?: '₹' | '%';
  /** Red: more than it can be (more than the bill). */
  warn?: boolean;
}) {
  const n = Number(value || 0);
  const ink = warn ? colors.outText : !n || faint ? colors.inkMuted : colors.ink;
  const pct = unit === '%';
  return (
    <View
      style={styles.amountBox}
      accessible
      accessibilityLabel={pct ? `${n} percent` : `₹${n}`}
      accessibilityLiveRegion="polite">
      {pct ? null : <Txt style={[styles.amountRupee, { color: ink }]}>₹</Txt>}
      <Txt style={[styles.amount, { color: ink }]}>
        {pct ? value || '0' : n.toLocaleString('en-IN')}
      </Txt>
      {pct ? <Txt style={[styles.amountRupee, { color: ink }]}>%</Txt> : null}
    </View>
  );
}

/**
 * The black two-step switch under a bill's or a group's name ("Items | Who paid",
 * "Bills | Settle up"). A step that's complete shows a lime tick when you're not on it.
 */
export function StepTabs<K extends string>({
  steps,
  value,
  onChange,
  label,
}: {
  steps: [K, string, boolean][];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <View style={styles.stepTabs} accessibilityRole="tablist" accessibilityLabel={label}>
      {steps.map(([k, text, done]) => {
        const on = value === k;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.stepTab, on && { backgroundColor: colors.action }]}>
            {done && !on ? (
              <View style={styles.stepTabOk}>
                <Icon name="check" size={11} strokeWidth={3.6} color={colors.ink} />
              </View>
            ) : null}
            <Txt variant="rowTitle" color={on ? colors.onAction : colors.ink} style={{ fontSize: 15 }}>
              {text}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Two choices in a pill, the picked one lime ("Split evenly | Someone had more", "₹ | %"). */
export function PillToggle<K extends string>({
  options,
  value,
  onChange,
  label,
  style,
}: {
  options: [K, string][];
  value: K;
  onChange: (k: K) => void;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.toggle, style]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(([k, text]) => {
        const on = value === k;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={[styles.toggleBtn, on && styles.toggleOn]}>
            <Txt variant="label">{text}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'] as const;

/** Number keys for an amount in rupees (up to 7 digits). */
export function Keypad({
  value,
  onChange,
  fresh = false,
  decimal = false,
}: {
  value: string;
  onChange: (v: string) => void;
  /** The first key typed replaces what's there. */
  fresh?: boolean;
  /** A point instead of 00, for a percentage like 12.5. Two places at most. */
  decimal?: boolean;
}) {
  const keys = decimal ? KEYS.map((k) => (k === '00' ? '.' : k)) : KEYS;
  function press(k: string) {
    let a = fresh ? '' : value;
    if (k === 'del') a = a.slice(0, -1);
    else if (k === '.') a = a.includes('.') ? a : `${a || '0'}.`;
    else if (decimal && /\.\d{2}$/.test(a)) return;
    else if (a.length < 7) a = (a + k).slice(0, 7);
    onChange(a.replace(/^0+(?=\d)/, ''));
  }
  return (
    <View style={styles.keys}>
      {keys.map((k) => (
        <Pressable
          key={k}
          onPress={() => press(k)}
          accessibilityRole="button"
          accessibilityLabel={k === 'del' ? 'Delete' : k === '.' ? 'Point' : k}
          style={({ pressed }) => [
            styles.keyPad,
            k === 'del' && styles.keyDel,
            pressed && { backgroundColor: k === 'del' ? colors.highlight : colors.hairline },
          ]}>
          {k === 'del' ? (
            <Icon name="erase" size={24} strokeWidth={2.2} color={colors.ink} />
          ) : (
            <Txt variant="bodyLarge">{k}</Txt>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/** Quick amounts above the keys ("Full bill", "What's left", "Half"). The picked one is lime. */
export function Tiles({
  tiles,
  value,
  onPick,
}: {
  tiles: { label: string; value: number; shown: string }[];
  value: number;
  onPick: (v: number) => void;
}) {
  return (
    <View style={styles.tiles}>
      {tiles.map((t) => {
        const on = value === t.value;
        return (
          <Pressable
            key={t.label}
            onPress={() => onPick(t.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${t.label}, ${t.shown}`}
            style={[styles.tile, on && styles.tileOn]}>
            <Txt variant="small" color={colors.inkSoft}>
              {t.label}
            </Txt>
            <Txt variant="label">{t.shown}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** − n + with square grey buttons. `outlined` for the white ones inside a split row. */
export function Stepper({
  shown,
  onLess,
  onMore,
  canLess,
  canMore,
  what,
  outlined = false,
}: {
  shown: string;
  onLess: () => void;
  onMore: () => void;
  canLess: boolean;
  canMore: boolean;
  /** Read out with the buttons, e.g. "Lemonade for Riya". */
  what: string;
  outlined?: boolean;
}) {
  const btn = (sign: 'minus' | 'plus', can: boolean, onPress: () => void, label: string) => (
    <Pressable
      onPress={onPress}
      disabled={!can}
      hitSlop={3}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !can }}
      style={[styles.step, outlined && styles.stepOutlined, outlined && !can && styles.stepOff]}>
      <Icon name={sign} size={18} strokeWidth={3} color={can ? colors.ink : colors.inkMuted} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('minus', canLess, onLess, `Less ${what}`)}
      <Txt variant="bodyStrong" style={styles.stepN}>
        {shown}
      </Txt>
      {btn('plus', canMore, onMore, `More ${what}`)}
    </View>
  );
}

/* ---------- the split bar ---------- */

/**
 * The whole item as one bar: a slice per person in their colour, and what nobody has claimed
 * yet left hatched. The words beside it say the same thing.
 */
export function SplitBar({ qty, slices }: { qty: number; slices: [PersonId, number][] }) {
  const basis = Math.max(
    slices.reduce((a, [, n]) => a + n, 0),
    qty,
  );
  const shown = basis > 0 ? slices.filter(([, n]) => n > 1e-9) : [];
  return (
    <View
      style={styles.splitBar}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="unclaimed"
            patternUnits="userSpaceOnUse"
            width={7}
            height={7}
            patternTransform="rotate(45)">
            <Rect width={3} height={7} fill={colors.chipEdge} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#unclaimed)" />
      </Svg>
      {shown.map(([p, n], i) => (
        <View
          key={p}
          style={[
            { width: `${(n / basis) * 100}%`, backgroundColor: avatarColor(p) },
            i > 0 && styles.seam,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 6,
    paddingRight: 10,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleWrap: {
    position: 'absolute',
    left: 100,
    right: 100,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center' },
  right: { flexDirection: 'row', gap: 10 },
  headBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    boxShadow: shadow.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headBadge: { position: 'absolute', top: -6, right: -6 },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: 'none' },
  pressedSmall: { transform: [{ translateX: 1 }, { translateY: 1 }], boxShadow: 'none' },
  heavy: { fontFamily: fonts.bodyHeavy },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 26,
    paddingHorizontal: gutter,
  },
  fade: { position: 'absolute', left: 0, right: 0, top: 0, height: 26 },
  barFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 26,
    bottom: 0,
    backgroundColor: colors.paper,
  },
  cta: {
    flex: 1,
    height: 54,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  ctaLime: {
    backgroundColor: colors.go,
    borderWidth: stroke.s,
    borderColor: colors.line,
    boxShadow: shadow.s,
  },
  big: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.m,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  bigOff: { backgroundColor: colors.quiet, borderColor: colors.chipEdge, boxShadow: 'none' },
  key: {
    height: 34,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.paper,
    boxShadow: shadow.xs,
  },
  card: {
    marginTop: 12,
    marginHorizontal: gutter,
    padding: 14,
    backgroundColor: colors.paper,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    boxShadow: shadow.s,
  },
  cardBare: { borderWidth: 0, boxShadow: 'none', borderRadius: 0, marginHorizontal: 0, paddingHorizontal: gutter },
  chip: {
    height: 24,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.chipEdge,
    backgroundColor: colors.paper,
  },
  badge: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10.5, lineHeight: 14 },
  groupBadge: {
    alignSelf: 'flex-start',
    height: 26,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  ring: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineText: { fontFamily: fonts.bodyBold, fontSize: 13.5, lineHeight: 24 },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: gutter,
    paddingRight: 6,
    paddingBottom: 4,
  },
  sheetTitle: { flex: 1, minWidth: 0, lineHeight: 30 },
  sheetFoot: { flexDirection: 'row', gap: 10, paddingHorizontal: gutter, paddingTop: 10 },
  sheetNote: { marginHorizontal: 18, marginTop: 4, marginBottom: 8, lineHeight: 22 },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
  },
  amountRupee: { fontFamily: fonts.display, fontSize: 32, lineHeight: 44 },
  amount: { fontFamily: fonts.display, fontSize: 50, lineHeight: 64 },
  keys: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: gutter,
    paddingTop: 10,
  },
  keyPad: {
    width: '31.6%',
    flexGrow: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.pressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** The delete key is lime, so it reads as the one key that isn't a digit. */
  keyDel: { backgroundColor: colors.highlight },
  tiles: { flexDirection: 'row', gap: 8, paddingHorizontal: gutter, paddingTop: 12 },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderWidth: stroke.s,
    borderColor: colors.chipEdge,
    borderRadius: 12,
    backgroundColor: colors.paper,
  },
  tileOn: { backgroundColor: colors.highlight, borderColor: colors.line },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.pressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOutlined: {
    backgroundColor: colors.paper,
    borderWidth: stroke.s,
    borderColor: colors.line,
  },
  stepOff: { borderColor: colors.chipEdge },
  stepN: { minWidth: 26, textAlign: 'center' },
  splitBar: {
    height: 14,
    flexDirection: 'row',
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  seam: { borderLeftWidth: stroke.s, borderLeftColor: colors.line },
  toggle: {
    flexDirection: 'row',
    gap: 3,
    height: 46,
    marginTop: 8,
    marginHorizontal: gutter,
    padding: 3,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  toggleBtn: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.go, borderWidth: stroke.s, borderColor: colors.line },
  stepTabs: {
    flexDirection: 'row',
    gap: 3,
    height: 50,
    marginTop: 14,
    marginHorizontal: gutter,
    padding: 3,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.paper,
  },
  stepTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
  },
  stepTabOk: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.ticked,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
