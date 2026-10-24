/**
 * Home. The damage today, then three rows that slide sideways, each up to 8 and ending on See all:
 * - Bills: exactly the price tags at the top of Bills (`featuredBills`: the first few open bills,
 *   waiting on you first, then newest), ending on All bills.
 * - People: the look it had from the start, big round avatars (bigger for more money) with the
 *   amount in white on a black pill and "Jay owes you" under it; everyone you have money open
 *   with, biggest first.
 * - Groups: each group as a pass (`GroupPass`): a stub in the group's colour with its kind, the
 *   name, who's in and where you stand.
 */
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CircleButton } from '@/components/CircleButton';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import { tagAction, tagFor } from '@/components/billTag';
import { GroupPass, PASS_WIDTH } from '@/components/group/GroupPass';
import { BIG_MAX, BIG_WIDTH, BigPerson, SeeAllCard, SeeAllDot } from '@/components/money/PersonCard';
import { PRICE_TAG_WIDTH, PriceTag } from '@/components/PriceTag';
import { ReceiptSummary } from '@/components/ReceiptSummary';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Txt } from '@/components/Txt';
import { needsOk } from '@/data/activity';
import { ME, people } from '@/data/mock';
import { NEEDS_YOU } from '@/data/money';
import { balances, featuredBills, groupList, homeTotals, openBillList, useStore } from '@/data/store';
import { colors, gutter } from '@/theme/tokens';

const TILTS = [-2, 2, -1.5, 2, -2, 1.5];
const GAP = 14;
const FACE_GAP = 6;
/** How many cards each row shows before See all. */
const MAX = 8;

export default function HomeScreen() {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore(); // settling on a person, group or bill page changes these totals
  const totals = homeTotals();
  // Exactly the price tags at the top of Bills: the first few open bills, waiting on you first.
  const list = featuredBills();
  const moreOpen = openBillList().length - list.length;
  const needsCount = list.filter((b) => NEEDS_YOU.includes(b.status)).length;
  const { active } = groupList();
  const owed = balances();
  const me = people[ME];
  const biggest = Math.max(...owed.map((p) => Math.abs(p.amount)), 1);
  /** Bigger for more money, as it always was: 60 at the least, 84 for the biggest. */
  const faceSize = (amount: number) =>
    Math.max(60, Math.round(BIG_MAX * Math.sqrt(Math.abs(amount) / biggest)));

  return (
    <Screen withNav>
      <View style={styles.header}>
        <Logo />
        <View style={styles.headerRight}>
          <CircleButton
            accessibilityLabel="Activity"
            badge={needsOk()}
            onPress={() => router.push('/activity')}>
            <Icon name="bell" size={20} />
          </CircleButton>
          <CircleButton
            accessibilityLabel="Your profile"
            fill={colors.brand}
            onPress={() => router.push('/profile')}>
            <Txt variant="section" style={styles.meLetter}>
              {me?.letter ?? me?.name.charAt(0) ?? '?'}
            </Txt>
          </CircleButton>
        </View>
      </View>

      <View style={styles.summary}>
        <ReceiptSummary comingIn={totals.comingIn} goingOut={totals.goingOut} />
      </View>

      <SectionHeader
        title="Bills"
        aside={needsCount ? `${needsCount} need you · See all` : 'See all'}
        onAside={() => router.push('/bills')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={PRICE_TAG_WIDTH + GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.rail}>
        {list.map((bill, i) => {
          const t = tagFor(bill);
          return (
            <PriceTag
              key={bill.id}
              {...t}
              title={bill.name}
              tilt={TILTS[i % TILTS.length]}
              onPress={() => router.push(`/bill/${bill.id}`)}
              onAction={() => tagAction(bill)}
            />
          );
        })}
        <SeeAllCard
          label="All bills"
          sub={moreOpen > 0 ? `${moreOpen} more open` : 'Open and settled'}
          onPress={() => router.push('/bills')}
        />
      </ScrollView>

      <SectionHeader
        title="People"
        aside={owed.length ? 'Biggest first' : undefined}
      />
      {owed.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={BIG_WIDTH + FACE_GAP}
          decelerationRate="fast"
          contentContainerStyle={styles.faces}>
          {owed.slice(0, MAX).map((p) => (
            <BigPerson key={p.person} id={p.person} amount={p.amount} size={faceSize(p.amount)} />
          ))}
          <SeeAllDot label="Everyone" onPress={() => router.push('/people')} />
        </ScrollView>
      ) : (
        <Txt variant="body" style={{ paddingHorizontal: gutter, marginTop: 12 }}>
          Everyone’s square. Suspicious.
        </Txt>
      )}

      {active.length ? (
        <>
          <SectionHeader title="Groups" aside="See all" onAside={() => router.push('/people')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={PASS_WIDTH + GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.passes}>
            {active.slice(0, MAX).map((g) => (
              <GroupPass key={g.id} group={g} />
            ))}
            <SeeAllCard
              label="All groups"
              sub={active.length > MAX ? `${active.length - MAX} more` : 'On People'}
              onPress={() => router.push('/people')}
            />
          </ScrollView>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meLetter: { fontSize: 15, lineHeight: 20 },
  summary: { paddingHorizontal: gutter, marginTop: 18 },
  rail: {
    paddingHorizontal: gutter,
    paddingTop: 14,
    paddingBottom: 22,
    gap: GAP,
    alignItems: 'flex-start',
  },
  passes: {
    paddingHorizontal: gutter,
    paddingTop: 16,
    paddingBottom: 22,
    gap: GAP,
    alignItems: 'stretch',
  },
  faces: {
    paddingHorizontal: gutter - 8,
    paddingTop: 16,
    paddingBottom: 8,
    gap: FACE_GAP,
    alignItems: 'flex-start',
  },
});
