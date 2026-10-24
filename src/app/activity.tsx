/**
 * Activity, the bell on Home. At the top, what needs your OK: someone says they've paid you (Yes
 * marks it received, with Undo; Not yet tells them it hasn't come through) and friend requests.
 * Under it, what happened on your bills and with your friends: Today, This week, Earlier. Tap a
 * line to open its bill or person. Nothing older than 30 days.
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Label } from '@/components/ledger/parts';
import { BigButton, Face, Frame } from '@/components/receipt/parts';
import { ListCard, PersonRow, SmallButton } from '@/components/social/parts';
import { showToast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import {
  KEEP_DAYS,
  bucket,
  claimItem,
  dropClaim,
  feed,
  logConfirmed,
  pendingClaims,
  when,
  type Claim,
  type Event,
} from '@/data/activity';
import { ME } from '@/data/mock';
import { nameOf } from '@/data/quick';
import { accept, ignore, mutualOf, requestsIn } from '@/data/social';
import { billById, settle, useStore } from '@/data/store';
import { inr, listNames } from '@/lib/format';
import { colors, gutter, shadow, stroke } from '@/theme/tokens';

const B = ({ children }: { children: string }) => (
  <Txt variant="rowTitle" style={{ fontSize: 15 }}>
    {children}
  </Txt>
);

const billName = (e: Event) => ('billId' in e ? (billById(e.billId)?.name ?? 'a bill') : '');

/** One thing that happened, as a sentence with the names in bold. */
function sentence(e: Event) {
  const who = nameOf(e.person);
  switch (e.kind) {
    case 'nudged':
      return (
        <>
          <B>{who}</B> nudged you about {inr(e.amount)}
        </>
      );
    case 'added':
      return (
        <>
          <B>{who}</B> added you to <B>{billName(e)}</B>
        </>
      );
    case 'revealed':
      return (
        <>
          <B>{who}</B> revealed the damage on <B>{billName(e)}</B>
        </>
      );
    case 'paid':
      return (
        <>
          <B>{who}</B> paid {e.to === ME ? 'you' : nameOf(e.to)} {inr(e.amount)}
        </>
      );
    case 'accepted':
      return (
        <>
          <B>{who}</B> accepted your friend request
        </>
      );
    case 'friends':
      return (
        <>
          You and <B>{who}</B> are friends now
        </>
      );
  }
}

/** The same sentence for screen readers. */
function plain(e: Event): string {
  const who = nameOf(e.person);
  switch (e.kind) {
    case 'nudged':
      return `${who} nudged you about ${inr(e.amount)}, ${billName(e)}`;
    case 'added':
      return `${who} added you to ${billName(e)}`;
    case 'revealed':
      return `${who} revealed the damage on ${billName(e)}`;
    case 'paid':
      return `${who} paid ${e.to === ME ? 'you' : nameOf(e.to)} ${inr(e.amount)}, ${billName(e)}`;
    case 'accepted':
      return `${who} accepted your friend request`;
    case 'friends':
      return `You and ${who} are friends now`;
  }
}

