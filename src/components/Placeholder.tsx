import { router } from 'expo-router';
import { View } from 'react-native';

import { colors, gutter, radius, shadow, stroke } from '@/theme/tokens';

import { CircleButton } from './CircleButton';
import { Icon } from './Icon';
import { Screen } from './Screen';
import { Txt } from './Txt';

type Props = {
  title: string;
  /** What this screen will hold, from the flows. */
  points: string[];
  withNav?: boolean;
  back?: boolean;
};

/** Stand-in for screens that aren't built yet, so navigation works end to end. */
export function Placeholder({ title, points, withNav = false, back = false }: Props) {
  return (
    <Screen withNav={withNav}>
      <View style={{ paddingHorizontal: gutter, gap: 18 }}>
        {back ? (
          <CircleButton accessibilityLabel="Back" onPress={() => router.back()}>
            <Icon name="back" size={20} />
          </CircleButton>
        ) : null}
        <Txt variant="poster" accessibilityRole="header">
          {title}
        </Txt>
        <View
          style={{
            backgroundColor: colors.paper,
            borderWidth: stroke.m,
            borderColor: colors.line,
            borderRadius: radius.l,
            boxShadow: shadow.m,
            padding: 16,
            gap: 10,
          }}>
          <Txt variant="micro">Coming next</Txt>
          {points.map((p) => (
            <View key={p} style={{ flexDirection: 'row', gap: 8 }}>
              <Txt variant="body">•</Txt>
              <Txt variant="body" style={{ flex: 1 }}>
                {p}
              </Txt>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
