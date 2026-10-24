/**
 * The pieces People, Bills and the person, group and bill pages are built from:
 * list cards, section labels, filter tags, rows (plain, person, tickable, settled,
 * between others), round avatars, small price tags and money.
 *
 * Money is plain black; the word with it says which way it goes, green for "you get back",
 * orange for "you owe". Lime is for you and for things you tap or have ticked.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { people } from '@/data/mock';
import { letterOf } from '@/data/quick';
import type { PersonId } from '@/data/types';
import { inr } from '@/lib/format';
import { avatarColor, colors, fonts, gutter, radius, shadow, stroke } from '@/theme/tokens';

import { Icon, type IconName } from '../Icon';
import { Txt } from '../Txt';

/* ---------- containers ---------- */

/** One white card per list, thin lines between rows. `bare` drops the black edge (People). */
export function Card({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  return <View style={[styles.card, bare && styles.bare]}>{children}</View>;
}

/** A section's own title (Circles), with a small light button on the right. */
export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.sectionTitle}>
      <Txt variant="section" accessibilityRole="header" style={styles.sectionText}>
        {title}
      </Txt>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [styles.tag, pressed && { backgroundColor: colors.pressed }]}>
          <Txt variant="small" style={styles.tagText}>
            {action.label}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Small grey section label in capitals, with a count or a text button on the right. */
export function Label({
  text,
  aside,
  action,
}: {
  text: string;
  aside?: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.label}>
      <Txt variant="eyebrow" color={colors.inkHint} accessibilityRole="header">
        {text.toUpperCase()}
      </Txt>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={12} accessibilityRole="button">
          <Txt variant="label" style={styles.link}>
            {action.label}
          </Txt>
        </Pressable>
      ) : aside ? (
        <Txt variant="small" color={colors.inkHint}>
          {aside}
        </Txt>
      ) : null}
    </View>
  );
}

/** A dashed note in place of an empty list. */
export function Note({ children }: { children: string }) {
  return (
    <View style={styles.note}>
      <Txt variant="body" color={colors.inkSoft} style={{ textAlign: 'center' }}>
        {children}
      </Txt>
    </View>
  );
}

const Divider = ({ left }: { left: number }) => <View style={[styles.divider, { left }]} />;

/* ---------- page top, chips, search ---------- */

