/**
 * Profile: your name, your friend code (Copy, Share my link, My QR), your UPI ID so friends' Pay
 * buttons reach you, Friends and Activity, your recurring bills, and which notifications you get.
 * Signing in and out comes with the backend.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Label } from '@/components/ledger/parts';
import { Face, Frame, KeyButton } from '@/components/receipt/parts';
import { LinkRow, ListCard, MyCode, MyQr, Toggle } from '@/components/social/parts';
import { showToast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import { needsOk } from '@/data/activity';
import { ME, people } from '@/data/mock';
import { dueText, nextDue, recurringList } from '@/data/recurring';
import { friends, requestsIn } from '@/data/social';
import { notify, useStore } from '@/data/store';
import { inr } from '@/lib/format';
import { colors, fonts, gutter, radius, shadow, stroke, type as typeScale } from '@/theme/tokens';

const UPI = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

type Note = 'nudges' | 'payments' | 'added' | 'friends' | 'roast';
const NOTES: [Note, string, string][] = [
  ['nudges', 'Nudges', 'When someone reminds you to pay'],
  ['payments', 'Payments', 'When someone pays you or says they have'],
  ['added', 'Added to a bill', 'When someone puts you on a bill or a group'],
  ['friends', 'Friend requests', 'When someone wants to add you'],
  ['roast', 'The monthly roast', 'Your month in numbers, on the 1st'],
];
// Kept while the app is open (the backend will keep them for good).
const noteState: Record<Note, boolean> = {
  nudges: true,
  payments: true,
  added: true,
  friends: true,
  roast: false,
};

export default function ProfileScreen() {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const me = people[ME];
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(me.name);
  const [upi, setUpi] = useState(me.upi ?? '');
  const [upiErr, setUpiErr] = useState(false);
  const [qr, setQr] = useState(false);
  const [, redraw] = useState(0);

  const upiChanged = upi.trim() !== (me.upi ?? '');
  const reqs = requestsIn().length;
  const ok = needsOk();
  const rec = recurringList();

  function saveName() {
    const clean = name.trim();
    if (!clean) {
      setName(me.name);
      setEditing(false);
      return;
    }
    me.name = clean;
    me.letter = clean.charAt(0).toUpperCase();
    setEditing(false);
    notify();
    showToast('Name saved');
  }

  function saveUpi() {
    const clean = upi.trim();
    if (clean && !UPI.test(clean)) {
      setUpiErr(true);
      return;
    }
    me.upi = clean || undefined;
    setUpiErr(false);
    notify();
    showToast(clean ? 'UPI ID saved' : 'UPI ID removed');
  }

  return (
    <Frame title="Profile" overlay={<MyQr open={qr} onClose={() => setQr(false)} />}>
      <View style={styles.me}>
        <Face id={ME} size={72} />
        {editing ? (
          <View style={styles.nameEdit}>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={30}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={saveName}
              accessibilityLabel="Your name"
              style={styles.nameInput}
            />
            <KeyButton label="Save" on onPress={saveName} accessibilityLabel="Save your name" />
          </View>
        ) : (
          <Pressable
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel={`${me.name}. Change your name`}
            style={styles.nameRow}>
            <Txt style={styles.name} numberOfLines={1}>
              {me.name}
            </Txt>
            <Icon name="pen" size={18} color={colors.ink} />
          </Pressable>
        )}
        <Txt variant="rowSub" color={colors.inkHint}>
          This is what friends see on bills and requests.
        </Txt>
      </View>

      <MyCode onQr={() => setQr(true)} />

      <Label text="Getting paid" />
      <View style={styles.upiCard}>
        <Txt variant="label" nativeID="upiLabel">
          Your UPI ID
        </Txt>
        <View style={[styles.upiBox, upiErr && styles.upiBoxErr]}>
          <TextInput
            value={upi}
            onChangeText={(t) => {
              setUpi(t);
              if (upiErr) setUpiErr(false);
            }}
            onBlur={() => setUpiErr(!!upi.trim() && !UPI.test(upi.trim()))}
            placeholder="yourname@okhdfcbank"
            placeholderTextColor={colors.inkHint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            accessibilityLabelledBy="upiLabel"
            accessibilityLabel="Your UPI ID"
            style={styles.upiInput}
          />
          {upiChanged ? <KeyButton label="Save" on onPress={saveUpi} accessibilityLabel="Save your UPI ID" /> : null}
        </View>
        <Txt
          variant="rowSub"
          color={upiErr ? colors.outText : colors.inkHint}
          accessibilityLiveRegion="polite"
          style={{ marginTop: 8 }}>
          {upiErr
            ? 'That doesn’t look like a UPI ID. It’s a name, @, then your bank, like riya@okicici.'
            : 'Friends’ Pay buttons and your nudges use it, so money comes straight to you.'}
        </Txt>
      </View>

      <Label text="You and your friends" />
      <ListCard>
        <LinkRow
          first
          icon="people"
          title="Friends"
          sub={`${friends().length} friends${reqs ? ` · ${reqs} ${reqs === 1 ? 'request' : 'requests'}` : ''}`}
          onPress={() => router.push('/friends')}
        />
        <LinkRow
          icon="peoplePlus"
          title="Add a friend"
          sub="By their code, or share yours"
          onPress={() => router.push({ pathname: '/friends', params: { add: '1' } })}
        />
        <LinkRow
          icon="bell"
          title="Activity"
          sub={ok ? `${ok} need your OK` : 'All caught up'}
          onPress={() => router.push('/activity')}
        />
      </ListCard>

      <Label text="Recurring bills" action={{ label: 'New', onPress: () => router.push('/recurring') }} />
      {rec.length ? (
        <ListCard>
          {rec.map((r, i) => (
            <LinkRow
              key={r.id}
              first={i === 0}
              icon={r.icon}
              title={r.name}
              sub={`${r.amount === null ? 'Amount asked each time' : inr(r.amount)} · ${r.repeat} · next ${dueText(nextDue(r))}`}
              onPress={() => router.push({ pathname: '/recurring', params: { id: r.id } })}
            />
          ))}
        </ListCard>
      ) : (
        <Txt variant="body" color={colors.inkSoft} style={styles.note}>
          Rent, Wi-Fi, the maid: set them up once and they come round on their own.
        </Txt>
      )}

      <Label text="Notifications" />
      <ListCard>
        {NOTES.map(([k, title, sub], i) => (
          <View key={k} style={[styles.switchRow, i > 0 && styles.ruled]}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Txt variant="rowTitle">{title}</Txt>
              <Txt variant="rowSub" color={colors.inkHint}>
                {sub}
              </Txt>
            </View>
            <Toggle
              value={noteState[k]}
              onChange={(v) => {
                noteState[k] = v;
                redraw((n) => n + 1);
              }}
              label={title}
            />
          </View>
        ))}
      </ListCard>

      <Txt variant="small" color={colors.inkHint} style={styles.foot}>
        Damage 1.0 · running on example data. Signing in, privacy and your data come with the backend.
      </Txt>
    </Frame>
  );
}

const styles = StyleSheet.create({
  me: { alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 18, paddingHorizontal: gutter },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, maxWidth: '100%' },
  name: { ...typeScale.amount, lineHeight: 36, flexShrink: 1 },
  nameEdit: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  nameInput: {
    flex: 1,
    minWidth: 0,
    height: 50,
    paddingHorizontal: 14,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.paper,
    fontFamily: fonts.bodyHeavy,
    fontSize: 18,
    color: colors.ink,
  },
  upiCard: {
    marginHorizontal: gutter,
    padding: 16,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  upiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    marginTop: 8,
    paddingLeft: 14,
    paddingRight: 8,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  upiBoxErr: { borderColor: colors.outText },
  upiInput: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ruled: { borderTopWidth: 1.5, borderTopColor: colors.hairline },
  note: { marginHorizontal: gutter, fontSize: 14, lineHeight: 20 },
  foot: { marginTop: 22, marginHorizontal: gutter, textAlign: 'center', lineHeight: 17 },
});
