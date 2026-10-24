import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ME } from '@/data/mock';
import { nameOf } from '@/data/quick';
import type { PersonId } from '@/data/types';
import { PersonSticker } from '../ledger/parts';

const POP = ZoomIn.springify().damping(14).stiffness(260);

type Props = {
  /** Everyone picked, oldest first. You're always shown first and aren't in this list. */
  ids: PersonId[];
  size?: number;
  /** Tap a sticker to take that person out. Leave out for a pile you can only look at. */
  onRemove?: (id: PersonId) => void;
  /** No longer used: everyone is a round avatar in their own colour (you are lime). */
  meFill?: string;
  /** Wrap onto more rows, centred. Otherwise it's one row (put it in a sideways scroll when it can get long). */
  wrap?: boolean;
};

/** Who's in, as a row of overlapping round avatars: you first, newest picks last. Everyone shows; nothing folds away. */
export function Pile({ ids, size = 34, onRemove, wrap = false }: Props) {
  const overlap = -Math.round(size * 0.2);

  return (
    <View style={[styles.row, wrap && styles.wrap, wrap && { paddingLeft: -overlap }]}>
      <View style={{ zIndex: 40 }} pointerEvents="none" accessible accessibilityLabel="You">
        <PersonSticker id={ME} size={size} ring />
      </View>
      {ids.map((id, k) => {
        const sticker = <PersonSticker id={id} size={size} ring />;
        return (
          <Animated.View key={id} entering={POP} style={{ marginLeft: overlap, zIndex: 39 - k }}>
            {onRemove ? (
              <Pressable
                onPress={() => onRemove(id)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${nameOf(id)}`}
                style={({ pressed }) => ({ width: size, height: size, transform: [{ scale: pressed ? 0.88 : 1 }] })}>
                <View pointerEvents="none">{sticker}</View>
              </Pressable>
            ) : (
              <View pointerEvents="none" accessible accessibilityLabel={nameOf(id)}>
                {sticker}
              </View>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingLeft: 2, paddingRight: 4 },
  wrap: { flexWrap: 'wrap', justifyContent: 'center', rowGap: 6 },
});