/** "People" / "Bills", with an optional icon button on the right (search). */
export function TabTop({
  title,
  icon,
  onIcon,
  iconLabel,
}: {
  title: string;
  icon?: IconName;
  onIcon?: () => void;
  iconLabel?: string;
}) {
  return (
    <View style={styles.tabTop}>
      <Txt variant="pageTitle" accessibilityRole="header">
        {title}
      </Txt>
      {icon ? (
        <Pressable
          onPress={onIcon}
          accessibilityRole="button"
          accessibilityLabel={iconLabel}
          style={styles.iconBtn}>
          <Icon name={icon} size={22} strokeWidth={2.4} color={colors.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** One control for a few filters, the width of the search bar. The picked one is black. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: [K, string][];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <View style={styles.seg} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map(([k, text]) => {
        const on = k === value;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segBtn, on && styles.segOn]}>
            <Txt variant="label" color={on ? colors.onAction : colors.ink}>
              {text}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Filters as small, light tags in a row. The picked one is lime. */
export function Tags<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: [K, string][];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return (
    <View style={styles.tags} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map(([k, text]) => {
        const on = k === value;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.tag, on && styles.tagOn]}>
            <Txt variant="small" style={styles.tagText}>
              {text}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A filter chip. Picked is black; the rest are plain. `dashed` for "+ Circle". */
export function Chip({
  label,
  on = false,
  dashed = false,
  onPress,
  onLongPress,
}: {
  label: string;
  on?: boolean;
  dashed?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={[styles.chip, on && styles.chipOn, dashed && styles.chipDashed]}>
      <Txt variant="label" color={on ? colors.onAction : dashed ? colors.inkSoft : colors.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** For a search that opens from an icon. */
  autoFocus?: boolean;
}) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={20} color={colors.ink} />
      <TextInput
        autoFocus={autoFocus}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkHint}
        accessibilityLabel={placeholder}
        autoCorrect={false}
        style={styles.searchInput}
      />
      {value ? (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search">
          <Icon name="close" size={18} color={colors.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------- leads: what sits on the left of a row ---------- */

export function Disc({
  icon,
  fill = colors.paper,
  size = 40,
}: {
  icon: IconName;
  fill?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: fill },
      ]}>
      <Icon name={icon} size={Math.round(size * 0.45)} color={colors.ink} />
    </View>
  );
}

/** A person: a flat round avatar in their own colour with their initial (you are lime). */
export function PersonSticker({
  id,
  size = 40,
  ring = false,
}: {
  id: PersonId;
  size?: number;
  /** A white ring, for avatars that overlap. */
  ring?: boolean;
}) {
  const fs = Math.round(size * 0.42);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: avatarColor(id),
        },
        ring && styles.ring,
      ]}>
      <Txt variant="section" style={{ fontSize: fs, lineHeight: Math.round(fs * 1.3) }}>
        {letterOf(id)}
      </Txt>
    </View>
  );
}

/** A row of avatars, slightly overlapping. Everyone shows; nothing is folded into "+N". */
export function StickerRow({ ids, size = 24 }: { ids: PersonId[]; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {ids.map((id, i) => (
        <View key={id} style={{ marginLeft: i ? -6 : 0 }}>
          <PersonSticker id={id} size={size} ring />
        </View>
      ))}
    </View>
  );
}

/* ---------- small price tags (the Home tag, tiny) ---------- */

/** black: coming back to you, white: you owe or square, lime: waiting on you, faded: settled. */
export type MiniTone = 'owed' | 'owe' | 'needs' | 'done';

export function MiniTag({
  tone,
  tilt = -5,
  size = 1,
}: {
  tone: MiniTone;
  tilt?: number;
  size?: number;
}) {
  const dark = tone === 'owed';
  const w = Math.round(30 * size);
  const h = Math.round(38 * size);
  return (
    <View
      style={[
        styles.mini,
        {
          width: w,
          height: h,
          backgroundColor:
            tone === 'owed' ? colors.owedFill : tone === 'needs' ? colors.needsFill : colors.oweFill,
          opacity: tone === 'done' ? 0.45 : 1,
          transform: [{ rotate: `${tilt}deg` }],
        },
      ]}>
      <View
        style={[
          styles.miniHole,
          dark && { borderColor: colors.onOwed, backgroundColor: colors.owedFill },
        ]}
      />
      <Txt
        style={[styles.miniRupee, { fontSize: Math.round(15 * size), lineHeight: Math.round(19 * size) }]}
        color={dark ? colors.onOwed : colors.ink}>
        ₹
      </Txt>
    </View>
  );
}

/** The lead of a bill row: one small tag. */
export function BillTag({ tone }: { tone: MiniTone }) {
  return (
    <View
      style={styles.tagLead}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <MiniTag tone={tone} />
    </View>
  );
}

/** The lead of a group row: three small tags fanned out, because a group is several bills. */
export function GroupFan({ tones }: { tones: MiniTone[] }) {
  const t = [...tones.slice(0, 3)];
  while (t.length < 3) t.push(t[t.length - 1] ?? 'owe');
  return (
    <View
      style={styles.fan}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {t.map((tone, i) => (
        <View key={i} style={[styles.fanTag, { left: i * 9, top: i === 1 ? 3 : 6 }]}>
          <MiniTag tone={tone === 'done' ? 'owe' : tone} size={0.87} tilt={[-14, -2, 11][i]} />
        </View>
      ))}
    </View>
  );
}

/* ---------- small buttons inside rows ---------- */

/** dark: black (waiting on you, Pay). outline: white with an edge (Nudge). done: greyed (Nudged). */
export function Pill({
  label,
  onPress,
  kind = 'dark',
  icon,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  kind?: 'dark' | 'outline' | 'done';
  icon?: IconName;
  accessibilityLabel?: string;
}) {
  const ink = kind === 'dark' ? colors.onAction : kind === 'done' ? colors.inkHint : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 9, bottom: 9, left: 6, right: 6 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.pill,
        kind === 'dark' && { backgroundColor: colors.action, borderColor: colors.action },
        kind === 'done' && { borderColor: colors.chipEdge },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}>
      {icon ? <Icon name={icon} size={13} strokeWidth={2.6} color={ink} /> : null}
      <Txt variant="small" color={ink} style={styles.pillText}>
        {label}
      </Txt>
    </Pressable>
  );
}

