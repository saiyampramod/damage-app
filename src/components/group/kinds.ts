/** A group's kind in words and as its icon: the pass stub, and the badge on a bill's price tag. */
import type { GroupKind } from '@/data/types';

import type { IconName } from '../Icon';

export const KIND_WORD: Record<GroupKind, string> = { trip: 'Trip', outing: 'Outing', monthly: 'Monthly' };
export const KIND_ICON: Record<GroupKind, IconName> = { trip: 'trip', outing: 'drinks', monthly: 'rent' };
