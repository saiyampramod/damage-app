/** The sheets that open from the Quick bill sheet: who's in, who paid, part of a group, what for. */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ME } from '@/data/mock';
import {
  CATEGORIES,
  everyone,
  groupById,
  groupPeople,
  nameOf,
  openGroups,
  recentPeople,
  type CategoryId,
} from '@/data/quick';
import type { PersonId } from '@/data/types';
import { colors, gutter, radius, shadow, stroke, type } from '@/theme/tokens';

import { Icon } from '../Icon';
import { Sheet } from '../Sheet';
import { Txt } from '../Txt';
import { eachLine, payerName, type Draft } from './draft';
import {
  CheckBox,
  Cta,
  Disc,
  ListLabel,
  OptionRow,
  PersonSticker,
  PickerHead,
  Radio,
  SearchField,
} from './parts';

/* ---------- Who's in? ---------- */

type PeopleProps = {
  open: boolean;
  draft: Draft;
  onToggle: (id: PersonId) => void;
  /** In a group: everyone in it, or only you. */
  onAll: (all: boolean) => void;
  onLeaveGroup: () => void;
  onPayer: () => void;
  onClose: () => void;
};

export function PeoplePicker({
  open,
  draft,
  onToggle,
  onAll,
  onLeaveGroup,
  onPayer,
  onClose,
}: PeopleProps) {
  const [q, setQ] = useState('');
  const [err, setErr] = useState(false);
  const group = groupById(draft.group);
  const has = (id: PersonId) => draft.people.includes(id);
  const query = q.trim().toLowerCase();

  function close() {
    setQ('');
    setErr(false);
    onClose();
  }
  function done() {
    if (draft.people.length < 2) return setErr(true);
    close();
  }
  function toggle(id: PersonId) {
    setErr(false);
    onToggle(id);
  }

  const row = (id: PersonId) => (
    <OptionRow
      key={id}
      onPress={() => toggle(id)}
      role="checkbox"
      checked={has(id)}
      label={nameOf(id)}>
      <PersonSticker id={id} size={32} />
      <Txt variant="lead" style={{ flex: 1 }} numberOfLines={1}>
        {nameOf(id)}
      </Txt>
      <CheckBox on={has(id)} />
    </OptionRow>
  );

  let body;
  if (group) {
    const ids = groupPeople(group).filter(
      (id) => !query || nameOf(id).toLowerCase().includes(query),
    );
    const all = groupPeople(group).every(has);
    body = (
      <>
        <ListLabel
          title={`In ${group.name}`}
          right={all ? 'Only me' : 'Everyone'}
          onRight={() => onAll(!all)}
        />
        {ids.map(row)}
        <Pressable onPress={onLeaveGroup} accessibilityRole="button" style={styles.link}>
          <Icon name="flag" size={18} color={colors.ink} />
          <Txt variant="label" style={styles.underline}>
            Make it its own bill instead
          </Txt>
        </Pressable>
      </>
    );
  } else if (query) {
    const hits = [ME, ...everyone()].filter((id) => nameOf(id).toLowerCase().includes(query));
    body = hits.length ? (
      <>
        <ListLabel title="People" right={`${hits.length}`} />
        {hits.map(row)}
      </>
    ) : (
      <View style={styles.empty}>
        <Txt variant="label">No one called “{q.trim()}” on Damage</Txt>
        <Txt variant="small" style={{ textAlign: 'center' }}>
          Add the bill, then send them its link. They can pay their share without the app.
        </Txt>
      </View>
    );
  } else {
    const recent = recentPeople(5);
    const rest = everyone().filter((id) => !recent.includes(id));
    let last = '';
    body = (
      <>
        <ListLabel title="People" right={`${draft.people.length} picked`} />
        {row(ME)}
        <Txt variant="small" style={styles.letter}>
          Recent
        </Txt>
        {recent.map(row)}
        {rest.map((id) => {
          const L = nameOf(id).charAt(0).toUpperCase();
          const head = L !== last;
          last = L;
          return (
            <View key={id}>
              {head ? (
                <Txt variant="small" style={styles.letter}>
                  {L}
                </Txt>
              ) : null}
              {row(id)}
            </View>
          );
        })}
      </>
    );
  }

  const count = draft.people.length;
  return (
    <Sheet open={open} onClose={close} label="Who’s in?" tall grab={false}>
      <View style={{ paddingTop: 14 }}>
        <PickerHead title="Who’s in?" onClose={close} />
        <View style={{ paddingHorizontal: gutter }}>
          <SearchField value={q} onChangeText={setQ} placeholder="Search people" />
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled">
        {body}
      </ScrollView>
      <View style={styles.foot}>
        <View style={styles.footRow}>
          <Pressable
            onPress={onPayer}
            accessibilityRole="button"
            accessibilityLabel={`${payerName(draft)} paid. Change who paid`}
            style={({ pressed }) => [styles.payer, pressed && styles.pressed]}>
            <Txt variant="label">{payerName(draft)} paid</Txt>
            <Icon name="down" size={16} color={colors.ink} />
          </Pressable>
          <Txt variant="label" style={{ flex: 1, textAlign: 'right' }}>
            {eachLine(draft, true) || (count < 2 ? 'Pick at least 2' : '')}
          </Txt>
        </View>
        {err ? (
          <Txt variant="label" style={{ marginBottom: 8 }} accessibilityLiveRegion="polite">
            Pick at least one more person
          </Txt>
        ) : null}
        <Cta label={count < 2 ? 'Done' : `Done · ${count} people`} onPress={done} />
      </View>
    </Sheet>
  );
}

