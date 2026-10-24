import { View } from 'react-native';

import { TearTile } from './TearTile';
import { Txt } from './Txt';

export function Logo() {
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="damage"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <TearTile
        size={30}
        seam={48}
        radius={7}
        strokeWidth={2}
        shadowOffset={2}
        style={{ transform: [{ rotate: '-6deg' }] }}
      />
      <Txt variant="wordmark">damage</Txt>
    </View>
  );
}
