/**
 * Friends: add someone by their friend code (or a pasted link), share your own code, link or QR,
 * answer requests, see who you've asked, people you may know through friends, and your friends
 * A–Z. A friend shows up in every "who's in?" picker, so you can split with them straight away.
 * `?add=1` puts the cursor in the code field.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Label } from '@/components/ledger/parts';
import { SearchField } from '@/components/quick/parts';
import { Frame, HeadButton } from '@/components/receipt/parts';
import {
  ListCard,
  MyCode,
  MyQr,
  PersonRow,
  SmallButton,
  StateTag,
} from '@/components/social/parts';
import { showToast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import { ME } from '@/data/mock';
import { nameOf } from '@/data/quick';
import {
  accept,
  cancelRequest,
  cleanCode,
  findByCode,
  friendState,
  friends,
  ignore,
  mutualOf,
  requestsIn,
  requestsOut,
  sendRequest,
  suggestions,
} from '@/data/social';
import { useStore } from '@/data/store';
import type { PersonId } from '@/data/types';
import { listNames } from '@/lib/format';
import { colors, fonts, gutter, radius, stroke } from '@/theme/tokens';

const mutualLine = (id: PersonId) => {
  const m = mutualOf(id);
  if (!m.length) return 'No friends in common yet';
  return m.length <= 2 ? `Friends with ${listNames(m.map(nameOf))}` : `${m.length} friends in common`;
};

export default function FriendsScreen() {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const { add } = useLocalSearchParams<{ add?: string }>();
  const [code, setCode] = useState('');
  const [q, setQ] = useState('');
  const [qr, setQr] = useState(false);
  const codeRef = useRef<TextInput>(null);

  const typed = cleanCode(code);
  const found = typed.length >= 4 ? findByCode(code) : undefined;
  const incoming = requestsIn();
  const outgoing = requestsOut();
  const maybe = suggestions();
  const query = q.trim().toLowerCase();
  const mine = friends().filter((id) => !query || nameOf(id).toLowerCase().includes(query));

  function ask(id: PersonId) {
    sendRequest(id);
    showToast(`Request sent to ${nameOf(id)}`);
  }

  let result = null;
  if (typed.length >= 4) {
    if (found === ME) {
      result = (
        <Txt variant="label" color={colors.inkSoft} style={styles.hint}>
          That’s your own code.
        </Txt>
      );
    } else if (!found) {
      result = (
        <Txt variant="label" color={colors.inkSoft} style={styles.hint}>
          {typed.length < 7 ? 'Keep typing: codes are 7 letters and numbers.' : 'Nobody has that code. Check it with them?'}
        </Txt>
      );
    } else {
      const st = friendState(found);
      result = (
        <View style={styles.found}>
          <PersonRow
            first
            id={found}
            name={nameOf(found)}
            sub={st === 'friend' ? 'Already your friend' : mutualLine(found)}
            right={
              st === 'friend' ? (
                <StateTag text="Friends" done />
              ) : st === 'outgoing' ? (
                <StateTag text="Requested" />
              ) : st === 'incoming' ? (
                <SmallButton label="Accept" lime onPress={() => accept(found)} />
              ) : (
                <SmallButton label="Add friend" lime onPress={() => ask(found)} />
              )
            }
          />
        </View>
      );
    }
  }

  return (
    <Frame
      title="Friends"
      right={<HeadButton icon="qr" label="Show my QR" onPress={() => setQr(true)} />}
      overlay={<MyQr open={qr} onClose={() => setQr(false)} />}>
      <View style={styles.addCard}>
        <Txt variant="title" accessibilityRole="header">
          Add a friend
        </Txt>
        <Txt variant="body" color={colors.inkSoft} style={{ marginTop: 4, fontSize: 14, lineHeight: 20 }}>
          Type their friend code, or paste the link they sent you.
        </Txt>
        <View style={styles.codeBox}>
          <Icon name="user" size={20} color={colors.ink} />
          <TextInput
            ref={codeRef}
            value={code}
            onChangeText={setCode}
            autoFocus={add === '1'}
            placeholder="e.g. ARJUN4K"
            placeholderTextColor={colors.inkHint}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Friend code or link"
            style={styles.codeInput}
          />
          {code ? (
            <SmallButton label="Clear" onPress={() => setCode('')} accessibilityLabel="Clear the code" />
          ) : null}
        </View>
        {result}
      </View>

      <View style={{ marginTop: 14 }}>
        <MyCode onQr={() => setQr(true)} />
      </View>

      {incoming.length ? (
        <>
          <Label text={`Requests · ${incoming.length}`} />
          <ListCard>
            {incoming.map((id, i) => (
              <PersonRow
                key={id}
                first={i === 0}
                id={id}
                name={nameOf(id)}
                sub={mutualLine(id)}
                right={
                  <View style={styles.pair}>
                    <SmallButton label="Ignore" onPress={() => ignore(id)} accessibilityLabel={`Ignore ${nameOf(id)}`} />
                    <SmallButton
                      label="Accept"
                      lime
                      onPress={() => {
                        accept(id);
                        showToast(`You and ${nameOf(id)} are friends`);
                      }}
                      accessibilityLabel={`Accept ${nameOf(id)}`}
                    />
                  </View>
                }
              />
            ))}
          </ListCard>
        </>
      ) : null}

      {outgoing.length ? (
        <>
          <Label text="Waiting on them" />
          <ListCard>
            {outgoing.map((id, i) => (
              <PersonRow
                key={id}
                first={i === 0}
                id={id}
                name={nameOf(id)}
                sub="Request sent"
                right={
                  <SmallButton
                    label="Cancel"
                    onPress={() => cancelRequest(id)}
                    accessibilityLabel={`Cancel the request to ${nameOf(id)}`}
                  />
                }
              />
            ))}
          </ListCard>
        </>
      ) : null}

      {maybe.length ? (
        <>
          <Label text="People you may know" />
          <ListCard>
            {maybe.map((id, i) => (
              <PersonRow
                key={id}
                first={i === 0}
                id={id}
                name={nameOf(id)}
                sub={mutualLine(id)}
                right={<SmallButton label="Add" lime onPress={() => ask(id)} accessibilityLabel={`Add ${nameOf(id)}`} />}
              />
            ))}
          </ListCard>
        </>
      ) : null}

      <Label text={`Your friends · ${friends().length}`} />
      {friends().length > 6 ? (
        <View style={{ marginBottom: 10 }}>
          <View style={{ paddingHorizontal: gutter }}>
            <SearchField value={q} onChangeText={setQ} placeholder="Search your friends" />
          </View>
        </View>
      ) : null}
      {mine.length ? (
        <ListCard>
          {mine.map((id, i) => (
            <PersonRow
              key={id}
              first={i === 0}
              id={id}
              name={nameOf(id)}
              onPress={() => router.push(`/person/${id}`)}
              right={<Icon name="chevron" size={18} strokeWidth={2.6} color={colors.inkHint} />}
            />
          ))}
        </ListCard>
      ) : (
        <Txt variant="body" color={colors.inkSoft} style={styles.empty}>
          {query ? `None of your friends is called “${q.trim()}”.` : 'No friends yet. Share your code to get started.'}
        </Txt>
      )}
    </Frame>
  );
}

const styles = StyleSheet.create({
  addCard: {
    marginTop: 6,
    marginHorizontal: gutter,
    padding: 16,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    marginTop: 12,
    paddingLeft: 14,
    paddingRight: 8,
    borderWidth: stroke.m,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
  },
  codeInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontFamily: fonts.bodyHeavy,
    fontSize: 18,
    letterSpacing: 1.5,
    color: colors.ink,
  },
  hint: { marginTop: 10, fontSize: 13.5 },
  found: {
    marginTop: 12,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  pair: { flexDirection: 'row', gap: 6 },
  empty: { marginHorizontal: gutter, marginTop: 4 },
});
