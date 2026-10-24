/**
 * "Who's in?": pops up once a bill is made (and from Add on Who's here). Add people, or make it
 * part of a group; or share it with the QR or Share link (the one place to share a bill: the page
 * has no Share link of its own, and there's no link to copy, the founder's call). Plus the sheet
 * behind each of the two.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ME } from '@/data/mock';
import { everyone, groupPeople, nameOf, openGroups, recentPeople } from '@/data/quick';
import { billById } from '@/data/store';
import type { Bill, PersonId } from '@/data/types';
import { listNames } from '@/lib/format';
import { colors, gutter, radius, shadow, stroke } from '@/theme/tokens';

import { InviteQR, inviteCode, inviteLink } from '../group/InviteQR';
import { Icon } from '../Icon';
import { GroupFan, SearchField, StickerRow } from '../ledger/parts';
import { Sheet } from '../Sheet';
import { Txt } from '../Txt';

import { BigButton, Cta, Face, SheetFoot, SheetHead } from './parts';

/** The bill's link. A placeholder until the backend hands out real share links. */
const billLink = (bill: Bill) => inviteLink(inviteCode(bill.id));

export async function shareBill(bill: Bill) {
  try {
    await Share.share({ message: `Tag what you had on ${bill.name}: https://${billLink(bill)}` });
  } catch {
    // The share sheet was closed or isn't available. Nothing to do.
  }
}

const who = (ids: PersonId[]) => listNames(ids.map(nameOf));

export function WhoPopup({
  bill,
  onPeople,
  onGroup,
  onDone,
}: {
  bill: Bill;
  onPeople: () => void;
  onGroup: () => void;
  onDone: () => void;
}) {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  const insets = useSafeAreaInsets();
  const group = bill.groupId ? billById(bill.groupId) : undefined;
  const others = bill.people.filter((p) => p !== ME);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDone} statusBarTranslucent>
      {/* Scrolls when the card is taller than the screen (a small phone, big text). */}
      <ScrollView
        style={styles.veil}
        contentContainerStyle={[
          styles.center,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={ZoomIn.duration(220)}
          style={styles.card}
          accessibilityViewIsModal
          accessibilityLabel="Who’s in?">
          <SheetHead title="Who’s in?" onClose={onDone} />
          <View style={styles.two}>
            <Pressable
              onPress={onPeople}
              accessibilityRole="button"
              accessibilityState={{ selected: others.length > 0 && !group }}
              style={({ pressed }) => [
                styles.tile,
                others.length > 0 && !group && { backgroundColor: colors.go },
                pressed && styles.pressed,
              ]}>
              <Icon name="peoplePlus" size={26} strokeWidth={2.2} color={colors.ink} />
              <Txt variant="rowTitle" style={{ fontSize: 15 }}>
                Add people
              </Txt>
            </Pressable>
            <Pressable
              onPress={onGroup}
              accessibilityRole="button"
              accessibilityState={{ selected: !!group }}
              style={({ pressed }) => [
                styles.tile,
                !!group && { backgroundColor: colors.go },
                pressed && styles.pressed,
              ]}>
              <View style={{ marginLeft: -4, marginTop: -6 }}>
                <GroupFan tones={['owe', 'owe', 'owe']} />
              </View>
              <Txt variant="rowTitle" style={{ fontSize: 15 }}>
                Part of a group
              </Txt>
            </Pressable>
          </View>
          {others.length ? (
            <View style={styles.inRow}>
              <StickerRow ids={bill.people} size={28} />
              <Txt variant="body" numberOfLines={1} style={styles.inText}>
                {group ? <Txt variant="label">{`${group.name} · `}</Txt> : null}
                {who(bill.people)}
              </Txt>
            </View>
          ) : null}
          <View style={styles.or}>
            <View style={styles.orLine} />
            <Txt variant="eyebrow" color={colors.inkHint}>
              OR SHARE IT
            </Txt>
            <View style={styles.orLine} />
          </View>
          <View style={styles.qr}>
            <InviteQR code={inviteCode(bill.id)} size={140} />
          </View>
          <View style={styles.share}>
            <BigButton label="Share link" icon="link" height={48} onPress={() => shareBill(bill)} />
          </View>
          {others.length ? (
            <SheetFoot>
              <Cta label="Done" onPress={onDone} />
            </SheetFoot>
          ) : (
            // Nobody added yet: closing is the least important thing here, so it's quiet text, not
            // a lime button (the founder's call).
            <Pressable
              onPress={onDone}
              hitSlop={10}
              accessibilityRole="button"
              style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}>
              <Txt variant="label" color={colors.inkHint} style={styles.skipText}>
                Skip for now
              </Txt>
            </Pressable>
          )}
        </Animated.View>
      </ScrollView>
    </Modal>
  );
}