/* ---------- money ---------- */

/** The right side of a row: the amount in black, which way it goes in grey under it. */
export function Money({ amount, settled = false }: { amount: number; settled?: boolean }) {
  if (settled)
    return (
      <Txt variant="rowTitle" color={colors.inkMuted}>
        Settled
      </Txt>
    );
  if (Math.abs(amount) < 0.5)
    return (
      <Txt variant="rowTitle" color={colors.inkMuted}>
        Square
      </Txt>
    );
  return (
    <View style={styles.money}>
      <Txt variant="rowTitle">{inr(amount)}</Txt>
      <Txt variant="small" color={amount > 0 ? colors.inText : colors.outText}>
        {amount > 0 ? 'you get back' : 'you owe'}
      </Txt>
    </View>
  );
}

/* ---------- rows ---------- */

type RowProps = {
  lead?: ReactNode;
  title: string;
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  first?: boolean;
  /** Settled: greyed out. */
  muted?: boolean;
  /** Bills shown inside an opened group: indented, on a slightly darker paper. */
  inset?: boolean;
  /** 'down' / 'up' for a group that opens in place, 'next' for one that opens a page. */
  chevron?: 'down' | 'up' | 'next';
  /** How many lines the grey line may take before it's cut. */
  subLines?: number;
  accessibilityLabel?: string;
};

