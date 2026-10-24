import Svg, { Path } from 'react-native-svg';

/** Line icons from the Damage design system (24×24, round caps). */
const ICONS = {
  home: ['M4 11l8-7 8 7v9H4z'],
  stack: ['M8.5 7.5h11v13h-11z', 'M5 17V4h11', 'M11.5 11.5h5M11.5 15h3.5'],
  wifi: ['M2.5 9a14 14 0 0 1 19 0', 'M5.5 12.5a9.5 9.5 0 0 1 13 0', 'M8.8 16a4.8 4.8 0 0 1 6.4 0', 'M12 19.5v.01'],
  people: [
    'M12.5 8a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0',
    'M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5',
    'M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.2 2.6 3.5 5.5',
  ],
  peoplePlus: [
    'M12.5 8a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0',
    'M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5',
    'M19 7v6M16 10h6',
  ],
  bills: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6M9 12h6'],
  insights: ['M4 20h16M7 16v-5M12 16V6M17 16v-8'],
  bell: ['M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z', 'M10 21h4'],
  back: ['M15 5l-7 7 7 7'],
  chevron: ['M9 5l7 7-7 7'],
  arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
  close: ['M6 6l12 12M18 6L6 18'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  pen: ['M4 20l4.5-1L19 8.5 15.5 5 5 15.5z', 'M13.5 7l3.5 3.5'],
  check: ['M5 12l5 5 9-10'],
  upload: ['M12 15V4', 'M7 9l5-5 5 5', 'M5 20h14'],
  bolt: ['M13 3L5 14h6l-1 7 8-11h-6z'],
  boltOff: ['M13 3l-2.6 3.6M8.3 9.5L5 14h6l-1 7 3.4-4.7M15.6 12H18l-1.6 2.2', 'M4 4l16 16'],
  scan: [
    'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3',
    'M8 12h8',
  ],
  search: ['M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14', 'M20 20l-4-4'],
  down: ['M6 9l6 6 6-6'],
  repeat: [
    'M4 11V9a3 3 0 0 1 3-3h12',
    'M16 3l3 3-3 3',
    'M20 13v2a3 3 0 0 1-3 3H5',
    'M8 21l-3-3 3-3',
  ],
  flag: ['M5 21V4', 'M5 4h12l-2.5 4 2.5 4H5'],
  qr: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h3v3M20 14v.01M14 20h.01M17 20h3v-3'],
  // Quick bill categories
  cab: ['M4 16v-4l2-5h12l2 5v4z', 'M4 12h16', 'M7 16v3M17 16v3', 'M9 4h6'],
  fuel: [
    'M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15',
    'M3.5 20h12',
    'M8 8h3',
    'M14 9l3 2v6a1.5 1.5 0 0 0 3 0V9l-3-3',
  ],
  sports: [
    'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18',
    'M3.5 9.5c3 1.5 6 1.5 8.5-1s5.5-3 8.5-1',
    'M3.5 14.5c3-1.5 6-1.5 8.5 1s5.5 2.5 8.5 1',
  ],
  chai: [
    'M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z',
    'M16 10h1.5a2.5 2.5 0 0 1 0 5H16',
    'M9 3v3M12.5 3v3',
  ],
  food: [
    'M7 3v18',
    'M4.5 3v5a2.5 2.5 0 0 0 5 0V3',
    'M17 21V3c-2.5 1.5-3.5 4-3.5 7.5 0 1.5 1 2.5 3.5 2.5',
  ],
  groceries: ['M5 8h14l-1.2 12H6.2z', 'M9 8V6.5a3 3 0 0 1 6 0V8'],
  rent: ['M4 11l8-7 8 7v9H4z', 'M10 20v-5h4v5'],
  /** Group kinds: a suitcase for a trip, a glass for an outing (monthly uses `rent`). */
  trip: [
    'M5.5 7h13A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-8A2.5 2.5 0 0 1 5.5 7z',
    'M8.5 7V5.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V7',
    'M3 12.5h18',
  ],
  drinks: ['M5 4h14l-7 8.5z', 'M12 12.5V20', 'M8 20.5h8'],
  movie: ['M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z', 'M14 7.5v2M14 11v2M14 14.5v2'],
  /* The bill made from a receipt ("After the scan, earlier"). */
  tag: ['M3 12V4h8l10 10-8 8z', 'M7.5 8.2v.01'],
  user: ['M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8z', 'M4 21c.8-4 4-6 8-6s7.2 2 8 6'],
  link: [
    'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2',
    'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2',
  ],
  lock: ['M7 11V8a5 5 0 0 1 10 0v3', 'M5 11h14v10H5z'],
  erase: ['M9 6h11v12H9l-5-6z', 'M13 10l4 4M17 10l-4 4'],
  tune: ['M4 7h10M18 7h2M16 5v4', 'M4 17h4M12 17h8M10 15v4'],
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 22,
  color = 'currentColor',
  strokeWidth = 2.4,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICONS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