/**
 * Add people (everyone you split with, the ones you split with lately first), or Part of a group
 * (pick one; its people come with it, untick anyone who wasn't there). A search bar on top finds
 * people by name (and groups, on Part of a group); whoever is ticked stays ticked while you
 * search. Part of a group starts with Create new group when `onNewGroup` is given (the bill's
 * page passes it: the new group opens with the bill's people and the bill goes in it). Open it
 * with a fresh `key`.
 */
export function WhoSheet({
  open,
  mode,
  bill,
  onDone,
  onClose,
  onNewGroup,
}: {
  open: boolean;
  mode: 'people' | 'group';
  bill: Bill;
  onDone: (groupId: string | undefined, ids: PersonId[]) => void;
  onClose: () => void;
  /** Create new group, with what was typed in the search as its name. */
  onNewGroup?: (name: string) => void;
}) {
  const [gid, setGid] = useState<string | undefined>(bill.groupId);
  const [ppl, setPpl] = useState<PersonId[]>(bill.people);
  const [q, setQ] = useState('');
  const find = q.trim().toLowerCase();
  const hit = (name: string) => !find || name.toLowerCase().includes(find);
  const group = gid ? billById(gid) : undefined;
  const recent = recentPeople(8);
  const members = group ? groupPeople(group).filter((p) => p !== ME) : [];
  const list = (
    group
      ? [...members, ...everyone().filter((p) => !members.includes(p))]
      : [...recent, ...everyone().filter((p) => !recent.includes(p))]
  ).filter((p) => hit(nameOf(p)));
  const groups = openGroups().filter((g) => hit(g.name));

  function pickGroup(id: string) {
    if (gid === id) return setGid(undefined);
    const g = billById(id);
    setGid(id);
    if (g) setPpl(groupPeople(g));
  }
  function toggle(p: PersonId) {
    setPpl(ppl.includes(p) ? ppl.filter((x) => x !== p) : [...ppl, p]);
  }

  const n = ppl.length;
  const can = mode === 'group' ? !!group : n > 1;
  const label =
    mode === 'group'
      ? group
        ? `Done · ${group.name}`
        : 'Pick a group'
      : n > 1
        ? `Done · ${n} people`
        : 'Pick at least one person';

  const groupRows = (
    <>
      <Txt variant="eyebrow" color={colors.inkHint} style={styles.section}>
        GROUPS
      </Txt>
      {onNewGroup ? (
        <Pressable
          onPress={() => onNewGroup(q.trim())}
          accessibilityRole="button"
          accessibilityLabel={find ? `Create a new group called ${q.trim()}` : 'Create new group'}
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
          <View style={styles.newGroup}>
            <Icon name="plus" size={20} strokeWidth={2.6} color={colors.ink} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant="rowTitle" numberOfLines={1} style={{ fontSize: 15.5 }}>
              {find ? `Create “${q.trim()}”` : 'Create new group'}
            </Txt>
            <Txt variant="rowSub" color={colors.inkHint}>
              This bill goes in it
            </Txt>
          </View>
          <Icon name="chevron" size={18} strokeWidth={2.6} color={colors.inkHint} />
        </Pressable>
      ) : null}
      {groups.length || !find || onNewGroup ? null : (
        <Txt variant="label" color={colors.inkHint} style={styles.none}>
          No group called “{q.trim()}”
        </Txt>
      )}
      {groups.map((g, i) => {
        const on = gid === g.id;
        return (
          <Pressable
            key={g.id}
            onPress={() => pickGroup(g.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${g.name}, ${groupPeople(g).length} people`}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
            {i || onNewGroup ? <View style={styles.rule} /> : null}
            <GroupFan tones={['owe', 'owe', 'owe']} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt variant="rowTitle" numberOfLines={1} style={{ fontSize: 15.5 }}>
                {g.name}
              </Txt>
              <Txt variant="rowSub" color={colors.inkHint}>
                {groupPeople(g).length} people
              </Txt>
            </View>
            <View style={[styles.box, styles.round, on && { backgroundColor: colors.ticked }]}>
              {on ? <Icon name="check" size={14} strokeWidth={3.2} color={colors.ink} /> : null}
            </View>
          </Pressable>
        );
      })}
    </>
  );
  const peopleRows = (
    <>
      <Txt variant="eyebrow" color={colors.inkHint} style={styles.section}>
        {group ? 'WHO’S IN IT' : find ? 'PEOPLE' : 'RECENT'}
      </Txt>
      {list.length || !find ? null : (
        <Txt variant="label" color={colors.inkHint} style={styles.none}>
          Nobody called “{q.trim()}”
        </Txt>
      )}
      {list.map((p, i) => {
        const on = ppl.includes(p);
        return (
          <Pressable
            key={p}
            onPress={() => toggle(p)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={nameOf(p)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
            {i ? <View style={styles.rule} /> : null}
            <Face id={p} size={40} />
            <Txt variant="rowTitle" numberOfLines={1} style={{ flex: 1, fontSize: 15.5 }}>
              {nameOf(p)}
            </Txt>
            <View style={[styles.box, on && { backgroundColor: colors.ticked }]}>
              {on ? <Icon name="check" size={14} strokeWidth={3.2} color={colors.ink} /> : null}
            </View>
          </Pressable>
        );
      })}
    </>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={mode === 'group' ? 'Part of a group' : 'Add people'}
      tall>
      <SheetHead title={mode === 'group' ? 'Part of a group' : 'Add people'} onClose={onClose} />
      <SearchField
        value={q}
        onChange={setQ}
        placeholder={mode === 'group' ? 'Search groups and people' : 'Search people'}
      />
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {mode === 'group' ? (
          <>
            {groupRows}
            {group ? peopleRows : null}
          </>
        ) : (
          peopleRows
        )}
      </ScrollView>
      <SheetFoot>
        <Cta
          label={label}
          kind={can ? 'lime' : 'grey'}
          onPress={() => (can ? onDone(group?.id, ppl) : undefined)}
        />
      </SheetFoot>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  skip: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, marginTop: 6 },
  skipText: { fontSize: 14, textDecorationLine: 'underline' },
  veil: { flex: 1, backgroundColor: colors.veil },
  center: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: gutter },
  card: {
    backgroundColor: colors.paper,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 24,
    boxShadow: `5px 5px 0px ${colors.shade}`,
    paddingTop: 10,
    paddingBottom: 16,
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: 'none' },
  two: { flexDirection: 'row', gap: 10, paddingHorizontal: gutter, paddingTop: 6 },
  tile: {
    flex: 1,
    height: 104,
    padding: 14,
    justifyContent: 'space-between',
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.m,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  inRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginHorizontal: gutter,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.highlightSoft,
  },
  inText: { flex: 1, fontSize: 13.5, lineHeight: 18 },
  or: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
    marginHorizontal: gutter,
  },
  orLine: { flex: 1, height: 1.5, backgroundColor: colors.chipEdge },
  qr: { alignSelf: 'center', borderRadius: 16, boxShadow: `3px 3px 0px ${colors.highlight}` },
  share: { flexDirection: 'row', marginTop: 10, marginHorizontal: gutter, marginBottom: 4 },
  section: { paddingTop: 16, paddingBottom: 4, paddingHorizontal: 18 },
  none: { paddingHorizontal: 18, paddingVertical: 12, fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  rule: {
    position: 'absolute',
    top: 0,
    left: 70,
    right: 0,
    height: 1,
    backgroundColor: colors.hairline,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  round: { borderRadius: 13 },
  newGroup: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
