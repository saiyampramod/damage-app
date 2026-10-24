import { useLocalSearchParams } from 'expo-router';

import { Placeholder } from '@/components/Placeholder';
import { DamagePage } from '@/components/receipt/DamagePage';
import { GroupPage } from '@/components/receipt/GroupPage';
import { ItemsPage } from '@/components/receipt/ItemsPage';
import { NEEDS_YOU } from '@/data/money';
import { billById, receiptOf, useStore } from '@/data/store';

/**
 * A group (Bills | Settle up) or a bill. Every bill opens the same way: Items | Who paid while
 * it's being tagged and paid for, then Settle up once its damage is revealed, settled or not.
 * `?invite=1` asks who's in; on a group, `?tab=settle` opens Settle up and `?pay=1` starts paying.
 */
export default function BillScreen() {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const {
    id = '',
    pay,
    invite,
    tab,
  } = useLocalSearchParams<{ id: string; pay?: string; invite?: string; tab?: string }>();
  const bill = billById(id);
  if (!bill) return <Placeholder title="Bill" back points={['This bill isn’t here any more.']} />;
  if (bill.kind === 'group')
    return (
      <GroupPage
        key={bill.id}
        group={bill}
        autoPay={pay === '1'}
        tab={tab === 'settle' ? 'settle' : 'bills'}
      />
    );
  if (!receiptOf(bill.id))
    return <Placeholder title={bill.name} back points={['This bill can’t be opened yet.']} />;
  return NEEDS_YOU.includes(bill.status) ? (
    <ItemsPage key={bill.id} bill={bill} invite={invite === '1'} />
  ) : (
    <DamagePage key={bill.id} bill={bill} />
  );
}
