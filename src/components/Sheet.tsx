import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, stroke } from '@/theme/tokens';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Read out when the sheet opens. */
  label: string;
  /** Fills the screen below the status bar (pickers with a list). */
  tall?: boolean;
  /** Show the grab bar at the top. Tapping it closes the sheet. */
  grab?: boolean;
  /** Draw above everything, the nav bar included (sheets opened from a tab screen). */
  modal?: boolean;
  children: ReactNode;
};

const IN = { duration: 280, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };
const OUT = { duration: 200, easing: Easing.in(Easing.quad) };
/** Close to the curve the iOS keyboard moves on, so the sheet rides up with it. */
const KEYS = Easing.bezier(0.38, 0.7, 0.125, 1);

/**
 * A white sheet that slides up over a dimmed screen and stays above the keyboard.
 * It follows the keyboard as it moves (rather than jumping ahead of it), so a sheet that opens
 * with the keys up arrives in one move.
 * Tap the dim area, the grab bar or Android back to close it.
 * Sheets later in the tree sit on top of earlier ones.
 */
export function Sheet({
  open,
  onClose,
  label,
  tall = false,
  grab = true,
  modal = false,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  /** How much of the bottom of the screen the keyboard covers right now. */
  const kb = useSharedValue(0);
  const [mounted, setMounted] = useState(open);
  const live = useRef(open);

  useEffect(() => {
    live.current = open;
  }, [open]);

  // iOS says where the keyboard is going and how long it takes; move with it.
  // (Android lays the screen out around the keyboard itself.)
  useEffect(() => {
    if (!mounted || Platform.OS !== 'ios') return;
    const move = (to: number, ms: number) =>
      kb.set(withTiming(to, { duration: reduce ? 0 : ms || 250, easing: KEYS }));
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      // A sheet on its way out stays put; the one under it does the moving.
      if (live.current) move(e.endCoordinates.height, e.duration);
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => move(0, e.duration));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [mounted, reduce, kb]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      p.set(withTiming(1, reduce ? { duration: 0 } : IN));
    } else {
      p.set(
        withTiming(0, reduce ? { duration: 0 } : OUT, (done) => {
          if (done) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [open, reduce, p]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  const veil = useAnimatedStyle(() => ({ opacity: p.get() }));
  const rest = Math.max(insets.bottom, 12) + 12;
  const stage = useAnimatedStyle(() => ({ bottom: kb.get() }));
  // Over the keyboard the room for the home bar isn't needed, so it closes up.
  const panel = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - p.get()) * height }],
    paddingBottom: Math.max(rest - kb.get(), 12),
  }));

  if (!mounted) return null;

  const body = (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'box-none' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.veil, veil]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      </Animated.View>
      <Animated.View style={[styles.stage, stage]} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={label}
          style={[
            styles.panel,
            tall
              ? {
                  top: insets.top + 36,
                  position: 'absolute',
                  left: -stroke.l,
                  right: -stroke.l,
                  bottom: 0,
                  marginHorizontal: 0,
                }
              : null,
            panel,
          ]}>
          {grab ? (
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.grab}>
              <View style={styles.grabBar} />
            </Pressable>
          ) : null}
          {children}
        </Animated.View>
      </Animated.View>
    </View>
  );

  if (!modal) return body;
  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent>
      {body}
    </Modal>
  );
}

const styles = StyleSheet.create({
  veil: { backgroundColor: colors.veil },
  stage: { position: 'absolute', top: 0, left: 0, right: 0, justifyContent: 'flex-end' },
  panel: {
    backgroundColor: colors.paper,
    // The outline runs round both top corners at one thickness. (A top-only border thins out
    // to nothing on the curve.) The sides sit just off-screen.
    borderWidth: stroke.l,
    borderBottomWidth: 0,
    marginHorizontal: -stroke.l,
    borderColor: colors.line,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  grab: { height: 24, alignItems: 'center', justifyContent: 'center' },
  grabBar: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.ink },
});
