import { useEffect, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '@/theme/tokens';

import { Txt } from './Txt';

type Msg = { id: number; text: string; undo?: () => void; lift: number };

let current: Msg | null = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** How far above the bottom edge a message sits: clear of the nav bar and of a page's bottom bar. */
export const TOAST_LIFT = 100;

/**
 * A short black message near the bottom of the screen. Pass `undo` to add an Undo button;
 * `lift` raises it when something taller sits at the bottom (a bar asking a question).
 */
export function showToast(text: string, opts: { undo?: () => void; lift?: number } = {}) {
  current = { id: ++seq, text, undo: opts.undo, lift: opts.lift ?? TOAST_LIFT };
  emit();
}

export function hideToast() {
  current = null;
  emit();
}

function useCurrent() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => current,
    () => current,
  );
}

/** Render once, at the root, above every screen. */
export function ToastHost() {
  const msg = useCurrent();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(
      () => {
        if (current?.id === msg.id) hideToast();
      },
      msg.undo ? 4500 : 2600,
    );
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        key={msg.id}
        entering={FadeInDown.duration(180)}
        exiting={FadeOut.duration(160)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, { bottom: insets.bottom + msg.lift }]}>
        <Txt variant="label" color={colors.onAction} style={styles.text}>
          {msg.text}
        </Txt>
        {msg.undo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Undo"
            hitSlop={10}
            onPress={() => {
              msg.undo?.();
              hideToast();
            }}>
            <Txt variant="label" color={colors.go} style={styles.undo}>
              Undo
            </Txt>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.m,
    backgroundColor: colors.action,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  text: { flexShrink: 1, textAlign: 'center' },
  undo: { textDecorationLine: 'underline' },
});
