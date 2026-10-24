import { View, type ViewProps } from 'react-native';

type Props = ViewProps & {
  /** Transparent room around the content. Must be wider than any shadow or overhang. */
  pad?: number;
};

/**
 * Wrap anything that gets tilted.
 *
 * iOS doesn't smooth the edges of rotated views, so a tilted card with a border
 * comes out with jagged, stair-stepped edges. Drawing it to a bitmap first, with a
 * transparent margin around it, lets the rotation smooth every visible edge.
 * The negative margin cancels the padding, so layout is unchanged.
 */
export function Smooth({ pad = 8, style, children, ...rest }: Props) {
  return (
    <View
      shouldRasterizeIOS
      renderToHardwareTextureAndroid
      style={[{ padding: pad, margin: -pad }, style]}
      {...rest}>
      {children}
    </View>
  );
}
