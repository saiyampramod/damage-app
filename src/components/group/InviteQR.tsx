/**
 * The group's invite code and QR.
 *
 * Placeholder until the backend hands out real invite links: the code is made from the
 * group's name, and the QR is a pattern drawn from the code. It looks right but won't scan.
 */
import { View } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { colors, stroke } from '@/theme/tokens';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Six letters and digits, no look-alikes (0/O, 1/I/L). */
export function inviteCode(seed: string): string {
  let h = 7;
  for (const c of seed) h = (h * 131 + c.charCodeAt(0)) >>> 0;
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[h % ALPHABET.length];
    h = Math.floor(h / ALPHABET.length) + 977 * (i + 1);
  }
  return out;
}

export function inviteLink(code: string): string {
  return `join.damage/${code}`;
}

const N = 25;

function cells(seed: string): string {
  let h = 2166136261;
  for (const c of seed) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const rnd = () => {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h / 4294967296;
  };
  const finder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  let d = '';
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (finder(x, y)) continue;
      if (x >= 9 && x <= 15 && y >= 9 && y <= 15) continue; // room for the logo
      const on = y === 6 || x === 6 ? (x + y) % 2 === 0 : rnd() < 0.48;
      if (on) d += `M${x + 1} ${y + 1}h1v1h-1z`;
    }
  }
  return d;
}

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Rect x={x + 1} y={y + 1} width={7} height={7} fill={colors.ink} />
      <Rect x={x + 2} y={y + 2} width={5} height={5} fill={colors.paper} />
      <Rect x={x + 3} y={y + 3} width={3} height={3} fill={colors.ink} />
    </G>
  );
}

export function InviteQR({
  code,
  size = 168,
  label = 'QR code to join the group',
}: {
  code: string;
  size?: number;
  label?: string;
}) {
  const logo = Math.round(size * 0.22);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{
        padding: 10,
        borderWidth: stroke.m,
        borderColor: colors.line,
        borderRadius: 16,
        backgroundColor: colors.paper,
        alignSelf: 'center',
      }}>
      <Svg width={size} height={size} viewBox={`0 0 ${N + 2} ${N + 2}`}>
        <Rect width={N + 2} height={N + 2} fill={colors.paper} />
        <Path d={cells(code)} fill={colors.ink} />
        <Finder x={0} y={0} />
        <Finder x={N - 7} y={0} />
        <Finder x={0} y={N - 7} />
      </Svg>
      <View
        style={{
          position: 'absolute',
          left: 10 + (size - logo) / 2,
          top: 10 + (size - logo) / 2,
          width: logo,
          height: logo,
          borderRadius: 10,
          borderWidth: stroke.m,
          borderColor: colors.line,
          backgroundColor: colors.brand,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Svg width={logo * 0.55} height={logo * 0.55} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 15l3-3 3 3 3-3 3 3 3-3 3 3"
            stroke={colors.ink}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
}
