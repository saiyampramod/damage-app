import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleButton } from '@/components/CircleButton';
import { DashedLine } from '@/components/DashedLine';
import { DottedBackground } from '@/components/DottedBackground';
import { GroupReady } from '@/components/group/GroupReady';
import { inviteCode } from '@/components/group/InviteQR';
import { Pile } from '@/components/group/Pile';
import { Icon } from '@/components/Icon';
import { showToast } from '@/components/Toast';
import { CheckBox, Cta, ListLabel, OptionRow, PersonSticker, SearchField } from '@/components/quick/parts';
import { Txt } from '@/components/Txt';
import { everyone, nameOf, recentPeople } from '@/data/quick';
import { ME, people } from '@/data/mock';
import { addGroup, billById, nextGroupTint, setWho } from '@/data/store';
import type { GroupKind, PersonId } from '@/data/types';
import { colors, fonts, groupColors, gutter, radius, shadow, stroke } from '@/theme/tokens';

const MAX_NAME = 40;

const KINDS: [GroupKind, string, string][] = [
  ['trip', 'Trip', 'A few days away'],
  ['outing', 'Outing', 'One night out'],
  ['monthly', 'Monthly', 'Flat, office'],
];

/**
 * Create new group. The name sits at the top, then Trip / Outing / Monthly and the group's colour
 * (the next free one is picked; it colours the group's pass everywhere), then the people: search,
 * a small pile of who's in (tap a sticker to take them out), recent and everyone A–Z.
 * Adding people is optional. After Create, a pop-up shows the QR and Share link to invite anyone.
 *
 * `?bill=id` (Create new group on a bill's Part of a group): the bill's people are already picked,
 * `?name=` fills in the name, Create puts the bill in the new group, and Done goes back to the
 * bill instead of opening the group.
 */
