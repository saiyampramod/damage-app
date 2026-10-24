import { Modal, Pressable, Share, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import type { PersonId } from '@/data/types';
import { colors, gutter, radius, stroke } from '@/theme/tokens';

import { Icon } from '../Icon';
import { Txt } from '../Txt';
import { InviteQR, inviteLink } from './InviteQR';
import { Pile } from './Pile';

type Props = {
  name: string;
  people: PersonId[];
  code: string;
  onDone: () => void;
};

/**
 * Pops up once the group is made: who's in, the QR, Done and Share link. No link to copy: Share
 * link is the one way to send it, the same as a bill's Who's in? (the founder's call).
 */
export function GroupReady({ name, people, code, onDone }: Props) {
  const link = inviteLink(code);
  async function share() {
    try {
      await Share.share({ message: `Join ${name} on Damage: https://${link}` });
    } catch {
      // The share sheet was closed or isn't available. Nothing to do.
    }
  }

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDone} statusBarTranslucent>
      <View style={styles.veil}>
        <Animated.View
          entering={ZoomIn.duration(220)}
          style={styles.card}
          accessibilityViewIsModal
          accessibilityLabel={`${name} is ready`}>
          <View style={{ alignItems: 'center' }}>
            <Pile ids={people} wrap />
          </View>
          <Txt variant="title" accessibilityRole="header" style={styles.title}>
            {name} is ready
          </Txt>
          <View style={{ marginTop: 14 }}>
            <InviteQR code={code} />
          </View>
          <Txt variant="body" style={styles.copy}>
            Let them scan it or send the link. They join once they sign in to Damage.
          </Txt>
          <View style={styles.two}>
            <Pressable onPress={onDone} accessibilityRole="button" style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
              <Txt variant="label" style={{ fontSize: 15 }}>
                Done
              </Txt>
            </Pressable>
            <Pressable
              onPress={share}
              accessibilityRole="button"
              style={({ pressed }) => [styles.btn, styles.dark, pressed && styles.pressed]}>
              <Icon name="upload" size={18} color={colors.onAction} />
              <Txt variant="label" color={colors.onAction} style={{ fontSize: 15 }}>
                Share link
              </Txt>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: { flex: 1, backgroundColor: colors.veil, justifyContent: 'center', paddingHorizontal: gutter },
  card: {
    backgroundColor: colors.paper,
    borderWidth: stroke.l,
    borderColor: colors.line,
    borderRadius: 24,
    boxShadow: `6px 6px 0px ${colors.brand}`,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: { textAlign: 'center', fontSize: 21, lineHeight: 26, marginTop: 8 },
  copy: { textAlign: 'center', fontSize: 14, lineHeight: 19, marginTop: 12 },
  two: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    gap: 6,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `2px 2px 0px ${colors.shade}`,
  },
  dark: { backgroundColor: colors.action },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: 'none' },
});

