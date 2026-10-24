/**
 * Friends: the social side of Damage, on the example data. A friend is someone you can split with
 * from any picker without sharing a bill first. You add one by their friend code, their link or
 * QR, or from "People you may know"; they get a request, and once they accept you're friends.
 * Requests come the other way too (Accept or Ignore, here and in Activity).
 *
 * Everyone in the example bills is already a friend; Arjun and Meera have asked. A request you
 * send is accepted a few seconds later, so the whole loop can be tried on one phone.
 */
import { ME, MY_CODE, people, strangers } from './mock';
import { notify } from './store';
import type { PersonId } from './types';

export type FriendState = 'friend' | 'incoming' | 'outgoing';

type Link = { state: FriendState; at: number };

const HOUR = 60 * 60 * 1000;
const links = new Map<PersonId, Link>();
const timers = new Map<PersonId, ReturnType<typeof setTimeout>>();

/** Things that happened between you and other people, for Activity. */
export type FriendEvent = { id: string; kind: 'accepted' | 'friends'; person: PersonId; at: number };
const events: FriendEvent[] = [];
export const friendEvents = () => events;

for (const id of Object.keys(people)) {
  if (id !== ME && !people[id].guest) links.set(id, { state: 'friend', at: Date.now() - 90 * 24 * HOUR });
}
links.set('arjun', { state: 'incoming', at: Date.now() - 3 * HOUR });
links.set('meera', { state: 'incoming', at: Date.now() - 26 * HOUR });

const byName = (a: PersonId, b: PersonId) => nameFor(a).localeCompare(nameFor(b));
const nameFor = (id: PersonId) => people[id]?.name ?? strangers[id]?.name ?? id;

export const friendState = (id: PersonId): FriendState | undefined => links.get(id)?.state;
export const isFriend = (id: PersonId) => friendState(id) === 'friend';
/** When they asked, or when you asked them. */
export const askedAt = (id: PersonId) => links.get(id)?.at ?? Date.now();

/** Your friends, A–Z. */
export const friends = (): PersonId[] =>
  [...links].filter(([, l]) => l.state === 'friend').map(([id]) => id).sort(byName);

/** People who've asked to be your friend, newest first. */
export const requestsIn = (): PersonId[] =>
  [...links].filter(([, l]) => l.state === 'incoming').sort((a, b) => b[1].at - a[1].at).map(([id]) => id);

/** People you've asked, still waiting on them. */
export const requestsOut = (): PersonId[] =>
  [...links].filter(([, l]) => l.state === 'outgoing').map(([id]) => id);

/** Friends you and they both have. */
export const mutualOf = (id: PersonId): PersonId[] =>
  (strangers[id]?.mutual ?? []).filter((m) => isFriend(m));

/** People on Damage you aren't connected to yet who share friends with you, most in common first. */
export const suggestions = (): PersonId[] =>
  Object.keys(strangers)
    .filter((id) => !links.has(id) && mutualOf(id).length > 0)
    .sort((a, b) => mutualOf(b).length - mutualOf(a).length || byName(a, b));

/** Someone's friend code. Friends from the examples get one made from their name. */
export function codeOf(id: PersonId): string {
  if (id === ME) return MY_CODE;
  if (strangers[id]) return strangers[id].code;
  const name = nameFor(id).toUpperCase().replace(/[^A-Z]/g, '');
  let n = 0;
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) % 89;
  return `${name.slice(0, 5)}${n + 10}`.slice(0, 7);
}

export const MY_LINK = `damage.app/f/${MY_CODE}`;

/** Codes are typed loosely: any case, spaces or a pasted link. */
export function cleanCode(text: string): string {
  const last = text.trim().split('/').pop() ?? '';
  return last.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

/** Who a friend code belongs to: you, someone you know, someone new, or nobody. */
export function findByCode(text: string): PersonId | undefined {
  const code = cleanCode(text);
  if (code.length < 4) return undefined;
  if (code === MY_CODE) return ME;
  return [...Object.keys(people), ...Object.keys(strangers)].find(
    (id) => id !== ME && !people[id]?.guest && codeOf(id) === code,
  );
}

/** Bring someone new into your people once you're friends, so every picker has them. */
function welcome(id: PersonId) {
  const s = strangers[id];
  if (s && !people[id]) {
    const { code: _code, mutual: _mutual, ...person } = s;
    people[id] = person;
  }
}

/** Ask someone to be your friend. In the examples they say yes a few seconds later. */
export function sendRequest(id: PersonId) {
  if (id === ME || links.get(id)?.state === 'friend') return;
  if (links.get(id)?.state === 'incoming') return accept(id);
  links.set(id, { state: 'outgoing', at: Date.now() });
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      if (links.get(id)?.state !== 'outgoing') return;
      welcome(id);
      links.set(id, { state: 'friend', at: Date.now() });
      events.unshift({ id: `acc-${id}-${Date.now()}`, kind: 'accepted', person: id, at: Date.now() });
      notify();
    }, 4000),
  );
  notify();
}

export function accept(id: PersonId) {
  if (links.get(id)?.state !== 'incoming') return;
  welcome(id);
  links.set(id, { state: 'friend', at: Date.now() });
  events.unshift({ id: `fr-${id}-${Date.now()}`, kind: 'friends', person: id, at: Date.now() });
  notify();
}

export function ignore(id: PersonId) {
  if (links.get(id)?.state === 'incoming') links.delete(id);
  notify();
}

/** Take back a request you sent. */
export function cancelRequest(id: PersonId) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  if (links.get(id)?.state === 'outgoing') links.delete(id);
  notify();
}

/** Stop being friends. Bills you share stay as they are. */
export function unfriend(id: PersonId) {
  if (links.get(id)?.state === 'friend') links.delete(id);
  notify();
}
