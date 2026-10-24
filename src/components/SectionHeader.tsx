import { Pressable, View } from 'react-native';

import { gutter } from '@/theme/tokens';

import { Txt } from './Txt';

/** A section's name in display type, with a few words or a link (See all) on the right. */
export function SectionHeader({
  title,
  aside,
  onAside,
}: {
  title: string;
  aside?: string;
  /** Makes the words on the right a link. */
  onAside?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: gutter,
        marginTop: 26,
      }}>
      <Txt variant="section" accessibilityRole="header">
        {title}
      </Txt>
      {aside && onAside ? (
        <Pressable onPress={onAside} hitSlop={12} accessibilityRole="link">
          <Txt variant="label" style={{ textDecorationLine: 'underline' }}>
            {aside}
          </Txt>
        </Pressable>
      ) : aside ? (
        <Txt variant="label">{aside}</Txt>
      ) : null}
    </View>
  );
}
