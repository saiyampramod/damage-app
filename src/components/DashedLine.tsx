import { View, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type Props = {
  /** 'dashed' for rules, 'dotted' for receipt leaders. */
  kind?: 'dashed' | 'dotted';
  thickness?: number;
  color?: string;
  style?: ViewStyle;
};

/** Horizontal dashed or dotted line that fills its width. */
export function DashedLine({ kind = 'dashed', thickness = 2.5, color = colors.line, style }: Props) {
  const dash = kind === 'dashed' ? '6 4' : '0.1 4';
  return (
    <View style={[{ height: thickness + 1 }, style]}>
      <Svg width="100%" height={thickness + 1}>
        <Line
          x1={thickness / 2}
          y1={(thickness + 1) / 2}
          x2="100%"
          y2={(thickness + 1) / 2}
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={dash}
          strokeLinecap={kind === 'dotted' ? 'round' : 'butt'}
        />
      </Svg>
    </View>
  );
}
