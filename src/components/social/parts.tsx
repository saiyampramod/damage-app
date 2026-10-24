/**
 * Pieces shared by Profile, Friends and Activity: a white list card with rows ruled off, a person
 * row (face, name, a line under it, buttons on the right), your friend code with Copy and Share,
 * and the pop-up with your QR.
 */
import * as Clipboard from 'expo-clipboard';
import { useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { MY_CODE } from '@/data/mock';
import { MY_LINK } from '@/data/social';
import type { PersonId } from '@/data/types';
import { shareText } from '@/lib/pay';
import { colors, fonts, gutter, radius, shadow, stroke } from '@/theme/tokens';

import { InviteQR } from '../group/InviteQR';
import { Icon, type IconName } from '../Icon';
import { BigButton, Face, KeyButton } from '../receipt/parts';
import { Txt } from '../Txt';

/** A white card with a black edge; its rows are ruled off from each other. */
export function ListCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

/** One person: their face, name, a line under it, and whatever goes on the right. */
export function PersonRow({
  id,
  name,
  sub,
  right,
  first,
  onPress,
  accessibilityLabel,
}: {
  id: PersonId;
  name: string;
  sub?: string;
  right?: ReactNode;
  first?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const body = (
    <>
      <Face id={id} size={40} />
      <View style={styles.grow}>
        <Txt variant="rowTitle" numberOfLines={1}>
          {name}
        </Txt>
        {sub ? (
          <Txt variant="rowSub" color={colors.inkHint} numberOfLines={2}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {right}
    </>
  );
  return (
    <View style={[styles.rowWrap, !first && styles.ruled]}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? name}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
          {body}
        </Pressable>
      ) : (
        <View style={styles.row} accessible={false}>
          {body}
        </View>
      )}
    </View>
  );
}

/** A plain row with an icon: Friends, Recurring bills, a setting. */
export function LinkRow({
  icon,
  title,
  sub,
  right,
  first,
  onPress,
}: {
  icon: IconName;
  title: string;
  sub?: string;
  right?: ReactNode;
  first?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.rowWrap, !first && styles.ruled]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={sub ? `${title}, ${sub}` : title}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
        <View style={styles.iconDisc}>
          <Icon name={icon} size={18} color={colors.ink} />
        </View>
        <View style={styles.grow}>
          <Txt variant="rowTitle" numberOfLines={1}>
            {title}
          </Txt>
          {sub ? (
            <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
              {sub}
            </Txt>
          ) : null}
        </View>
        {right}
        <Icon name="chevron" size={18} strokeWidth={2.6} color={colors.inkHint} />
      </Pressable>
    </View>
  );
}

/** A small round-ended button on a row: Accept, Add, Cancel. */
export function SmallButton({
  label,
  onPress,
  lime = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  lime?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.small,
        lime && { backgroundColor: colors.go, boxShadow: shadow.xs },
        pressed && { opacity: 0.8 },
      ]}>
      <Txt variant="label" style={{ fontSize: 13.5 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** An on/off switch in the theme's colours (lime when on). */
export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  // The web switch has its own colour for the knob when it's on; keep it white like the phones.
  const web = Platform.OS === 'web' ? ({ activeThumbColor: colors.paper } as object) : null;
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.quiet, true: colors.go }}
      thumbColor={colors.paper}
      ios_backgroundColor={colors.quiet}
      accessibilityLabel={label}
      {...web}
    />
  );
}

/** "Waiting" or "Friends": where a request stands, in place of a button. */
export function StateTag({ text, done = false }: { text: string; done?: boolean }) {
  return (
    <View style={[styles.stateTag, done && { backgroundColor: colors.highlightSoft }]}>
      {done ? <Icon name="check" size={12} strokeWidth={3.2} color={colors.ink} /> : null}
      <Txt variant="micro" color={done ? colors.ink : colors.inkSoft} style={{ fontSize: 12 }}>
        {text}
      </Txt>
    </View>
  );
}

export const shareMyLink = () =>
  shareText(`Add me on Damage so we can split bills: https://${MY_LINK}\nOr type my code: ${MY_CODE}`);

/** Your friend code, big, with Copy; Share my link and Show my QR under it. */
export function MyCode({ onQr }: { onQr: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await Clipboard.setStringAsync(MY_CODE);
    setCopied(true);
  }
  return (
    <View style={styles.code}>
      <Txt variant="eyebrow" color={colors.inkSoft}>
        YOUR FRIEND CODE
      </Txt>
      <View style={styles.codeRow}>
        <Txt style={styles.codeText} selectable accessibilityLabel={`Your code, ${MY_CODE.split('').join(' ')}`}>
          {MY_CODE}
        </Txt>
        <KeyButton
          label={copied ? 'Copied' : 'Copy'}
          on={copied}
          accessibilityLabel={copied ? 'Code copied' : 'Copy your code'}
          onPress={copy}
        />
      </View>
      <View style={styles.two}>
        <BigButton label="Share my link" icon="upload" height={46} light onPress={shareMyLink} style={{ flex: 1 }} />
        <BigButton label="My QR" icon="qr" height={46} light onPress={onQr} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

/** Your QR, to be scanned in Damage by someone next to you. */
export function MyQr({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.veil} onPress={onClose} accessibilityLabel="Close">
        <Animated.View entering={ZoomIn.duration(200)} style={styles.qrCard} accessibilityViewIsModal>
          <Pressable onPress={() => undefined} accessible={false}>
            <Txt variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
              Add me on Damage
            </Txt>
            <View style={{ marginTop: 14 }}>
              <InviteQR code={MY_CODE} label={`QR code to add you as a friend, code ${MY_CODE}`} />
            </View>
            <Txt variant="body" color={colors.inkSoft} style={styles.qrNote}>
              They scan it in Damage, or type {MY_CODE} under Friends.
            </Txt>
            <View style={{ flexDirection: 'row' }}>
              <BigButton label="Done" height={48} onPress={onClose} />
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: 2 },
  card: {
    marginHorizontal: gutter,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
    overflow: 'hidden',
  },
  rowWrap: { position: 'relative' },
  ruled: { borderTopWidth: 1.5, borderTopColor: colors.hairline },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.highlightSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  stateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.quiet,
  },
  code: {
    marginHorizontal: gutter,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.highlightSoft,
    boxShadow: shadow.s,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 2 },
  codeText: { fontFamily: fonts.display, fontSize: 30, lineHeight: 42, letterSpacing: 1.5 },
  two: { flexDirection: 'row', gap: 10, marginTop: 10 },
  veil: { flex: 1, backgroundColor: colors.veil, alignItems: 'center', justifyContent: 'center', padding: gutter },
  qrCard: {
    width: '100%',
    maxWidth: 360,
    padding: 18,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 24,
    backgroundColor: colors.paper,
    boxShadow: shadow.m,
  },
  qrNote: { textAlign: 'center', marginTop: 12, marginBottom: 14, fontSize: 14, lineHeight: 20 },
});
