import { Text, type TextProps } from 'react-native';

import { colors, type, type TypeVariant } from '@/theme/tokens';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
};

/** All text goes through here so fonts and sizes come from the theme. */
export function Txt({ variant = 'body', color = colors.ink, style, ...rest }: Props) {
  return <Text {...rest} style={[type[variant], { color }, style]} />;
}
