/**
 * Damage design tokens.
 *
 * Colours and fonts are still being decided. Every screen and component reads
 * from this file, so a palette or font change happens here and nowhere else.
 * Never hard-code a hex value or a font name in a component.
 */

/** Raw palette. Swap these to re-skin the app. */
const palette = {
  /** Slate, a soft blue-black (the founder's pick, 22 Oct; was pure #000000). Text, outlines, hard shadows, black tags and buttons. */
  black: '#1B1F27',
  blackSoft: '#414754',
  white: '#FFFFFF',
  /** The page. Pure white, the same as paper: one white everywhere (the founder's call, 24 Oct). */
  pageWhite: '#ffffff',
  lime: '#C6F24E',
  seam: '#0a0b09',
  greyText: '#b8b8b8',
  viewfinder: '#1b1b1b',
  greyHint: '#6b6b6b',
  greyMuted: '#8a8a8a',
  offWhite: '#fafaf7',
  green: '#15803D',
  greenBright: '#4ADE80',
  red: '#DC2626',
  greenWash: '#E4F6EA',
  redWash: '#FDE9E9',
  limeWash: '#EEF9CF',
  greyFill: '#ECECEA',
  greyFillText: '#5F5F5F',
} as const;

/** What each colour is for. Components use these names, not the palette. */
export const colors = {
  page: palette.pageWhite,
  pageDot: 'rgba(0,0,0,0.16)',
  ink: palette.black,
  inkSoft: palette.blackSoft,
  /** Placeholder text in fields, and amounts that are still zero. */
  inkHint: palette.greyHint,
  /** Settled rows, chevrons and other quiet bits. */
  inkMuted: palette.greyMuted,
  /** Thin lines between rows in a card. */
  hairline: 'rgba(0,0,0,0.1)',
  /** The edge of a filter chip or tag that isn't picked. */
  chipEdge: 'rgba(0,0,0,0.2)',
  /** A row while it's pressed, and the inside of an opened group stack. */
  pressed: 'rgba(0,0,0,0.04)',
  inset: palette.offWhite,
  /** The dim layer behind a sheet. */
  veil: 'rgba(0,0,0,0.45)',
  paper: palette.white,
  line: palette.black,
  shade: palette.black,

  /** The brand colour: logo, tear button, highlights. */
  brand: palette.lime,
  brandSeam: palette.seam,
  highlight: palette.lime,

  /** The torn receipt card at the top of Home. */
  summaryFill: palette.white,
  summaryStroke: palette.lime,
  summaryShadow: palette.lime,

  /**
   * Which way money goes. Every amount between you and someone carries it: green with a + for
   * money coming to you, red with a − for money you owe. The words with it use the same colour.
   */
  inText: palette.green,
  outText: palette.red,
  /** Pale fills behind a card or tag whose money comes to you (green) or goes out (red). */
  inWash: palette.greenWash,
  outWash: palette.redWash,
  /** A ring that keeps overlapping avatars apart. */
  avatarRing: palette.white,

  /**
   * A bill's colour (the founder's scheme): lime = waiting on you (tag, who paid, close), black =
   * money coming back to you, white = you owe. No green on any of them; only a white tag's −₹ is red.
   */
  owedFill: palette.black,
  onOwed: palette.white,
  onOwedSoft: palette.greyText,
  /** The number on a black tag (money coming back): a bright green that reads on black. */
  inOnInk: palette.greenBright,
  oweFill: palette.white,
  onOwe: palette.black,
  needsFill: palette.lime,
  onNeeds: palette.black,
  onNeedsSoft: palette.blackSoft,

  /** Primary action buttons. */
  action: palette.black,
  onAction: palette.white,
  /** Action on top of a black surface. */
  actionOnDark: palette.lime,
  onActionOnDark: palette.black,
  /** The main button in a page's bottom bar (Settle), and a ticked tick. Lime is for things you tap or picked; money itself stays black. */
  go: palette.lime,
  onGo: palette.black,
  ticked: palette.lime,

  /** A pale lime behind something picked or just jumped to (a split row, the group banner). */
  highlightSoft: palette.limeWash,
  /** A bottom button that isn't the next step yet ("3 items to tag"), and its words. */
  quiet: palette.greyFill,
  onQuiet: palette.greyFillText,

  /** The camera: the viewfinder card behind the live preview, its shadow and guide corners. */
  viewfinder: palette.viewfinder,
  viewfinderShadow: palette.lime,
  viewfinderGuide: palette.lime,
} as const;

