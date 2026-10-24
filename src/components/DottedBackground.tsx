import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

/**
 * The paper the whole app sits on. Plain now: the dots are gone (the founder's call, 24 Oct),
 * but every screen still mounts this, so a texture can come back in one place.
 * `fill` swaps the paper colour, e.g. lime for a card. `spacing` is kept for callers.
 */
export function DottedBackground({ fill = colors.page }: { spacing?: number; fill?: string }) {
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} pointerEvents="none" />;
}
