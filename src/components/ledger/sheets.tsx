/** Sheets used by Bills: move a bill into or out of a group. */
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { billById, billsIn, groups, moveBill } from '@/data/store';
import type { Bill } from '@/data/types';
import { colors, gutter } from '@/theme/tokens';

import { Icon } from '../Icon';
import { Sheet } from '../Sheet';
import { showToast } from '../Toast';
import { Txt } from '../Txt';

import { Disc } from './parts';

function Option({
  lead,
  title,
  sub,
  onPress,
  right,
}: {
  lead: ReactNode;
  title: string;
  sub?: string;
  onPress: () => void;
  right?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.opt, pressed && { backgroundColor: colors.pressed }]}>
      {lead}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="rowTitle" numberOfLines={1}>
          {title}
        </Txt>
        {sub ? (
          <Txt variant="rowSub" color={colors.inkHint}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {right ?? <Icon name="chevron" size={20} strokeWidth={2.6} color={colors.ink} />}
    </Pressable>
  );
}

/** Hold a bill to open this: put it into a group, or take it out of one. */
export function MoveSheet({ bill, onClose }: { bill: Bill | null; onClose: () => void }) {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  const [shown, setShown] = useState<Bill | null>(bill);
  useEffect(() => {
    if (bill) setShown(bill);
  }, [bill]);
  const b = shown;
  const current = b?.groupId ? billById(b.groupId) : undefined;

  function to(groupId: string | undefined) {
    if (!b) return;
    moveBill(b, groupId);
    onClose();
    const g = groupId ? billById(groupId) : undefined;
    showToast(g ? `Moved ${b.name} into ${g.name}` : `${b.name} is on its own now`);
  }

  return (
    <Sheet open={!!bill} onClose={onClose} label={b ? `Move ${b.name}` : 'Move'} modal>
      {b ? (
        <View style={styles.body}>
          <Txt variant="card">Move {b.name}</Txt>
          <Txt variant="body" color={colors.inkHint} style={{ marginTop: 4, marginBottom: 10 }}>
            {current ? `It’s in ${current.name} now.` : 'It’s on its own now.'}
          </Txt>
          {groups()
            .filter((g) => g.id !== b.groupId && g.status !== 'settled')
            .map((g) => (
              <Option
                key={g.id}
                lead={<Disc icon="flag" fill={colors.highlight} />}
                title={`Into ${g.name}`}
                sub={`${g.people.length} people · ${billsIn(g.id).length} bills`}
                onPress={() => to(g.id)}
              />
            ))}
          {current ? (
            <Option
              lead={<Disc icon="bills" />}
              title="On its own"
              sub={`Out of ${current.name}`}
              onPress={() => to(undefined)}
            />
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: gutter + 4, paddingTop: 4, paddingBottom: 12 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8 },
});
