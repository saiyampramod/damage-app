import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { inr, shortDate } from '@/lib/format';
import { colors } from '@/theme/tokens';

import { DashedLine } from './DashedLine';
import { tornCardPath } from './shapes';
import { Txt } from './Txt';

type Props = {
  comingIn: number;
  goingOut: number;
  date?: Date;
};

const STROKE = 3.5;
const SHADOW = 6;
const TOOTH_DEPTH = 9;
/** Room around the card for the stroke and shadow to draw into. */
const BLEED = 10;

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Txt variant="bodyStrong">{label}</Txt>
      <DashedLine kind="dotted" thickness={2.5} style={styles.leader} />
      <Txt variant="bodyStrong">{value}</Txt>
    </View>
  );
}

/** "The damage, today": a receipt torn off the roll, at the top of Home. */
export function ReceiptSummary({ comingIn, goingOut, date = new Date() }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const net = comingIn - goingOut;
  const verdict = net > 0.5 ? 'You’re up' : net < -0.5 ? 'You’re down' : 'All square';

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  }

  const d = size.w ? tornCardPath(size.w, size.h, { depth: TOOTH_DEPTH }) : '';

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityLabel={`Coming to you ${inr(comingIn)}. You owe ${inr(goingOut)}. ${verdict} ${inr(net)}.`}>
      {d ? (
        <Svg
          pointerEvents="none"
          width={size.w + BLEED * 2}
          height={size.h + BLEED * 2}
          viewBox={`${-BLEED} ${-BLEED} ${size.w + BLEED * 2} ${size.h + BLEED * 2}`}
          style={styles.bg}>
          <G transform={`translate(${SHADOW} ${SHADOW})`}>
            <Path d={d} fill={colors.summaryShadow} />
          </G>
          <Path
            d={d}
            fill={colors.summaryFill}
            stroke={colors.summaryStroke}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}

      <View style={styles.content}>
        <View style={styles.head}>
          <Txt variant="label">The damage, today</Txt>
          <Txt variant="label">{shortDate(date)}</Txt>
        </View>
        <Line label="Coming to you" value={inr(comingIn)} />
        <Line label="You owe" value={inr(goingOut)} />
        <DashedLine thickness={3} style={styles.rule} />
        <View style={styles.total}>
          <Txt variant="bodyStrong">{verdict}</Txt>
          <Txt variant="amountLarge">{inr(net)}</Txt>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { position: 'absolute', left: -BLEED, top: -BLEED },
  content: {
    paddingHorizontal: 19,
    paddingTop: 16,
    paddingBottom: 12 + TOOTH_DEPTH,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  line: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  leader: { flex: 1, marginHorizontal: 8, marginTop: 6 },
  rule: { marginTop: 14, marginBottom: 8 },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