export default function NewGroupScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bill?: string; name?: string }>();
  const forBill = params.bill ? billById(params.bill) : undefined;
  const [name, setName] = useState(() => (params.name ?? '').slice(0, MAX_NAME));
  const [err, setErr] = useState(false);
  const [focus, setFocus] = useState(false);
  const [picked, setPicked] = useState<PersonId[]>(() =>
    forBill ? forBill.people.filter((p) => p !== ME && !people[p]?.guest) : [],
  );
  const [kind, setKind] = useState<GroupKind>('outing');
  // The group's colour: the next free one, which you can change.
  const [tint, setTint] = useState(nextGroupTint);
  const [q, setQ] = useState('');
  const [made, setMade] = useState<{
    id: string;
    name: string;
    people: PersonId[];
    code: string;
    /** The bill went into it (false: someone on the bill joined from its link, so it can't). */
    moved?: boolean;
  } | null>(null);
  const nameRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const searchRef = useRef<TextInput>(null);
  const pileRef = useRef<ScrollView>(null);

  const has = (id: PersonId) => picked.includes(id);
  const toggle = (id: PersonId) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function create() {
    const clean = name.trim();
    if (!clean) {
      setErr(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      nameRef.current?.focus();
      return;
    }
    nameRef.current?.blur();
    const id = addGroup(clean, kind, picked, tint);
    const moved = forBill ? setWho(forBill, id, forBill.people) : undefined;
    setMade({ id, name: clean, people: picked, code: inviteCode(id), moved });
  }

  const n = picked.length;
  const query = q.trim().toLowerCase();

  const personRow = (id: PersonId) => (
    <OptionRow key={id} onPress={() => toggle(id)} role="checkbox" checked={has(id)} label={nameOf(id)}>
      <PersonSticker id={id} size={38} picked={has(id)} />
      <Txt variant="lead" numberOfLines={1} style={{ flex: 1, fontFamily: has(id) ? fonts.bodyHeavy : fonts.bodyBold }}>
        {nameOf(id)}
      </Txt>
      <CheckBox on={has(id)} />
    </OptionRow>
  );

  let list;
  if (query) {
    const hits = everyone().filter((id) => nameOf(id).toLowerCase().includes(query));
    list = hits.length ? (
      <>
        <ListLabel title="People" right={`${hits.length}`} />
        {hits.map(personRow)}
      </>
    ) : (
      <View style={styles.empty}>
        <Txt variant="label">No one called “{q.trim()}” on Damage</Txt>
        <Txt variant="small" style={{ textAlign: 'center', fontSize: 13, lineHeight: 18 }}>
          Create the group, then send them the QR or link. Or add them as a friend by their code.
        </Txt>
        <Pressable
          onPress={() => router.push({ pathname: '/friends', params: { add: '1' } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.addAll, { marginTop: 6 }, pressed && { opacity: 0.8 }]}>
          <Txt variant="label" style={{ fontSize: 13 }}>
            Add a friend by code
          </Txt>
        </Pressable>
      </View>
    );
  } else {
    const recent = recentPeople(5);
    let last = '';
    list = (
      <>
        <ListLabel title="Recent" />
        {recent.map(personRow)}
        <ListLabel title="Everyone" right="A–Z" />
        {everyone()
          .filter((id) => !recent.includes(id))
          .map((id) => {
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
                {personRow(id)}
              </View>
            );
          })}
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <DottedBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.head, { paddingTop: insets.top + 6 }]}>
          <CircleButton size={44} accessibilityLabel="Close" onPress={() => router.back()}>
            <Icon name="close" size={22} color={colors.ink} />
          </CircleButton>
          <Txt variant="title" accessibilityRole="header">
            New group
          </Txt>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {forBill ? (
            <View style={styles.forBill}>
              <Icon name="bills" size={16} strokeWidth={2.4} color={colors.inkSoft} />
              <Txt variant="label" color={colors.inkSoft} numberOfLines={1} style={{ flex: 1 }}>
                {forBill.name} goes in this group
              </Txt>
            </View>
          ) : null}
          <View style={[styles.card, err && styles.cardErr]}>
            <View style={styles.cardPaper} pointerEvents="none">
              <DottedBackground spacing={14} fill={colors.brand} />
            </View>
            <View style={styles.kick}>
              <Txt variant="micro" nativeID="groupNameLabel" style={styles.kickText}>
                Group name
              </Txt>
              <Txt variant="micro">
                {name.length}/{MAX_NAME}
              </Txt>
            </View>
            {/* Wrapped so it stays above the dotted paper (web paints positioned views on top). */}
            <View>
              <TextInput
                ref={nameRef}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (err && t.trim()) setErr(false);
                }}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                placeholder="Type a name"
                placeholderTextColor={colors.inkHint}
                maxLength={MAX_NAME}
                autoCapitalize="words"
                returnKeyType="done"
                accessibilityLabelledBy="groupNameLabel"
                accessibilityLabel="Group name"
                accessibilityHint={err ? 'Type a name to create the group' : 'Shown to everyone you add'}
                style={[styles.nameInput, (focus || err) && styles.nameInputOn]}
              />
            </View>
            <View style={styles.help}>
              {err ? <Icon name="close" size={14} strokeWidth={3} color={colors.ink} /> : null}
              <Txt
                variant="small"
                style={{ fontFamily: err ? fonts.bodyHeavy : fonts.bodyBold }}
                accessibilityLiveRegion="polite">
                {err ? 'Type a name to create the group' : 'Shown to everyone you add'}
              </Txt>
            </View>
            <DashedLine style={styles.cut} />
            {/* Everyone you've added, then "+". One row: swipe it sideways when it's longer than the card. */}
            <ScrollView
              ref={pileRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.pileScroll}
              onContentSizeChange={() => pileRef.current?.scrollToEnd({ animated: true })}>
              <Pile ids={picked} onRemove={toggle} meFill={colors.paper} size={32} />
              <Pressable
                onPress={() => searchRef.current?.focus()}
                accessibilityRole="button"
                accessibilityLabel="Add people"
                hitSlop={6}
                style={({ pressed }) => [styles.addSlot, pressed && { transform: [{ scale: 0.9 }] }]}>
                <Icon name="plus" size={16} strokeWidth={3} color={colors.ink} />
              </Pressable>
            </ScrollView>
          </View>

          <View style={styles.kinds} accessibilityRole="radiogroup" accessibilityLabel="What kind of group">
            {KINDS.map(([k, label, sub]) => {
              const on = kind === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${label}, ${sub}`}
                  style={({ pressed }) => [styles.kind, on && styles.kindOn, pressed && { opacity: 0.85 }]}>
                  <Txt variant="label" style={{ fontSize: 14 }}>
                    {label}
                  </Txt>
                  <Txt variant="micro" color={on ? colors.ink : colors.inkHint} style={{ fontSize: 11.5 }}>
                    {sub}
                  </Txt>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.tints} accessibilityRole="radiogroup" accessibilityLabel="Group colour">
            <Txt variant="label" style={{ fontSize: 14, marginRight: 4 }}>
              Colour
            </Txt>
            {groupColors.map((c, i) => {
              const on = tint === i;
              return (
                <Pressable
                  key={c}
                  onPress={() => setTint(i)}
                  hitSlop={4}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`Colour ${i + 1} of ${groupColors.length}`}
                  style={({ pressed }) => [
                    styles.tint,
                    { backgroundColor: c },
                    on && styles.tintOn,
                    pressed && { transform: [{ scale: 0.9 }] },
                  ]}>
                  {on ? <Icon name="check" size={14} strokeWidth={3.2} color={colors.ink} /> : null}
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 16 }}>
            <SearchField value={q} onChangeText={setQ} placeholder="Search people on Damage" inputRef={searchRef} />
          </View>

          {list}
        </ScrollView>

        <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
          <View style={styles.note}>
            <Icon name="qr" size={16} strokeWidth={2.2} color={colors.inkSoft} />
            <Txt variant="small" color={colors.inkSoft} style={{ flex: 1, fontSize: 13, lineHeight: 18 }}>
              Friends not on Damage? You’ll get a QR and a link to invite them next.
            </Txt>
          </View>
          <Cta label={n ? `Create group · ${n + 1} people` : 'Create group · just you'} onPress={create} />
        </View>
      </KeyboardAvoidingView>

      {made ? (
        <GroupReady
          name={made.name}
          people={made.people}
          code={made.code}
          onDone={() => {
            const { id, name: made_name, moved } = made;
            setMade(null);
            if (forBill) {
              showToast(
                moved
                  ? `${forBill.name} is in ${made_name}`
                  : 'Someone joined from the link, so this bill stays out of groups',
              );
              router.back();
            } else router.replace({ pathname: '/bill/[id]', params: { id } });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  forBill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingHorizontal: 4 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingBottom: 6,
  },
  body: { paddingHorizontal: gutter, paddingTop: 10, paddingBottom: 20 },
  kinds: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tints: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  tint: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: stroke.s,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tintOn: { borderWidth: stroke.l, boxShadow: shadow.xs },
  kind: {
    flex: 1,
    minHeight: 54,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    gap: 1,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
  },
  kindOn: { backgroundColor: colors.highlight, boxShadow: shadow.s },
  card: {
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 22,
    boxShadow: shadow.m,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  cardErr: { borderWidth: stroke.l },
  cardPaper: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 20, overflow: 'hidden' },
  kick: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  kickText: { textTransform: 'uppercase', letterSpacing: 0.8 },
  nameInput: {
    height: 50,
    marginTop: 6,
    paddingHorizontal: 12,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
  },
  nameInputOn: { boxShadow: `3px 3px 0px ${colors.shade}, 0px 0px 0px 2px ${colors.line}` },
  help: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 2 },
  cut: { marginTop: 10, marginHorizontal: -12 },
  pileScroll: { alignItems: 'center', gap: 8, minHeight: 50, paddingTop: 8, paddingBottom: 6, paddingRight: 6 },
  addSlot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAll: {
    height: 36,
    paddingHorizontal: 14,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { marginTop: 12, color: colors.inkSoft, fontSize: 13 },
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
  foot: {
    paddingHorizontal: gutter,
    paddingTop: 10,
    backgroundColor: colors.paper,
    borderTopWidth: stroke.m,
    borderColor: colors.line,
  },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
});
