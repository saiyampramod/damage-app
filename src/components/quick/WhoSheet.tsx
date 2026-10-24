/**
 * Split with, for the Quick bill pop-up: the group's people (untick anyone who isn't in this one),
 * other groups, then friends. Search covers groups and friends.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ME } from '@/data/mock';
import { everyone, groupPeople, nameOf, openGroups, recentPeople } from '@/data/quick';
import type { Bill, PersonId } from '@/data/types';
import { colors, fonts, gutter, radius, stroke } from '@/theme/tokens';

import { Icon } from '../Icon';
import { Sheet } from '../Sheet';
import { Txt } from '../Txt';
import {
  CheckBox,
  Cta,
  ListLabel,
  OptionRow,
  PersonSticker,
  PickerHead,
  Rule,
  SearchField,
} from './parts';

type Props = {
  open: boolean;
  group: Bill | undefined;
  /** Friends, when it isn't a group. */
  people: PersonId[];
  /** People added to the group from here (they join it). */
  extra: PersonId[];
  /** Left out of this bill. */
  out: PersonId[];
  onGroup: (id: string) => void;
  onToggleOut: (id: PersonId) => void;
  /** In a group, adds them to it; otherwise ticks them as a friend. */
  onToggleFriend: (id: PersonId) => void;
  onFriendsInstead: () => void;
  onClose: () => void;
};

export function WhoSheet({
  open,
  group,
  people,
  extra,
  out,
  onGroup,
  onToggleOut,
  onToggleFriend,
  onFriendsInstead,
  onClose,
}: Props) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const members = group ? groupPeople(group).filter((id) => id !== ME) : [];
  const listed = group ? [...members, ...extra] : people;
  const inCount = 1 + listed.filter((id) => !out.includes(id)).length;
  const groups = openGroups().filter(
    (g) => g.id !== group?.id && (!query || g.name.toLowerCase().includes(query)),
  );
  const pool = everyone().filter(
    (id) => !members.includes(id) && (!query || nameOf(id).toLowerCase().includes(query)),
  );
  const recent = query ? [] : recentPeople(5).filter((id) => pool.includes(id));
  const has = (id: PersonId) => (group ? extra.includes(id) : people.includes(id));

  function close() {
    setQ('');
    onClose();
  }

  const friendRow = (id: PersonId) => (
    <OptionRow
      key={id}
      onPress={() => onToggleFriend(id)}
      role="checkbox"
      checked={has(id)}
      label={nameOf(id)}>
      <PersonSticker id={id} size={34} picked={has(id)} />
      <Txt
        variant="lead"
        numberOfLines={1}
        style={{ flex: 1, fontFamily: has(id) ? fonts.bodyHeavy : fonts.bodyBold }}>
        {nameOf(id)}
      </Txt>
      <CheckBox on={has(id)} />
    </OptionRow>
  );

  return (
    <Sheet open={open} onClose={close} label="Split with" tall grab={false}>
      <View style={{ paddingTop: 14 }}>
        <PickerHead title="Split with" onClose={close} />
        <View style={{ paddingHorizontal: gutter, paddingBottom: 4 }}>
          <SearchField value={q} onChangeText={setQ} placeholder="A group or a friend" />
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {group && !query ? (
          <>
            <ListLabel title={`In ${group.name}`} right="Tap to leave out" />
            <View accessible accessibilityLabel="You, in">
              <View style={styles.row}>
                <PersonSticker id={ME} size={34} />
                <Txt variant="lead" style={{ flex: 1, fontFamily: fonts.bodyHeavy }}>
                  You
                </Txt>
                <CheckBox on />
              </View>
              <Rule />
            </View>
            {listed.map((id) => {
              const on = !out.includes(id);
              return (
                <OptionRow
                  key={id}
                  onPress={() => onToggleOut(id)}
                  role="checkbox"
                  checked={on}
                  label={nameOf(id)}>
                  <View style={{ opacity: on ? 1 : 0.4 }}>
                    <PersonSticker id={id} size={34} />
                  </View>
                  <Txt
                    variant="lead"
                    numberOfLines={1}
                    color={on ? colors.ink : colors.inkSoft}
                    style={{ flex: 1 }}>
                    {nameOf(id)}
                  </Txt>
                  <CheckBox on={on} />
                </OptionRow>
              );
            })}
            <Pressable onPress={onFriendsInstead} accessibilityRole="button" style={styles.link}>
              <Icon name="people" size={18} color={colors.ink} />
              <Txt variant="label" style={{ textDecorationLine: 'underline', fontSize: 15 }}>
                Friends instead, no group
              </Txt>
            </Pressable>
          </>
        ) : null}

        {groups.length ? (
          <>
            <ListLabel title={group ? 'Other groups' : 'Groups'} />
            {(query ? groups : groups.slice(0, 3)).map((g) => {
              const n = groupPeople(g).length;
              return (
                <OptionRow
                  key={g.id}
                  onPress={() => onGroup(g.id)}
                  label={`${g.name}, ${n} people`}>
                  <View style={styles.box}>
                    <Icon name="flag" size={18} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt variant="lead" numberOfLines={1} style={{ fontFamily: fonts.bodyHeavy }}>
                      {g.name}
                    </Txt>
                    <Txt variant="small">{n} people</Txt>
                  </View>
                  <Icon name="chevron" size={20} strokeWidth={2.8} color={colors.ink} />
                </OptionRow>
              );
            })}
          </>
        ) : null}

        {pool.length ? (
          <>
            <ListLabel title={group ? `Add to ${group.name}` : 'Friends'} />
            {recent.map(friendRow)}
            {pool.filter((id) => !recent.includes(id)).map(friendRow)}
          </>
        ) : null}

        {query && !groups.length && !pool.length ? (
          <View style={styles.empty}>
            <Txt variant="label">No one called “{q.trim()}” on Damage</Txt>
            <Txt variant="small" style={{ textAlign: 'center' }}>
              Add the bill, then send them its link.
            </Txt>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.foot}>
        <Cta label={inCount > 1 ? `Done · ${inCount} people` : 'Done'} onPress={close} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: gutter, paddingBottom: 16 },
  foot: {
    borderTopWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: gutter,
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
  },
  box: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: 18,
    borderRadius: radius.m,
    backgroundColor: colors.pressed,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
});
