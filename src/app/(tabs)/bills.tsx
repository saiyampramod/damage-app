import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillLine } from '@/components/BillLine';
import { tagAction, tagFor } from '@/components/billTag';
import { Label, Note, SearchField, TabTop, Tags } from '@/components/ledger/parts';
import { MoveSheet } from '@/components/ledger/sheets';
import { PRICE_TAG_WIDTH, PriceTag } from '@/components/PriceTag';
import { bills, people } from '@/data/mock';
import { NEEDS_YOU } from '@/data/money';
import { FEATURED, billById, openBillList, useStore } from '@/data/store';
import type { Bill } from '@/data/types';
import { colors, gutter } from '@/theme/tokens';

type Filter = 'all' | 'needs' | 'open' | 'settled';
/** Height of the floating nav bar, so the list ends just above it. */
const DOCK = 64;
const GAP = 14;
const TILTS = [-1, 1, 0.8, -0.8];

const needsYou = (b: Bill) => NEEDS_YOU.includes(b.status);
const newestFirst = (a: Bill, b: Bill) => b.date.localeCompare(a.date);

/**
 * Bills, on plain white (no dotted paper, decided by the founder): search, then All / Needs you /
 * Open / Settled. The first few open bills (`FEATURED`,
 * waiting on you first, then newest) are the same price tags as on Home, two to a row, all the
 * same size. Everything after them is a line item (`BillLine`): the rest of the open bills, then
 * the settled ones. A bill in a group carries its group's badge (colour and kind icon) and name;
 * the group itself lives on People. Hold a tag or a row to move the bill into a group.
 */
export default function BillsScreen() {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [moving, setMoving] = useState<Bill | null>(null);

  const query = q.trim().toLowerCase();
  function hit(b: Bill) {
    if (!query) return true;
    const group = b.groupId ? (billById(b.groupId)?.name ?? '') : '';
    return [b.name, group, ...b.people.map((p) => people[p]?.name ?? ''), String(b.total)]
      .join(' ')
      .toLowerCase()
      .includes(query);
  }

  // The same order as Home, so the tags here are the tags there.
  const openList = openBillList().filter(hit);
  const done = bills
    .filter((b) => b.kind === 'bill' && b.status === 'settled' && hit(b))
    .sort(newestFirst);
  const openShown =
    filter === 'all'
      ? openList
      : filter === 'needs'
        ? openList.filter(needsYou)
        : filter === 'open'
          ? openList.filter((b) => b.status === 'wait')
          : [];
  const tags = openShown.slice(0, FEATURED);
  const lines = [
    ...openShown.slice(FEATURED),
    ...(filter === 'all' || filter === 'settled' ? done : []),
  ];

  const cols = Math.max(2, Math.floor((width - gutter * 2 + GAP) / (PRICE_TAG_WIDTH + GAP)));
  const tagW = Math.floor((width - gutter * 2 - GAP * (cols - 1)) / cols);

  const allNeeds = bills.filter((b) => b.kind === 'bill' && needsYou(b)).length;
  const FILTERS: [Filter, string][] = [
    ['all', 'All'],
    ['needs', allNeeds ? `Needs you · ${allNeeds}` : 'Needs you'],
    ['open', 'Open'],
    ['settled', 'Settled'],
  ];

  function grid(list: Bill[]) {
    const rows: Bill[][] = [];
    for (let i = 0; i < list.length; i += cols) rows.push(list.slice(i, i + cols));
    return (
      <View style={styles.grid}>
        {rows.map((r, ri) => (
          <View key={r[0].id} style={styles.gridRow}>
            {r.map((b, ci) => (
              <PriceTag
                key={b.id}
                {...tagFor(b)}
                title={b.name}
                width={tagW}
                tilt={TILTS[(ri * cols + ci) % TILTS.length]}
                onPress={() => router.push(`/bill/${b.id}`)}
                onLongPress={() => setMoving(b)}
                onAction={() => tagAction(b)}
              />
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 12) + 6 + DOCK + 12,
        }}>
        <TabTop title="Bills" />
        <SearchField value={q} onChange={setQ} placeholder="Search bills" />
        <Tags label="Show" options={FILTERS} value={filter} onChange={setFilter} />

        <ScrollView
          style={{ flex: 1, marginTop: 6 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {tags.length ? grid(tags) : null}
          {lines.length ? (
            <View style={{ marginTop: tags.length ? 14 : 4 }}>
              {tags.length ? <Label text="More bills" aside={String(lines.length)} /> : null}
              {lines.map((b, n) => (
                <BillLine key={b.id} bill={b} first={n === 0} onLongPress={() => setMoving(b)} />
              ))}
            </View>
          ) : null}
          {!tags.length && !lines.length ? (
            <View style={{ marginTop: 24 }}>
              <Note>
                {query
                  ? `Nothing matches “${q.trim()}”.`
                  : filter === 'needs'
                    ? 'Nothing needs you right now.'
                    : filter === 'settled'
                      ? 'Nothing settled yet.'
                      : 'No bills yet.'}
              </Note>
            </View>
          ) : null}
        </ScrollView>
      </View>
      <MoveSheet bill={moving} onClose={() => setMoving(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { paddingHorizontal: gutter, paddingTop: 6, paddingBottom: 6, gap: 22 },
  gridRow: { flexDirection: 'row', gap: GAP, alignItems: 'stretch' },
});
