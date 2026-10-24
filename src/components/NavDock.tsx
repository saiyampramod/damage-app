import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { bills } from '@/data/mock';
import { yourSide } from '@/data/money';
import type { Bill } from '@/data/types';
import { colors, gutter, shadow, stroke } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Smooth } from './Smooth';
import { TearTile } from './TearTile';
import { Txt } from './Txt';

const TAB_ICONS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'home', label: 'Home' },
  people: { icon: 'people', label: 'People' },
  bills: { icon: 'bills', label: 'Bills' },
  dashboard: { icon: 'insights', label: 'Dashboard' },
};

const DOCK_H = 64;
const TEAR = 60;
const LIFT = 14;
const TILT = '-8deg';
/** How long you hold before the quick options open. The tear rips over this time. */
const HOLD_MS = 300;
const HIT_RADIUS = 60;
const ITEM_W = 92;
const SHAPE = 62;
/** Height of the box each option's shape sits in. */
const BOX_H = 72;
const SHADE = 3;

const FOLLOW = { damping: 22, stiffness: 420, mass: 0.5 };
const POP = { damping: 15, stiffness: 380, mass: 0.6 };

type Option =
  | { kind: 'scan'; label: string }
  | { kind: 'group-new'; label: string }
  | { kind: 'group'; label: string; bill: Bill };

/** The two groups you used most recently, for "add a bill to…". */
function latestGroups(): Bill[] {
  return bills
    .filter((b) => b.kind === 'group' && b.status !== 'settled')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);
}