function EventRow({ e, first }: { e: Event; first: boolean }) {
  const billId = 'billId' in e ? e.billId : undefined;
  const named = e.kind === 'added' || e.kind === 'revealed';
  const open = () => (billId ? router.push(`/bill/${billId}`) : router.push(`/person/${e.person}`));
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${plain(e)}, ${when(e.at)}`}
      style={({ pressed }) => [
        styles.event,
        !first && styles.ruled,
        pressed && { backgroundColor: colors.pressed },
      ]}>
      <Face id={e.person} size={38} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt variant="body" style={{ fontSize: 15, lineHeight: 20 }}>
          {sentence(e)}
        </Txt>
        <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
          {billId && !named ? `${billName(e)} · ` : ''}
          {when(e.at)}
        </Txt>
      </View>
    </Pressable>
  );
}

function ClaimCard({ c }: { c: Claim }) {
  const who = nameOf(c.person);
  const bill = billById(c.billId);
  function yes() {
    const item = claimItem(c);
    const back = dropClaim(c);
    if (!item) {
      showToast('That one’s already settled');
      return;
    }
    const unsettle = settle([item]);
    const unlog = logConfirmed(c);
    showToast(`Got ${inr(c.amount)} from ${who}`, {
      undo: () => {
        unsettle();
        unlog();
        back();
      },
    });
  }
  function notYet() {
    const back = dropClaim(c);
    showToast(`We’ll tell ${who} it hasn’t come through`, { undo: back });
  }
  return (
    <View style={styles.claim}>
      <View style={styles.claimTop}>
        <Face id={c.person} size={40} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Txt variant="rowTitle">
            {who} says they’ve paid you {inr(c.amount)}
          </Txt>
          <Txt variant="rowSub" color={colors.inkHint} numberOfLines={1}>
            {bill?.name ?? 'A bill'} · {when(c.at)}
          </Txt>
        </View>
      </View>
      <Txt variant="rowSub" color={colors.inkSoft} style={{ marginTop: 10 }}>
        Check your UPI app first. Did it come in?
      </Txt>
      <View style={styles.actions}>
        <BigButton label="Not yet" height={46} light onPress={notYet} style={{ flex: 1 }} />
        <BigButton label="Yes, got it" height={46} light lime onPress={yes} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

type Bucket = 'Today' | 'This week' | 'Earlier';
const BUCKETS: Bucket[] = ['Today', 'This week', 'Earlier'];

export default function ActivityScreen() {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const claims = pendingClaims();
  const reqs = requestsIn();
  const ok = claims.length + reqs.length;
  const events = feed();

  return (
    <Frame title="Activity">
      {ok ? (
        <>
          <Label text={`Needs your OK · ${ok}`} />
          {claims.map((c) => (
            <ClaimCard key={c.id} c={c} />
          ))}
          {reqs.length ? (
            <ListCard>
              {reqs.map((id, i) => {
                const m = mutualOf(id);
                return (
                  <PersonRow
                    key={id}
                    first={i === 0}
                    id={id}
                    name={nameOf(id)}
                    sub={m.length ? `Friends with ${listNames(m.map(nameOf))}` : 'Wants to be friends'}
                    right={
                      <View style={styles.pair}>
                        <SmallButton
                          label="Ignore"
                          onPress={() => ignore(id)}
                          accessibilityLabel={`Ignore ${nameOf(id)}`}
                        />
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
                );
              })}
            </ListCard>
          ) : null}
        </>
      ) : (
        <View style={styles.caught}>
          <Txt variant="title">All caught up</Txt>
          <Txt variant="body" color={colors.inkSoft} style={{ textAlign: 'center' }}>
            When someone says they’ve paid you, or wants to be friends, it shows up here.
          </Txt>
        </View>
      )}

      {BUCKETS.map((k) => {
        const list = events.filter((e) => bucket(e.at) === k);
        return list.length ? (
          <View key={k}>
            <Label text={k} />
            <ListCard>
              {list.map((e, i) => (
                <EventRow key={e.id} e={e} first={i === 0} />
              ))}
            </ListCard>
          </View>
        ) : null;
      })}

      <Txt variant="small" color={colors.inkHint} style={styles.foot}>
        Nothing older than {KEEP_DAYS} days.
      </Txt>
    </Frame>
  );
}

const styles = StyleSheet.create({
  claim: {
    marginHorizontal: gutter,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.paper,
    boxShadow: shadow.s,
  },
  claimTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  pair: { flexDirection: 'row', gap: 6 },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ruled: { borderTopWidth: 1.5, borderTopColor: colors.hairline },
  caught: {
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginHorizontal: gutter,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.highlightSoft,
  },
  foot: { marginTop: 20, marginHorizontal: gutter, textAlign: 'center' },
});
