/**
 * The pass stub in small: a rounded square in the group's colour with its kind icon. It marks a
 * bill that belongs to a group, on its price tag and on its row, without taking any extra room.
 */
import { View } from 'react-native';

import { colors } from '@/theme/tokens';

import { Icon, type IconName } from '../Icon';

export type GroupMark = { name: string; color: string; icon: IconName };

export function GroupBadge({ group, size = 18 }: { group: GroupMark; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        borderWidth: 1.5,
        borderColor: colors.line,
        backgroundColor: group.color,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={group.icon} size={Math.round(size * 0.66)} strokeWidth={2.6} color={colors.ink} />
    </View>
  );
}