function buzz(kind: 'open' | 'tick' | 'pick') {
  if (Platform.OS === 'web') return;
  if (kind === 'tick') Haptics.selectionAsync();
  else
    Haptics.impactAsync(
      kind === 'open' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
}

/**
 * The floating pill nav bar. Tap the torn tile to open the + screen (it slides up);
 * hold it for quick options.
 */
export function NavDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const tabs = state.routes.filter((r) => TAB_ICONS[r.name]);

  const options: Option[] = [
    { kind: 'group-new', label: 'New group' },
    { kind: 'scan', label: 'Scan bill' },
    ...latestGroups().map((bill) => ({ kind: 'group' as const, label: bill.name, bill })),
  ];

  // Where the tear tile's centre sits, and where each option sits relative to it.
  const bottom = Math.max(insets.bottom, 12) + 6;
  const ox = box.w / 2;
  const oy = box.h - bottom - DOCK_H / 2 - LIFT;
  const half = Math.min(132, box.w / 2 - 52);
  const xs = [-half, -half / 3, half / 3, half];
  const ys = [-118, -150, -150, -118];
  const spots = options.map((_, i) => ({ x: xs[i] ?? 0, y: ys[i] ?? -118 }));
  const spotsX = spots.map((s) => s.x);
  const spotsY = spots.map((s) => s.y);

  const progress = useSharedValue(0);
  const open = useSharedValue(0);
  const hot = useSharedValue(-1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const ts = useSharedValue(1);
  const start = useSharedValue({ x: 0, y: 0 });
  /** Stops a double tap from opening a screen twice. */
  const opening = useRef(false);

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
  }

  function goTo(name: string, key: string, focused: boolean) {
    const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  }

  function goToScan(group?: string) {
    if (opening.current) return;
    opening.current = true;
    router.push(group ? { pathname: '/scan', params: { group } } : '/scan');
    setTimeout(() => {
      opening.current = false;
    }, 600);
  }

  /** A tap on the tear opens the + screen: scan, new group, quick bill or recurring. */
  function openAdd() {
    buzz('pick');
    if (opening.current) return;
    opening.current = true;
    router.push('/add');
    setTimeout(() => {
      opening.current = false;
    }, 600);
  }

  function close() {
    open.set(withTiming(0, { duration: 140 }));
    hot.set(-1);
  }

  function choose(index: number) {
    buzz('pick');
    const option = options[index];
    setTimeout(() => {
      close();
      if (!option) return;
      if (option.kind === 'scan') goToScan();
      else if (option.kind === 'group-new') router.push('/group/new');
      else goToScan(option.bill.id);
    }, 150);
  }

  const hold = Gesture.Pan()
    .activateAfterLongPress(HOLD_MS)
    .onBegin(() => {
      progress.set(withTiming(1, { duration: HOLD_MS, easing: Easing.linear }));
    })
    .onStart((e) => {
      start.set({ x: e.x - TEAR / 2, y: e.y - TEAR / 2 });
      tx.set(0);
      ty.set(0);
      ts.set(1);
      ty.set(withSpring(-12, FOLLOW));
      ts.set(withSpring(1.05, FOLLOW));
      open.set(withSpring(1, POP));
      scheduleOnRN(buzz, 'open');
    })
    .onUpdate((e) => {
      const s = start.get();
      const x = s.x + e.translationX;
      const y = s.y + e.translationY;
      let best = -1;
      let bestD = 1e9;
      for (let i = 0; i < spotsX.length; i++) {
        const d = Math.hypot(spotsX[i] - x, spotsY[i] - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      const n = bestD < HIT_RADIUS ? best : -1;
      // Pull the tile towards the option it's over, like a magnet.
      const bx = n >= 0 ? x + (spotsX[n] - x) * 0.55 : x;
      const by = n >= 0 ? y + (spotsY[n] - y) * 0.55 : y;
      tx.set(withSpring(bx, FOLLOW));
      ty.set(withSpring(by, FOLLOW));
      ts.set(withSpring(n >= 0 ? 0.86 : 1.05, FOLLOW));
      if (n !== hot.get()) {
        hot.set(n);
        if (n >= 0) scheduleOnRN(buzz, 'tick');
      }
    })
    .onEnd(() => {
      const h = hot.get();
      if (h >= 0) {
        tx.set(withTiming(spotsX[h], { duration: 130 }));
        ty.set(withTiming(spotsY[h], { duration: 130 }));
        ts.set(withTiming(0.2, { duration: 130 }));
        scheduleOnRN(choose, h);
      } else {
        tx.set(withSpring(0, FOLLOW));
        ty.set(withSpring(0, FOLLOW));
        ts.set(withSpring(1, FOLLOW));
        open.set(withTiming(0, { duration: 160 }));
      }
    })
    .onFinalize(() => {
      progress.set(withTiming(0, { duration: 140 }));
    });

  const tap = Gesture.Tap()
    .maxDuration(HOLD_MS)
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(openAdd);
    });

  const gesture = Gesture.Race(hold, tap);

  const veilStyle = useAnimatedStyle(() => ({ opacity: open.get() * 0.96 }));
  const tabsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(open.get(), [0, 1], [1, 0.25]),
  }));
  const restingTileStyle = useAnimatedStyle(() => ({ opacity: open.get() > 0.05 ? 0 : 1 }));
  const markStyle = useAnimatedStyle(() => ({ opacity: open.get() > 0.05 ? 0.55 : 0 }));
  const dragStyle = useAnimatedStyle(() => ({
    opacity: open.get() > 0.05 ? 1 : 0,
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() },
      { rotate: TILT },
      { scale: ts.get() },
    ],
  }));

  const renderTab = (route: (typeof tabs)[number]) => {
    const meta = TAB_ICONS[route.name];
    const focused = state.routes[state.index]?.key === route.key;
    return (
      <Animated.View key={route.key} style={[styles.cell, tabsStyle]}>
        <Pressable
          onPress={() => goTo(route.name, route.key, focused)}
          accessibilityRole="tab"
          accessibilityLabel={meta.label}
          accessibilityState={{ selected: focused }}
          style={[styles.tab, focused && styles.tabOn]}>
          <Icon name={meta.icon} color={focused ? colors.onAction : colors.ink} />
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.veil, veilStyle]}
      />

      {box.w > 0
        ? options.map((option, i) => (
            <FanItem
              key={option.kind === 'group' ? option.bill.id : option.kind}
              option={option}
              index={i}
              left={ox + spots[i].x - ITEM_W / 2}
              top={oy + spots[i].y - BOX_H / 2}
              open={open}
              hot={hot}
            />
          ))
        : null}

      <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
        <View style={styles.dock}>
          {tabs.slice(0, 2).map(renderTab)}
          <View style={styles.cell}>
            <GestureDetector gesture={gesture}>
              <View
                accessible
                accessibilityRole="button"
                accessibilityLabel="Add a bill. Press and hold for quick options."
                style={styles.tear}>
                <Animated.View pointerEvents="none" style={[styles.mark, markStyle]} />
                <Animated.View style={restingTileStyle}>
                  <TearTile size={TEAR} progress={progress} />
                </Animated.View>
              </View>
            </GestureDetector>
          </View>
          {tabs.slice(2).map(renderTab)}
        </View>
      </View>

      {box.w > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.drag, { left: ox - TEAR / 2, top: oy - TEAR / 2 }, dragStyle]}>
          <TearTile size={TEAR} torn />
        </Animated.View>
      ) : null}
    </View>
  );
}

