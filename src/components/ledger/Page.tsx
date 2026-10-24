/**
 * The frame for a person, group or bill page: one line on top (back, who, the total),
 * a scrolling middle, and a bar at the bottom shaped like the nav dock.
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { inr } from '@/lib/format';
import { colors, shadow, stroke } from '@/theme/tokens';

import { DottedBackground } from '../DottedBackground';
import { Icon, type IconName } from '../Icon';
import { Txt } from '../Txt';

export function Page({
  lead,
  title,
  sub,
  amount,
  right,
  bar,
  overlay,
  children,
}: {
  lead?: ReactNode;
  title: string;
  /** One or two words on which way the money goes ("owes you"), or the bill's date. */
  sub?: string;
  /** The total on the right. Hidden when it's zero. */
  amount?: number;
  /** Something else on the right of the top line instead of a total (e.g. Edit). */
  right?: ReactNode;
  bar?: ReactNode;
  /** Sheets, drawn over everything. */
  overlay?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <DottedBackground />
      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}>
          <Icon name="back" size={24} strokeWidth={2.6} color={colors.ink} />
        </Pressable>
        {lead}
        <View style={styles.who}>
          <Txt variant="headerTitle" accessibilityRole="header" numberOfLines={2}>
            {title}
          </Txt>
          {sub ? (
            <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
              {sub}
            </Txt>
          ) : null}
        </View>
        {amount && Math.abs(amount) >= 0.5 ? <Txt variant="headerAmount">{inr(amount)}</Txt> : null}
        {right}
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + (bar ? 150 : 40) }}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {bar}
      {overlay}
    </View>
  );
}

/** The floating bar at the bottom of a page. */
export function Bar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bar, { bottom: Math.max(insets.bottom, 12) + 6 }]}>{children}</View>;
}

/** go: the lime main button. outline: white with a black edge. plain: icon and words, no edge. */
export function BarButton({
  label,
  onPress,
  kind = 'go',
  icon,
}: {
  label: string;
  onPress: () => void;
  kind?: 'go' | 'outline' | 'plain';
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        kind === 'plain' ? styles.plain : styles.btn,
        kind === 'go' && { backgroundColor: colors.go },
        kind === 'outline' && { backgroundColor: colors.paper },
        pressed && { transform: [{ translateY: 1 }] },
      ]}>
      {icon ? <Icon name={icon} size={20} strokeWidth={2.4} color={colors.ink} /> : null}
      <Txt
        variant={kind === 'go' ? 'rowTitle' : 'body'}
        style={kind === 'plain' ? null : styles.btnText}
        numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** A line of text across the top of the bar, e.g. "Did ₹1,200 to Kabir go through?". */
export function BarQuestion({ children }: { children: string }) {
  return (
    <Txt variant="rowTitle" style={styles.question}>
      {children}
    </Txt>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 20,
    paddingLeft: 4,
    paddingBottom: 8,
    minHeight: 64,
    backgroundColor: colors.paper,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.hairline,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  who: { flex: 1, minWidth: 0 },
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    padding: 7,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 28,
    backgroundColor: colors.paper,
    boxShadow: shadow.m,
  },
  btn: {
    flex: 1,
    minWidth: 0,
    height: 50,
    borderRadius: 999,
    borderWidth: stroke.s,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  btnText: { textAlign: 'center' },
  plain: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 10,
    paddingRight: 12,
  },
  question: {
    width: '100%',
    textAlign: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 10,
  },
});
