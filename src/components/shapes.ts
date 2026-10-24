/**
 * Sticker outlines, ported from the Damage design previews.
 * Each shape is a radius function r(t) between 0 and 1, sampled into an SVG path.
 */
export type StickerShape = 'circle' | 'scallop' | 'squircle' | 'cloud' | 'burst' | 'blob' | 'hex';

const SHAPES: Record<StickerShape, (t: number) => number> = {
  circle: () => 1,
  scallop: (t) => 0.915 + 0.085 * Math.cos(10 * t),
  squircle: (t) =>
    0.93 * Math.pow(Math.pow(Math.abs(Math.cos(t)), 4) + Math.pow(Math.abs(Math.sin(t)), 4), -0.25),
  cloud: (t) => 0.8 + 0.2 * Math.abs(Math.cos(2.5 * t)),
  burst: (t) => {
    const c = (Math.cos(12 * t) + 1) / 2;
    return 0.8 + 0.2 * Math.pow(c, 1.6);
  },
  blob: (t) => 0.92 + 0.055 * Math.cos(2 * t + 0.6) + 0.03 * Math.cos(3 * t + 1.9),
  hex: (t) => {
    const a = Math.PI / 3;
    const m = (((t + Math.PI / 2) % a) + a) % a;
    return (0.72 * Math.cos(Math.PI / 6)) / Math.cos(m - Math.PI / 6) + 0.26;
  },
};

const cache = new Map<string, string>();

export function shapePath(shape: StickerShape, size: number): string {
  const key = `${shape}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const fn = SHAPES[shape] ?? SHAPES.circle;
  const c = size / 2;
  const R = size / 2 - 1.5;
  const n = 180;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2;
    const r = R * fn(t);
    pts.push(`${(c + Math.cos(t) * r).toFixed(2)} ${(c + Math.sin(t) * r).toFixed(2)}`);
  }
  const d = 'M' + pts.join('L') + 'Z';
  cache.set(key, d);
  return d;
}

/**
 * A card outline with rounded top corners and a torn, zig-zag bottom edge
 * (a receipt ripped off the roll). `depth` is how deep each tooth goes.
 */
export function tornCardPath(
  width: number,
  height: number,
  { radius = 20, tooth = 12, depth = 9 }: { radius?: number; tooth?: number; depth?: number } = {},
): string {
  const w = Math.max(width, radius * 2);
  const base = height - depth;
  const n = Math.max(2, Math.round(w / tooth));
  const step = w / n;
  const teeth: string[] = [];
  for (let k = 1; k <= n; k++) {
    const x = w - k * step;
    const y = k % 2 === 0 ? base : base + depth;
    teeth.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return (
    `M0 ${radius} A${radius} ${radius} 0 0 1 ${radius} 0 H${w - radius} ` +
    `A${radius} ${radius} 0 0 1 ${w} ${radius} V${base} ${teeth.join(' ')} L0 ${base} Z`
  );
}

/** The torn-paper seam used by the logo and the add button (from TearMark). */
export function tearHalf(outer: number, seam: number): string {
  const teeth: string[] = [];
  for (let y = -10, i = 0; y <= 140; y += 10, i++) teeth.push(`L${i % 2 === 0 ? seam : 60} ${y}`);
  return `M${outer} -20 H60 ${teeth.join(' ')} H${outer} Z`;
}
