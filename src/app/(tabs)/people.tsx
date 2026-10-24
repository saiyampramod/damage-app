import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatRow } from '@/components/ChatRow';
import { Label, SearchField, TabTop, Tags } from '@/components/ledger/parts';
import { Txt } from '@/components/Txt';
import { chats, sortChats, type ChatSort } from '@/data/chats';
import { useStore } from '@/data/store';
import { colors } from '@/theme/tokens';

type Show = 'all' | 'in' | 'out';
const SHOW: [Show, string][] = [
  ['all', 'Everyone'],
  ['in', 'Owe you'],
  ['out', 'You owe'],
];

/** Height of the floating nav bar, so the list ends just above it. */
const DOCK = 64;

/**
 * People: search, Everyone / Owe you / You owe as small tags, then people and groups in one list,
 * like WhatsApp's chats (the founder's idea): each row is a person or a group with what happened
 * last on it, when, where you stand (+₹ green owes you, −₹ red you owe) and a lime count of bills
 * waiting on you. A person is a sticker, a group its pass from Home at the same height, flat
 * (`ChatRow`). Latest first, or most money first (the switch on the right); anything square,
 * and settled groups, sit at the end. No buttons on the rows; Nudge, Pay and Settle up live on
 * the person's or the group's page. There are no circles any more.
 */
export default function PeopleScreen() {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const insets = useSafeAreaInsets();
  const [show, setShow] = useState<Show>('all');
  const [sort, setSort] = useState<ChatSort>('latest');
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const list = sortChats(
    chats()
      .filter((c) => !query || c.name.toLowerCase().includes(query))
      .filter((c) => show === 'all' || (show === 'in' ? c.amount >= 0.5 : c.amount <= -0.5)),
    sort,
  );

  const empty = query
    ? `Nobody matches “${q.trim()}”.`
    : show === 'in'
      ? 'Nobody owes you right now.'
      : show === 'out'
        ? 'You don’t owe anyone.'
        : 'Nobody here yet.';

  return (
    // Plain white, no dotted paper: the list is easier to read on a clean page.
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 12) + 6 + DOCK + 12,
        }}>
        <TabTop title="People" />
        <SearchField value={q} onChange={setQ} placeholder="Search people and groups" />
        <Tags label="Show" options={SHOW} value={show} onChange={setShow} />
        <View style={{ marginTop: 6 }}>
          <Label
            text={`People and groups · ${list.length}`}
            action={{
              label: sort === 'latest' ? 'Latest first ⇅' : 'Most money first ⇅',
              onPress: () => setSort(sort === 'latest' ? 'money' : 'latest'),
            }}
          />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {list.length ? (
            list.map((c, n) => (
              <ChatRow key={c.key} chat={c} index={n} first={n === 0 || list[n - 1].kind === 'group'} />
            ))
          ) : (
            <Txt variant="body" color={colors.inkSoft} style={styles.empty}>
              {empty}
            </Txt>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { textAlign: 'center', padding: 24 },
});
