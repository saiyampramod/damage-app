import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { colors, stroke } from '@/theme/tokens';

import { Txt } from './Txt';

type Props = {
  size?: number;
  fill?: string;
  onPress?: () => void;
  accessibilityLabel: string;
  /** Small count badge, e.g. unread activity. */
  badge?: number;
  /** Colour of the hard shadow. Lime on dark screens, where black wouldn't show. */
  shadowColor?: string;
  children: ReactNode;
};

/** Round outlined button with a small hard shadow (bell, profile, back). */
export function CircleButton({
  size = 40,
  fill = colors.paper,
  onPress,
  accessibilityLabel,
  badge,
  shadowColor = colors.shade,
  children,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${accessibilityLabel}, ${badge} new` : accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: stroke.m,
        borderColor: colors.line,
        backgroundColor: fill,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: pressed ? 'none' : `2px 2px 0px ${shadowColor}`,
        transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }],
      })}>
      {children}
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 5,
            borderRadius: 10,
            backgroundColor: colors.action,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Txt variant="micro" color={colors.onAction}>
            {badge}
          </Txt>
        </View>
      ) : null}
    </Pressable>
  );
}