/**
 * One colour per person for their round avatar (black letters read on all of them).
 * You are always lime. Anyone not listed gets one from `avatarSpare`, picked from their id.
 */
export const avatarColors: Record<string, string> = {
  me: palette.lime,
  jay: '#FDE047',
  riya: '#C4B5FD',
  kabir: '#7DD3FC',
  neth: '#86EFAC',
  sris: '#F9A8D4',
  tanvi: '#FDBA74',
  om: '#FCA5A5',
  ananya: '#5EEAD4',
};
/**
 * Group colours: a group takes the next one when it's made (you can pick another on Create new
 * group). Its pass stub is this colour, so two groups never look the same at a glance.
 * Groups keep an index into this list (`Bill.tint`), never a hex.
 */
export const groupColors = ['#FDBA74', '#F9A8D4', '#7DD3FC', '#86EFAC', '#C4B5FD', '#FDE047', '#5EEAD4', '#FCA5A5'] as const;

const avatarSpare = ['#A5B4FC', '#FDA4AF', '#67E8F9', '#FCD34D', '#BEF264', '#D8B4FE'];

export function avatarColor(id: string): string {
  if (avatarColors[id]) return avatarColors[id];
  let n = 0;
  for (const ch of id) n += ch.charCodeAt(0);
  return avatarSpare[n % avatarSpare.length];
}

/**
 * Font families. Keys must match what is loaded in src/app/_layout.tsx.
 * To change a font: load the new one there and point the role here.
 */
export const fonts = {
  display: 'BowlbyOne_400Regular',
  wordmark: 'ArchivoExpanded-Black',
  body: 'RethinkSans_500Medium',
  bodyBold: 'RethinkSans_700Bold',
  bodyHeavy: 'RethinkSans_800ExtraBold',
} as const;

export const type = {
  poster: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44 },
  amountLarge: { fontFamily: fonts.display, fontSize: 38, lineHeight: 46 },
  amount: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
  card: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26 },
  title: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24 },
  section: { fontFamily: fonts.display, fontSize: 18, lineHeight: 22 },
  wordmark: { fontFamily: fonts.wordmark, fontSize: 24, lineHeight: 28, letterSpacing: -0.8 },
  bodyLarge: { fontFamily: fonts.bodyHeavy, fontSize: 22, lineHeight: 26 },
  bodyStrong: { fontFamily: fonts.bodyHeavy, fontSize: 18, lineHeight: 24 },
  lead: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 18 },
  small: { fontFamily: fonts.bodyBold, fontSize: 12, lineHeight: 16 },
  /** Page titles on People and Bills. */
  pageTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 42 },
  /** Name in a page's top line. Display type needs room above it on iOS, hence the tall line. */
  headerTitle: { fontFamily: fonts.display, fontSize: 20, lineHeight: 28 },
  /** The total on the right of a page's top line. */
  headerAmount: { fontFamily: fonts.display, fontSize: 24, lineHeight: 34 },
  /** Rows in a list card. */
  rowTitle: { fontFamily: fonts.bodyHeavy, fontSize: 16, lineHeight: 20 },
  rowSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 17 },
  /** Small grey section labels (written in capitals). */
  eyebrow: { fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 16, letterSpacing: 1 },
  micro: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 14 },
} as const;

export type TypeVariant = keyof typeof type;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const;

export const radius = { s: 12, m: 16, l: 20, xl: 26, pill: 999 } as const;

export const stroke = { s: 2, m: 2.5, l: 3 } as const;

/** Hard, unblurred offset shadows: the sticker look. */
export const shadow = {
  xs: `2px 2px 0px ${colors.shade}`,
  s: `3px 3px 0px ${colors.shade}`,
  m: `4px 4px 0px ${colors.shade}`,
  l: `6px 6px 0px ${colors.shade}`,
} as const;

/** Side gutter for every screen. */
export const gutter = 16;

/** Height reserved at the bottom of scrolling screens for the floating nav bar. */
export const navClearance = 120;
