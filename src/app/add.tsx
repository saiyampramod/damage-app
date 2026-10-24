import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton } from '@/components/CircleButton';
import { DottedBackground } from '@/components/DottedBackground';
import { Icon, type IconName } from '@/components/Icon';
import { Disc } from '@/components/quick/parts';
import { QuickBill } from '@/components/quick/QuickBill';
import { Txt } from '@/components/Txt';
import { CATEGORIES, groupById, type CategoryId } from '@/data/quick';
import { colors, fonts, gutter, radius, shadow, stroke } from '@/theme/tokens';

/**
 * The + screen (layout A). Opens from a tap on the tear in the nav bar, and from a group's Add
 * expense (`?group=id`), where everything added goes into that group.
 * Scan a bill and Create new group side by side (Type it in, inside a group), Quick bill tiles
 * (each opens the Quick bill pop-up right here), then Recurring bill.
 */
export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ group?: string }>();
  const group = params.group ? groupById(params.group) : undefined;
  const into = group ? { group: group.id } : {};
  const [quick, setQuick] = useState(false);
  const [tile, setTile] = useState<CategoryId>('cab');
  const [notice, setNotice] = useState<string | null>(null);

  // A Quick bill tile opens the pop-up over this screen, for that kind of bill.
  function openTile(id: CategoryId) {
    setTile(id);
    setQuick(true);
  }

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  return (
    <View style={{ flex: 1 }}>
      <DottedBackground />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <CircleButton size={44} accessibilityLabel="Close" onPress={() => router.back()}>
            <Icon name="close" size={22} color={colors.ink} />
          </CircleButton>
        </View>
        <Txt variant="poster" accessibilityRole="header" style={styles.title}>
          What’s the damage?
        </Txt>
        {group ? (
          <Txt variant="lead" style={styles.into}>
            Adding to {group.name}
          </Txt>
        ) : null}

        <View style={styles.pair}>
          <BigCard
            icon="scan"
            title="Scan a bill"
            sub="Any receipt, item by item"
            fill={colors.highlight}
            onPress={() => router.push({ pathname: '/scan', params: into })}
          />
          {group ? (
            <BigCard
              icon="pen"
              title="Type it in"
              sub="No receipt? Add the lines"
              fill={colors.paper}
              onPress={() => router.push({ pathname: '/review', params: { manual: '1', ...into } })}
            />
          ) : (
            <BigCard
              icon="peoplePlus"
              title="Create new group"
              sub="Trips, flats, teams"
              fill={colors.paper}
              onPress={() => router.push('/group/new')}
            />
          )}
        </View>

        <View style={styles.sec}>
          <Txt variant="section">Quick bill</Txt>
          <Txt variant="label">No receipt needed</Txt>
        </View>
        <View style={styles.grid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => openTile(c.id)}
              accessibilityRole="button"
              accessibilityLabel={`Quick bill: ${c.label}`}
              style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
              <Icon name={c.icon} size={26} color={colors.ink} />
              <Txt variant="small" style={styles.tileText} numberOfLines={1}>
                {c.label}
              </Txt>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/recurring')}
          accessibilityRole="button"
          accessibilityLabel="Recurring bill. Rent, wifi, maid, on your dates"
          style={({ pressed }) => [styles.rcard, pressed && styles.pressed]}>
          <Disc icon="repeat" size={44} fill={colors.highlight} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="title" style={{ fontSize: 19, lineHeight: 23 }}>
              Recurring bill
            </Txt>
            <Txt variant="body" style={{ fontSize: 14, lineHeight: 19 }}>
              Rent, wifi, maid · on your dates
            </Txt>
          </View>
          <Icon name="chevron" size={24} strokeWidth={2.8} color={colors.ink} />
        </Pressable>
      </ScrollView>

      <QuickBill
        open={quick}
        start={tile}
        inGroup={group?.id}
        onClose={() => setQuick(false)}
        onAdded={(line) => {
          setQuick(false);
          setNotice(line);
        }}
      />

      {notice ? (
        <Animated.View
          entering={FadeInUp.duration(180)}
          exiting={FadeOutUp.duration(180)}
          style={[styles.notice, { top: insets.top + 8 }]}
          pointerEvents="none">
          <Txt
            variant="label"
            color={colors.onAction}
            accessibilityLiveRegion="polite"
            style={{ textAlign: 'center' }}>
            {notice}
          </Txt>
        </Animated.View>
      ) : null}
    </View>
  );
}

function BigCard({
  icon,
  title,
  sub,
  fill,
  onPress,
}: {
  icon: IconName;
  title: string;
  sub: string;
  fill: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => [styles.big, { backgroundColor: fill }, pressed && styles.pressed]}>
      <Disc icon={icon} size={44} />
      <View>
        <Txt variant="section" style={{ lineHeight: 21 }}>
          {title}
        </Txt>
        <Txt variant="small" style={{ fontSize: 13, lineHeight: 17, marginTop: 3 }}>
          {sub}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: gutter },
  title: { fontSize: 30, lineHeight: 34, paddingHorizontal: gutter },
  into: { marginTop: 6, paddingHorizontal: gutter },
  pair: { flexDirection: 'row', gap: 10, paddingHorizontal: gutter, marginTop: 14 },
  big: {
    flex: 1,
    minHeight: 122,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 18,
    boxShadow: shadow.m,
    padding: 12,
    justifyContent: 'space-between',
    gap: 10,
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: 'none' },
  sec: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: gutter,
    marginTop: 18,
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: gutter },
  tile: {
    width: '30%',
    flexGrow: 1,
    height: 72,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: radius.m,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tileText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  notice: {
    position: 'absolute',
    left: gutter,
    right: gutter,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.m,
    backgroundColor: colors.action,
  },
  rcard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
    marginHorizontal: gutter,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
    boxShadow: shadow.m,
  },
});
