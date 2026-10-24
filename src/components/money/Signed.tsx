/**
 * Money with its direction on it. Every amount between you and someone reads the same way across
 * the app: green with a + is coming to you, red with a − is yours to pay, grey is square. The
 * words with it ("owes you", "you owe") use the same colour, so neither the colour nor the words
 * are the only signal.
 */
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { inr } from '@/lib/format';
import { colors, fonts } from '@/theme/tokens';

import { Txt } from '../Txt';

/** +₹1,197 · −₹1,200 · ₹0 */
export const signed = (n: number) => (n >= 0.5 ? '+' : n <= -0.5 ? '−' : '') + inr(n);

export const wayColor = (n: number) =>
  n >= 0.5 ? colors.inText : n <= -0.5 ? colors.outText : colors.inkHint;

/** The pale fill for a card whose money goes this way. */
export const wayWash = (n: number) =>
  n >= 0.5 ? colors.inWash : n <= -0.5 ? colors.outWash : colors.paper;

/**
 * The words for which way it goes. `who` is the other person's name: "Jay owes you",
 * "You owe Jay". Without it: "owes you" / "you owe" (or "you get back" for a bill or group).
 */
export function wayWords(n: number, opts: { who?: string; bill?: boolean } = {}): string {
  if (Math.abs(n) < 0.5) return opts.bill ? 'You’re square' : 'All square';
  if (opts.who) return n > 0 ? `${opts.who} owes you` : `You owe ${opts.who}`;
  if (opts.bill) return n > 0 ? 'you get back' : 'you owe';
  return n > 0 ? 'owes you' : 'you owe';
}

/** A signed, coloured amount. */
export function Signed({
  value,
  size = 17,
  style,
}: {
  value: number;
  size?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Txt
      style={[
        { fontFamily: fonts.bodyHeavy, fontSize: size, lineHeight: Math.round(size * 1.25) },
        { color: wayColor(value), fontVariant: ['tabular-nums'] },
        style,
      ]}>
      {signed(value)}
    </Txt>
  );
}

/** The amount with its words under it, right-aligned: for the end of a row. */
export function WayAmount({
  value,
  bill = false,
  size = 17,
  plainWords = false,
}: {
  value: number;
  /** A bill or group: "you get back" instead of "owes you". */
  bill?: boolean;
  size?: number;
  /** Only the number is coloured; the words under it stay grey. */
  plainWords?: boolean;
}) {
  return (
    <View style={styles.way}>
      <Signed value={value} size={size} />
      <Txt variant="small" color={plainWords ? colors.inkSoft : wayColor(value)} style={styles.words}>
        {wayWords(value, { bill })}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  way: { alignItems: 'flex-end', gap: 1 },
  words: { fontFamily: fonts.bodyHeavy, fontSize: 12.5 },
});
