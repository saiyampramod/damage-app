/**
 * Who a quick bill was split with last time, per tile and overall, so the next one starts there.
 * Kept while the app is open. (To keep it after the app closes, store this map with AsyncStorage.)
 */
import type { CategoryId } from './quick';
import type { PersonId } from './types';

export type LastPick = { group: string | null; people: PersonId[] };

const picks = new Map<CategoryId | 'any', LastPick>();

/** That tile's last pick, or the last quick bill's, or nothing yet. */
export function lastPick(cat: CategoryId): LastPick | null {
  return picks.get(cat) ?? picks.get('any') ?? null;
}

export function rememberPick(cats: CategoryId[], pick: LastPick) {
  cats.forEach((c) => picks.set(c, pick));
  picks.set('any', pick);
}