/** A plain list row: lead, name and a grey line, money on the right. Tap to open. */
export function Row({
  lead,
  title,
  sub,
  right,
  onPress,
  onLongPress,
  first,
  muted,
  inset,
  chevron,
  subLines = 1,
  accessibilityLabel,
}: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={
        chevron === 'up' || chevron === 'down' ? { expanded: chevron === 'up' } : undefined
      }
      style={({ pressed }) => [
        styles.row,
        inset && styles.inset,
        pressed && { backgroundColor: colors.pressed },
      ]}>
      {first ? null : <Divider left={70} />}
      {lead}
      <View style={styles.text}>
        <Txt
          variant={inset ? 'body' : 'rowTitle'}
          color={muted ? colors.inkMuted : colors.ink}
          numberOfLines={1}>
          {title}
        </Txt>
        {sub ? (
          <Txt variant="rowSub" color={colors.inkHint} numberOfLines={subLines}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {right}
      {chevron ? (
        <View style={chevron === 'up' ? { transform: [{ rotate: '180deg' }] } : null}>
          <Icon
            name={chevron === 'next' ? 'chevron' : 'down'}
            size={18}
            strokeWidth={2.6}
            color={chevron === 'next' ? colors.inkMuted : colors.ink}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * A person on People or a circle's page: their name, which way the money goes and across how
 * many bills, then the amount with Nudge (they owe you) or Pay (you owe them).
 */
export function PersonRow({
  id,
  net,
  bills,
  nudged,
  onPress,
  onNudge,
  onPay,
  first,
}: {
  id: PersonId;
  net: number;
  bills: number;
  nudged: boolean;
  onPress: () => void;
  onNudge: () => void;
  onPay: () => void;
  first?: boolean;
}) {
  const name = people[id]?.name ?? 'Someone';
  const owed = net >= 0.5;
  const owe = net <= -0.5;
  const count = `${bills} ${bills === 1 ? 'bill' : 'bills'}`;
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
      style={({ pressed }) => [styles.personRow, pressed && { backgroundColor: colors.pressed }]}>
      {first ? null : <Divider left={68} />}
      <PersonSticker id={id} size={40} />
      <View style={styles.text}>
        <Txt variant="rowTitle" numberOfLines={1}>
          {name}
        </Txt>
        <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
          {owed || owe ? (
            <>
              <Txt
                variant="rowSub"
                color={owed ? colors.inText : colors.outText}
                style={styles.dir}>
                {owed ? 'Owes you' : 'You owe'}
              </Txt>
              {` · ${count}`}
            </>
          ) : (
            'All square'
          )}
        </Txt>
      </View>
      {owed || owe ? (
        <View style={styles.personRight}>
          <Txt variant="rowTitle">{inr(net)}</Txt>
          {owed ? (
            <Pill
              kind={nudged ? 'done' : 'outline'}
              icon={nudged ? 'check' : 'bell'}
              label={nudged ? 'Nudged' : 'Nudge'}
              accessibilityLabel={`Nudge ${name}${nudged ? ' again' : ''}`}
              onPress={onNudge}
            />
          ) : (
            <Pill label="Pay" accessibilityLabel={`Pay ${name}`} onPress={onPay} />
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

/** A text-only row, e.g. "Open Goa trip 2026" at the bottom of an opened group. */
export function LinkRow({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: colors.pressed }]}>
      <Divider left={70} />
      <Txt variant="label" style={styles.link}>
        {text}
      </Txt>
    </Pressable>
  );
}

/** One open amount you can tick. The tick picks it for the bar; the rest of the row opens it. */
export function TickRow({
  checked,
  onTick,
  onOpen,
  lead,
  title,
  sub,
  amount,
  caption,
  first,
}: {
  checked: boolean;
  onTick: () => void;
  onOpen: () => void;
  lead?: ReactNode;
  title: string;
  sub?: string;
  amount: number;
  /** Only when this row goes the other way from the page's total. */
  caption?: string;
  first?: boolean;
}) {
  return (
    <View style={styles.tickRow}>
      {first ? null : <Divider left={56} />}
      <Pressable
        onPress={onTick}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`Include ${title}`}
        style={styles.tickArea}>
        <View style={[styles.box, checked && styles.boxOn]}>
          {checked ? <Icon name="check" size={16} strokeWidth={3} color={colors.ink} /> : null}
        </View>
      </Pressable>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${inr(amount)}`}
        style={({ pressed }) => [styles.tickBody, pressed && { backgroundColor: colors.pressed }]}>
        {lead}
        <View style={styles.text}>
          <Txt variant="rowTitle" numberOfLines={1}>
            {title}
          </Txt>
          {sub ? (
            <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
              {sub}
            </Txt>
          ) : null}
        </View>
        <View style={styles.money}>
          <Txt variant="rowTitle">{inr(amount)}</Txt>
          {caption ? (
            <Txt variant="small" color={colors.inkHint}>
              {caption}
            </Txt>
          ) : null}
        </View>
        <Icon name="chevron" size={18} strokeWidth={2.6} color={colors.inkMuted} />
      </Pressable>
    </View>
  );
}

/** Something already settled: a grey check where the tick would be. */
export function DoneRow({
  lead,
  title,
  sub,
  onOpen,
  first,
}: {
  lead?: ReactNode;
  title: string;
  sub?: string;
  onOpen?: () => void;
  first?: boolean;
}) {
  return (
    <View style={styles.tickRow}>
      {first ? null : <Divider left={56} />}
      <View style={styles.tickArea}>
        <Icon name="check" size={18} strokeWidth={2.8} color={colors.inkMuted} />
      </View>
      <Pressable
        onPress={onOpen}
        disabled={!onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${title}, settled`}
        style={({ pressed }) => [styles.tickBody, pressed && { backgroundColor: colors.pressed }]}>
        {lead}
        <View style={styles.text}>
          <Txt variant="rowTitle" color={colors.inkMuted} numberOfLines={1}>
            {title}
          </Txt>
          {sub ? (
            <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
              {sub}
            </Txt>
          ) : null}
        </View>
        <Txt variant="rowTitle" color={colors.inkMuted}>
          Settled
        </Txt>
      </Pressable>
    </View>
  );
}

/** A payment in a group between two other people, lined up with the ticked ones: nothing to do. */
export function OtherPayRow({
  from,
  to,
  amount,
  done,
  first,
}: {
  from: PersonId;
  to: PersonId;
  amount: number;
  done: boolean;
  first?: boolean;
}) {
  const name = (id: PersonId) => people[id]?.name ?? 'Someone';
  return (
    <View
      style={styles.tickRow}
      accessible
      accessibilityLabel={`${name(from)} pays ${name(to)} ${inr(amount)}${done ? ', paid' : ''}`}>
      {first ? null : <Divider left={56} />}
      <View style={styles.tickArea} />
      <View style={styles.tickBody}>
        <PersonSticker id={from} size={32} />
        <View style={styles.text}>
          <Txt variant="rowTitle" color={done ? colors.inkMuted : colors.ink} numberOfLines={1}>
            {name(from)} pays {name(to)}
          </Txt>
          <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
            {done ? 'Paid' : 'Between them'}
          </Txt>
        </View>
        <Txt variant="rowTitle" color={done ? colors.inkMuted : colors.ink} style={styles.otherAmt}>
          {inr(amount)}
        </Txt>
      </View>
    </View>
  );
}

/** A payment between two other people: shown, nothing to do. */
export function PairRow({
  from,
  to,
  amount,
  done,
  first,
}: {
  from: PersonId;
  to: PersonId;
  amount: number;
  done: boolean;
  first?: boolean;
}) {
  const name = (id: PersonId) => people[id]?.name ?? 'Someone';
  return (
    <View
      style={styles.pairRow}
      accessible
      accessibilityLabel={`${name(from)} pays ${name(to)} ${inr(amount)}${done ? ', paid' : ''}`}>
      {first ? null : <Divider left={16} />}
      <View style={styles.pair}>
        <PersonSticker id={from} size={26} />
        <Icon name="arrow" size={14} strokeWidth={2.6} color={colors.ink} />
        <PersonSticker id={to} size={26} />
      </View>
      <Txt
        variant="rowTitle"
        color={done ? colors.inkMuted : colors.ink}
        style={styles.text}
        numberOfLines={1}>
        {name(from)} pays {name(to)}
      </Txt>
      <Txt variant="rowTitle" color={done ? colors.inkMuted : colors.ink}>
        {done ? 'Paid' : inr(amount)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  tabTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 8,
    minHeight: 56,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  seg: {
    marginHorizontal: gutter,
    marginTop: 12,
    height: 46,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    padding: 3,
    gap: 3,
  },
  segBtn: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.action },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.chipEdge,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.action, borderColor: colors.action },
  chipDashed: { borderStyle: 'dashed' },
  search: {
    marginHorizontal: gutter,
    marginTop: 10,
    height: 46,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    backgroundColor: colors.paper,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  card: {
    marginHorizontal: gutter,
    backgroundColor: colors.paper,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.l,
    overflow: 'hidden',
  },
  bare: { borderWidth: 0 },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 20,
    marginRight: gutter,
  },
  sectionText: { lineHeight: 26 },
  tags: { flexDirection: 'row', gap: 6, marginHorizontal: gutter, marginTop: 10 },
  tag: {
    height: 32,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.chipEdge,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagOn: { backgroundColor: colors.highlight, borderColor: colors.line },
  tagText: { fontSize: 13, lineHeight: 16 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 2, borderColor: colors.avatarRing },
  mini: {
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 8,
    boxShadow: shadow.xs,
  },
  miniHole: {
    position: 'absolute',
    top: 3,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  miniRupee: { position: 'absolute', left: 0, right: 0, bottom: 4, textAlign: 'center', fontFamily: fonts.bodyHeavy },
  tagLead: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  fan: { width: 48, height: 44 },
  fanTag: { position: 'absolute' },
  pill: {
    height: 26,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pillText: { fontFamily: fonts.bodyHeavy, lineHeight: 15 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  personRight: { alignItems: 'flex-end', gap: 4 },
  dir: { fontFamily: fonts.bodyBold },
  otherAmt: { marginRight: 30 },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
    minHeight: 24,
  },
  link: { textDecorationLine: 'underline' },
  note: {
    marginHorizontal: gutter,
    padding: 18,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.inkMuted,
    borderRadius: radius.m,
  },
  divider: { position: 'absolute', top: 0, right: 0, height: 1, backgroundColor: colors.hairline },
  disc: {
    borderWidth: stroke.s,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  money: { alignItems: 'flex-end', gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inset: { minHeight: 58, paddingLeft: 70, backgroundColor: colors.inset },
  text: { flex: 1, minWidth: 0, gap: 2 },
  linkRow: {
    minHeight: 48,
    justifyContent: 'center',
    paddingLeft: 70,
    backgroundColor: colors.inset,
  },
  tickRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 66 },
  tickArea: { width: 56, alignItems: 'center', justifyContent: 'center', paddingLeft: 4 },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.ticked },
  tickBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingRight: 12,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pair: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