/* ---------- Who paid? ---------- */

export function PayerPicker({
  open,
  draft,
  onPick,
  onClose,
}: {
  open: boolean;
  draft: Draft;
  onPick: (id: PersonId) => void;
  onClose: () => void;
}) {
  const ids = draft.people.length > 1 ? draft.people : [ME];
  return (
    <Sheet open={open} onClose={onClose} label="Who paid?">
      <View style={{ paddingHorizontal: gutter }}>
        <Txt variant="title" accessibilityRole="header" style={{ marginBottom: 6 }}>
          Who paid?
        </Txt>
        {ids.map((id) => (
          <OptionRow
            key={id}
            onPress={() => onPick(id)}
            role="radio"
            checked={draft.payer === id}
            label={nameOf(id)}>
            <PersonSticker id={id} size={32} />
            <Txt variant="lead" style={{ flex: 1 }}>
              {nameOf(id)}
            </Txt>
            <Radio on={draft.payer === id} />
          </OptionRow>
        ))}
        {draft.people.length < 2 ? (
          <Txt variant="body" style={{ marginTop: 10 }}>
            Pick who’s in first to choose someone else.
          </Txt>
        ) : null}
      </View>
    </Sheet>
  );
}

/* ---------- Part of a group? ---------- */

export function GroupPicker({
  open,
  current,
  onPick,
  onClose,
}: {
  open: boolean;
  current: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const groups = openGroups().filter((g) => !query || g.name.toLowerCase().includes(query));

  function close() {
    setQ('');
    onClose();
  }
  function pick(id: string | null) {
    setQ('');
    onPick(id);
  }

  return (
    <Sheet open={open} onClose={close} label="Part of a group?" tall grab={false}>
      <View style={{ paddingTop: 14 }}>
        <PickerHead title="Part of a group?" onClose={close} />
        <View style={{ paddingHorizontal: gutter }}>
          <SearchField value={q} onChangeText={setQ} placeholder="Search your groups" />
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled">
        {!query ? (
          <View style={{ marginTop: 10 }}>
            <OptionRow
              onPress={() => pick(null)}
              role="radio"
              checked={!current}
              label="On its own. Its own bill, settled by itself">
              <Disc icon="bills" size={38} />
              <View style={{ flex: 1 }}>
                <Txt variant="lead">On its own</Txt>
                <Txt variant="small">Its own bill, settled by itself</Txt>
              </View>
              <Radio on={!current} />
            </OptionRow>
          </View>
        ) : null}
        {groups.length ? (
          <>
            <ListLabel title="Your groups" right={query ? `${groups.length}` : undefined} />
            {groups.map((g) => {
              const n = groupPeople(g).length;
              const sub = `${n} people · ${g.billCount ?? 0} ${g.billCount === 1 ? 'bill' : 'bills'}`;
              return (
                <OptionRow
                  key={g.id}
                  onPress={() => pick(g.id)}
                  role="radio"
                  checked={current === g.id}
                  label={`${g.name}, ${sub}`}>
                  <View style={styles.gbox}>
                    <Icon name="flag" size={18} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="lead" numberOfLines={1}>
                      {g.name}
                    </Txt>
                    <Txt variant="small">{sub}</Txt>
                  </View>
                  <Radio on={current === g.id} />
                </OptionRow>
              );
            })}
          </>
        ) : (
          <View style={styles.empty}>
            <Txt variant="label">No group called “{q.trim()}”</Txt>
          </View>
        )}
      </ScrollView>
      <View style={styles.foot}>
        <Txt variant="small" style={{ fontSize: 13, lineHeight: 18, marginBottom: 10 }}>
          A group adds its bills into one set of payments. Picking one fills in its people.
        </Txt>
        <Cta label="Done" onPress={close} />
      </View>
    </Sheet>
  );
}

/* ---------- What for? ---------- */

export function CategoryPicker({
  open,
  draft,
  withName = true,
  onName,
  onCat,
  onClose,
}: {
  open: boolean;
  draft: Draft;
  /** Show the name box. The Quick bill pop-up has its own name on top, so it leaves this out. */
  withName?: boolean;
  onName: (name: string) => void;
  onCat: (id: CategoryId) => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="What for?">
      <View style={{ paddingHorizontal: gutter }}>
        <Txt variant="title" accessibilityRole="header" style={{ marginBottom: 10 }}>
          What for?
        </Txt>
        {withName ? (
          <TextInput
            value={draft.name}
            onChangeText={onName}
            placeholder="Cab to the airport"
            placeholderTextColor={colors.inkHint}
            accessibilityLabel="Name"
            maxLength={40}
            style={styles.nameBox}
          />
        ) : null}
        <View style={styles.grid}>
          {CATEGORIES.map((c) => {
            const on = draft.cat === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => onCat(c.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={c.label}
                style={({ pressed }) => [
                  styles.tile,
                  on && { backgroundColor: colors.highlight },
                  pressed && styles.pressed,
                ]}>
                <Icon name={c.icon} size={24} color={colors.ink} />
                <Txt variant="small" style={{ fontSize: 13 }} numberOfLines={1}>
                  {c.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        <Cta label="Done" onPress={onClose} style={{ marginTop: 14 }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: gutter, paddingBottom: 16 },
  foot: {
    borderTopWidth: stroke.m,
    borderColor: colors.line,
    paddingHorizontal: gutter,
    paddingTop: 10,
  },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  payer: {
    height: 44,
    paddingHorizontal: 12,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    boxShadow: `2px 2px 0px ${colors.shade}`,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 44,
    paddingLeft: 12,
    paddingRight: 14,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    boxShadow: `2px 2px 0px ${colors.shade}`,
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], boxShadow: 'none' },
  letter: { marginTop: 12, color: colors.inkSoft, fontSize: 13 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48 },
  underline: { textDecorationLine: 'underline', fontSize: 15 },
  empty: {
    marginTop: 18,
    borderWidth: stroke.m,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: radius.m,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  gbox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBox: {
    height: 48,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    ...type.lead,
    fontFamily: type.label.fontFamily,
    color: colors.ink,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '31.5%',
    flexGrow: 1,
    height: 62,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: radius.m,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    boxShadow: shadow.s,
  },
});
