/** Small pieces shared by the + screen, the Quick bill sheet and its pickers. */
import type { ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

import type { PersonId } from '@/data/types';
import { colors, fonts, gutter, radius, stroke, type } from '@/theme/tokens';

import { CircleButton } from '../CircleButton';
import { Icon, type IconName } from '../Icon';
import { PersonSticker as Avatar } from '../ledger/parts';
import { Txt } from '../Txt';

/** Round outlined icon holder. */
export function Disc({
  icon,
  size = 40,
  fill = colors.paper,
  dashed = false,
}: {
  icon: IconName;
  size?: number;
  fill?: string;
  dashed?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: stroke.m,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: colors.line,
        backgroundColor: fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={icon} size={Math.round(size * 0.5)} color={colors.ink} />
    </View>
  );
}

/**
 * A person in a picker: the same round avatar, in their own colour, as everywhere else.
 * `picked` is kept for callers; the row's tick box shows who's picked.
 */
export function PersonSticker({
  id,
  size = 32,
  ring = false,
}: {
  id: PersonId;
  size?: number;
  picked?: boolean;
  ring?: boolean;
}) {
  return <Avatar id={id} size={size} ring={ring} />;
}

/** A few avatars overlapping, then "+N". */
export function Stack({ ids, max = 3, size = 30 }: { ids: PersonId[]; max?: number; size?: number }) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} accessible={false}>
      {shown.map((id, i) => (
        <View key={id} style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: 10 - i }}>
          <PersonSticker id={id} size={size} ring />
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.32 }]}>
          <Txt variant="micro">+{extra}</Txt>
        </View>
      ) : null}
    </View>
  );
}

export function CheckBox({ on }: { on: boolean }) {
  return (
    <View style={[styles.check, on && { backgroundColor: colors.highlight }]}>
      {on ? <Icon name="check" size={18} strokeWidth={3} color={colors.ink} /> : null}
    </View>
  );
}

export function Radio({ on }: { on: boolean }) {
  return (
    <View style={[styles.radio, on && { backgroundColor: colors.highlight }]}>
      {on ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
  inputRef,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  inputRef?: Ref<TextInput>;
}) {
  return (
    <View style={styles.search}>
      <Icon name="search" size={20} color={colors.ink} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkHint}
        accessibilityLabel={placeholder}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        style={styles.searchInput}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
          <Icon name="close" size={18} color={colors.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** The black pill at the bottom of a sheet. */
export function Cta({ label, onPress, style }: { label: string; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }, style]}>
      <Txt variant="lead" color={colors.onAction} numberOfLines={1} style={{ fontFamily: fonts.bodyHeavy }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Title and close button at the top of a picker. */
export function PickerHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.head}>
      <Txt variant="title" accessibilityRole="header" style={{ flex: 1 }}>
        {title}
      </Txt>
      <CircleButton size={40} accessibilityLabel="Close" onPress={onClose}>
        <Icon name="close" size={20} color={colors.ink} />
      </CircleButton>
    </View>
  );
}

/** Section label in a list: name on the left, a short note or a link on the right. */
export function ListLabel({ title, right, onRight }: { title: string; right?: string; onRight?: () => void }) {
  return (
    <View style={styles.label}>
      <Txt variant="section" style={{ fontSize: 16, lineHeight: 20 }}>
        {title}
      </Txt>
      {right ? (
        onRight ? (
          <Pressable onPress={onRight} hitSlop={10} accessibilityRole="button">
            <Txt variant="label" style={{ textDecorationLine: 'underline' }}>
              {right}
            </Txt>
          </Pressable>
        ) : (
          <Txt variant="label" style={{ fontSize: 13 }}>
            {right}
          </Txt>
        )
      ) : null}
    </View>
  );
}

/** The thin line under a row in a picker list. */
export function Rule() {
  return <View style={styles.rule} />;
}

/** One row in a picker list, with a thin line under it. */
export function OptionRow({
  onPress,
  role = 'button',
  checked,
  label,
  children,
}: {
  onPress: () => void;
  role?: 'button' | 'checkbox' | 'radio';
  checked?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <View>
      <Pressable
        onPress={onPress}
        accessibilityRole={role}
        accessibilityState={checked === undefined ? undefined : { checked }}
        accessibilityLabel={label}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
      <Rule />
    </View>
  );
}

export const listPad = { paddingHorizontal: gutter } as const;

const styles = StyleSheet.create({
  rule: { height: 1, backgroundColor: colors.hairline },
  more: {
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: stroke.m,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
  search: {
    height: 48,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: '100%', ...type.lead, color: colors.ink },
  cta: {
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.action,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: gutter, paddingBottom: 10 },
  label: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
    marginTop: 14,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 6, paddingHorizontal: 2 },
});

