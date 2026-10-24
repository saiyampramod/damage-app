import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { colors, fonts, stroke } from '@/theme/tokens';

import { shapePath, type StickerShape } from './shapes';
import { Smooth } from './Smooth';
import { Txt } from './Txt';

type Props = {
  letter: string;
  shape: StickerShape;
  size: number;
  fill?: string;
  /** Degrees. */
  tilt?: number;
  /** The black pill under the sticker, e.g. an amount. */
  tag?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** A die-cut person sticker: shaped outline, hard shadow, big initial. */
export function Sticker({
  letter,
  shape,
  size,
  fill = colors.paper,
  tilt = 0,
  tag,
  onPress,
  accessibilityLabel,
}: Props) {
  const d = shapePath(shape, size);
  const off = size >= 90 ? 6 : size >= 44 ? 4 : 3;

  const body = (
    <Smooth pad={16} style={{ transform: [{ rotate: `${tilt}deg` }] }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} style={{ overflow: 'visible' }}>
          <G transform={`translate(${off} ${off})`}>
            <Path d={d} fill={colors.shade} />
          </G>
          <Path
            d={d}
            fill={fill}
            stroke={colors.line}
            strokeWidth={stroke.m}
            strokeLinejoin="round"
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Txt
            variant="card"
            style={{ fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.5) }}>
            {letter}
          </Txt>
        </View>
        {tag ? (
          <View style={styles.tag} pointerEvents="none">
            <Txt variant="small" color={colors.onAction} style={styles.tagText}>
              {tag}
            </Txt>
          </View>
        ) : null}
      </View>
    </Smooth>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  tag: {
    position: 'absolute',
    bottom: -12,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.action,
  },
  tagText: { fontFamily: fonts.bodyHeavy, lineHeight: 14 },
});