function FanItem({
  option,
  index,
  left,
  top,
  open,
  hot,
}: {
  option: Option;
  index: number;
  left: number;
  top: number;
  open: SharedValue<number>;
  hot: SharedValue<number>;
}) {
  const isHot = useDerivedValue(() => withSpring(hot.get() === index ? 1 : 0, POP));
  const dim = useDerivedValue(() =>
    withTiming(hot.get() >= 0 && hot.get() !== index ? 1 : 0, { duration: 120 }),
  );

  const itemStyle = useAnimatedStyle(() => {
    // Stagger: each option starts a little after the one before.
    const p = Math.min(1, Math.max(0, (open.get() - index * 0.06) / 0.82));
    return {
      opacity: Math.min(1, p * 1.6) * (1 - dim.get() * 0.55),
      transform: [{ translateY: (1 - p) * 60 }, { scale: 0.3 + 0.7 * p }],
    };
  });
  const shapeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -7 * isHot.get() }, { scale: 1 + 0.14 * isHot.get() }],
  }));

  const isGroup = option.kind === 'group';
  const owed = isGroup && yourSide(option.bill) > 0;
  const tilt = index % 2 ? '3deg' : '-3deg';

  return (
    <Animated.View pointerEvents="none" style={[styles.item, { left, top }, itemStyle]}>
      <Animated.View style={[styles.shapeBox, shapeStyle]}>
        {isGroup ? (
          <Smooth style={{ transform: [{ rotate: tilt }] }}>
            <View style={styles.tagWrap}>
              <View style={[styles.miniTag, styles.shade]} />
              <View
                style={[
                  styles.miniTag,
                  { backgroundColor: owed ? colors.owedFill : colors.oweFill },
                ]}>
                <View style={styles.miniHole} />
                <Icon name="bills" size={26} color={owed ? colors.onOwed : colors.ink} />
              </View>
            </View>
          </Smooth>
        ) : (
          <View style={styles.circleWrap}>
            <View style={[styles.circle, styles.shade]} />
            <View
              style={[
                styles.circle,
                { backgroundColor: option.kind === 'scan' ? colors.brand : colors.paper },
              ]}>
              <Icon
                name={option.kind === 'scan' ? 'scan' : 'peoplePlus'}
                size={26}
                color={colors.ink}
              />
            </View>
          </View>
        )}
      </Animated.View>
      <Txt variant="label" numberOfLines={2} style={styles.itemLabel}>
        {option.label}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  veil: { backgroundColor: colors.page },
  wrap: { position: 'absolute', left: gutter, right: gutter },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    height: DOCK_H,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: colors.paper,
    borderWidth: stroke.m,
    borderColor: colors.line,
    boxShadow: shadow.m,
  },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tab: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.action },
  tear: { width: TEAR, height: TEAR, transform: [{ translateY: -LIFT }, { rotate: TILT }] },
  mark: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
    borderWidth: stroke.m,
    borderStyle: 'dotted',
    borderColor: colors.line,
  },
  drag: { position: 'absolute', width: TEAR, height: TEAR },
  item: { position: 'absolute', width: ITEM_W, alignItems: 'center', gap: 8 },
  /** Same height for circles and tags so every label sits at the same distance. */
  shapeBox: { height: BOX_H, alignItems: 'center', justifyContent: 'center' },
  /** Hard shadow drawn as its own shape, so it hugs the outline with no gap. */
  shade: {
    position: 'absolute',
    left: SHADE,
    top: SHADE,
    backgroundColor: colors.shade,
    borderColor: colors.shade,
  },
  circleWrap: { width: SHAPE + SHADE, height: SHAPE + SHADE },
  circle: {
    width: SHAPE,
    height: SHAPE,
    borderRadius: SHAPE / 2,
    borderWidth: stroke.m,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagWrap: { width: SHAPE + SHADE, height: BOX_H - 4 + SHADE },
  miniTag: {
    width: SHAPE,
    height: BOX_H - 4,
    borderRadius: 12,
    borderWidth: stroke.m,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  miniHole: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.page,
  },
  itemLabel: { textAlign: 'center', fontSize: 13, lineHeight: 16 },
});
