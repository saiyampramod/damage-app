/**
 * Set an amount for one of your money rules: the monthly spend limit, or how big a bill has to be
 * before Damage checks with you. A few quick picks, then the number keys. Open it with a fresh `key`
 * each time.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { inr } from '@/lib/format';
import { gutter } from '@/theme/tokens';

import { AmountBox, BigButton, Keypad, SheetFoot, SheetHead, SheetNote, Tiles } from '../receipt/parts';
import { Sheet } from '../Sheet';
import { showToast } from '../Toast';

export function LimitSheet({
  open,
  title,
  note,
  value,
  picks,
  onSave,
  onRemove,
  onClose,
}: {
  open: boolean;
  title: string;
  note: string;
  value: number | null;
  /** Quick picks: a word and an amount. */
  picks: [string, number][];
  onSave: (n: number) => void;
  /** Shown as "No limit" when given. */
  onRemove?: () => void;
  onClose: () => void;
}) {
  const [amt, setAmt] = useState(value ? String(value) : '');
  const n = Number(amt || 0);

  function save() {
    if (!n) return showToast('Type an amount');
    onSave(n);
  }

  return (
    <Sheet open={open} onClose={onClose} label={title} modal>
      <SheetHead title={title} onClose={onClose} />
      <SheetNote>{note}</SheetNote>
      <View style={styles.picks}>
        <Tiles
          tiles={picks.map(([label, p]) => ({ label, value: p, shown: inr(p) }))}
          value={n}
          onPick={(v) => setAmt(String(v))}
        />
      </View>
      <AmountBox value={amt} />
      <Keypad value={amt} onChange={setAmt} />
      <SheetFoot>
        {onRemove ? <BigButton label="No limit" onPress={onRemove} /> : null}
        <BigButton label="Save" lime onPress={save} />
      </SheetFoot>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  picks: { marginHorizontal: gutter - 16, marginTop: 4 },
});
