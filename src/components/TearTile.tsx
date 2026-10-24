import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors, stroke as strokes } from '@/theme/tokens';

import { tearHalf } from './shapes';
import { Smooth } from './Smooth';

type Props = {
  size: number;
  /** Where the zig-zag sits: 51 for the add button, 48 for the logo. */
  seam?: number;
  radius?: number;
  strokeWidth?: number;
  shadowOffset?: number;
  /** Resting gap between the halves, in tile units (of 120). */
  gap?: number;
  /** 0 = closed, 1 = fully ripped. Drives the hold-to-open "loading". */
  progress?: SharedValue<number>;
  /** Show it fully ripped without animating. */
  torn?: boolean;
  style?: ViewStyle;
};

/** How far each half slides out when fully ripped, in tile units. */
const RIP = 9;

/** The lime tile with a torn seam: the logo mark and the add button. */
export function TearTile({
  size,
  seam = 51,
  radius = 14,
  strokeWidth = strokes.m,
  shadowOffset = 4,
  gap = 6,
  progress,
  torn = false,
  style,
}: Props) {
  const unit = size / 120;

  const leftStyle = useAnimatedStyle(() => {
    const p = progress ? progress.get() : torn ? 1 : 0;
    return { transform: [{ translateX: -(gap + RIP * p) * unit }] };
  });
  const rightStyle = useAnimatedStyle(() => {
    const p = progress ? progress.get() : torn ? 1 : 0;
    return { transform: [{ translateX: (gap + RIP * p) * unit }] };
  });

  return (
    <Smooth pad={shadowOffset + 4} style={style}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          boxShadow: `${shadowOffset}px ${shadowOffset}px 0px ${colors.shade}`,
        }}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius, overflow: 'hidden', backgroundColor: colors.brandSeam },
          ]}>
          <Animated.View style={[StyleSheet.absoluteFill, leftStyle]}>
            <Svg width="100%" height="100%" viewBox="0 0 120 120">
              <Path d={tearHalf(-20, seam)} fill={colors.brand} />
            </Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, rightStyle]}>
            <Svg width="100%" height="100%" viewBox="0 0 120 120">
              <Path d={tearHalf(140, seam)} fill={colors.brand} />
            </Svg>
          </Animated.View>
        </View>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius, borderWidth: strokeWidth, borderColor: colors.line },
          ]}
        />
      </View>
    </Smooth>
  );
}
