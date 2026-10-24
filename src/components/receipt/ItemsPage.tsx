/**
 * A bill made from a receipt, before the damage is revealed. Two tabs under its name, both open
 * at any time: Items (who's here with Add, which opens Who's in? and its Share link; the total; then each item with the faces of who
 * had it) and Who paid (add it at the start of the night or at the end, until it adds up to the
 * bill). The bar shows what's still missing; "What's the damage?" locks the bill and it opens
 * as Settle up, which is only ever about who owes whom.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ME } from '@/data/mock';
import { nameOf } from '@/data/quick';
import {
  evenAmong,
  grandTotal,
  leftOf,
  paidSoFar,
  paidUp,
  plus,
  toTag,
  whoHad,
  without,
  withUnits,
  type Line,
  type Tags,
} from '@/data/receipt';
import {
  billById,
  editReceipt,
  receiptOf,
  revealDamage,
  setPaid,
  setWho,
  useStore,
} from '@/data/store';
import type { Bill, PersonId } from '@/data/types';
import { inr } from '@/lib/format';
import { colors, fonts, gutter, stroke, type as typeScale } from '@/theme/tokens';

import { PeopleSticker } from '../ChatRow';
import { DashedLine } from '../DashedLine';
import { Icon } from '../Icon';
import { Label } from '../ledger/parts';
import { showToast } from '../Toast';
import { Txt } from '../Txt';

import { MyShareSheet, NeedsTaggingSheet } from './InfoSheets';
import { ItemCard } from './ItemCard';
import { LineSheet, type LineEdit } from './LineSheet';
import {
  BottomBar,
  Card,
  CardLabel,
  Cta,
  Face,
  Frame,
  GroupBadge,
  HeadButton,
  StepTabs,
} from './parts';
import { PaidSheet, PayerSheet } from './PaySheets';
import { SplitSheet, UnitsSheet } from './SplitSheet';
import { WhoPopup, WhoSheet } from './WhoPopup';

type Step = 'items' | 'paid';
type Open = 'split' | 'units' | 'line' | 'needs' | 'mine' | 'payer' | 'paid' | 'who' | null;

/** The bill's name in display type, and the group it's in. */
function NameBlock({ bill }: { bill: Bill }) {
  'use no memo';
  const group = bill.groupId ? billById(bill.groupId) : undefined;
  return (
    <View style={styles.name}>
      <Txt style={styles.nameText} accessibilityRole="header">
        {bill.name}
      </Txt>
      {group ? <GroupBadge name={group.name} /> : null}
    </View>
  );
}

export function ItemsPage({ bill, invite = false }: { bill: Bill; invite?: boolean }) {
  // The example data changes in place, so this must not be memoised by the React Compiler.
  'use no memo';

  useStore();
  const [view, setView] = useState<Step>('items');
  const [open, setOpen] = useState<Open>(null);
  const [whoMode, setWhoMode] = useState<'people' | 'group'>('people');
  const [popup, setPopup] = useState(invite);
  const [lineId, setLineId] = useState<string>();
  const [payer, setPayer] = useState<PersonId>(ME);
  const [nonce, setNonce] = useState(0);
  const [openItem, setOpenItem] = useState<string>();
  const [armed, setArmed] = useState<{ id: string; p: PersonId }>();
  const [flash, setFlash] = useState<string>();
  const scroll = useRef<ScrollView>(null);
  const listY = useRef(0);
  const ys = useRef<Record<string, number>>({});
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (f: () => void, ms: number) => timers.current.push(setTimeout(f, ms));

  const r = receiptOf(bill.id);
  if (!r) return null;

  const line = r.lines.find((l) => l.id === lineId);
  const left = toTag(r);
  const total = grandTotal(r);
  const covered = paidSoFar(r);
  const gap = Math.round(total - covered);
  const payers = bill.people.filter((p) => (r.paid[p] ?? 0) > 0);
  const itemsDone = !left.length;

  /** Open a sheet. Each opening starts fresh from the bill as it is now. */
  function show(kind: Open, id?: string) {
    if (id !== undefined) setLineId(id);
    setNonce((n) => n + 1);
    setOpen(kind);
  }
  const close = () => setOpen(null);
  const change = (l: Line, t: Tags) => editReceipt(bill, () => Object.assign(l, t));

  /** Scroll to an item and wash it lime for a moment. */
  function jump(id: string) {
    setOpen(null);
    setView('items');
    later(() => {
      const y = listY.current + (ys.current[id] ?? 0);
      scroll.current?.scrollTo({ y: Math.max(0, y - 140), animated: true });
      setFlash(id);
      later(() => setFlash((f) => (f === id ? undefined : f)), 1300);
    }, 60);
  }

  function me(l: Line) {
    if (l.qty > 1 && leftOf(l) > 1e-6) show('units', l.id);
    else change(l, plus(l, ME));
  }

  /** First tap arms the face ("Remove?"); a second tap within a moment takes them off. */
  function face(l: Line, p: PersonId) {
    if (armed?.id === l.id && armed.p === p) {
      setArmed(undefined);
      change(l, without(l, p));
      return;
    }
    setArmed({ id: l.id, p });
    later(() => setArmed((a) => (a?.id === l.id && a.p === p ? undefined : a)), 2600);
  }

  function saveLine(e: LineEdit) {
    if (!line) return;
    close();
    editReceipt(bill, () => {
      const moved = e.qty !== line.qty;
      Object.assign(line, e);
      // A new count: whoever had it shares it evenly again.
      if (moved) Object.assign(line, evenAmong(line, whoHad(line)));
    });
  }

  function deleteLine() {
    if (!line) return;
    const gone = line;
    const at = r!.lines.indexOf(gone);
    close();
    editReceipt(bill, (x) => x.lines.splice(at, 1));
    showToast(`Removed ${gone.name}`, {
      undo: () => editReceipt(bill, (x) => x.lines.splice(at, 0, gone)),
    });
  }


  function addPayer() {
    show('payer');
  }
  function pickPayer(p: PersonId) {
    setPayer(p);
    show('paid');
  }
  function paidHint() {
    if (!covered) return addPayer();
    showToast(
      gap > 0
        ? `Who paid has to come to ${inr(total)}. Add another payer or change an amount.`
        : `That’s ${inr(-gap)} more than the bill. Tap a payer to fix it.`,
    );
  }

  function who(mode: 'people' | 'group') {
    setPopup(false);
    setWhoMode(mode);
    show('who');
  }
  function whoDone(groupId: string | undefined, ids: PersonId[]) {
    if (!setWho(bill, groupId, ids))
      showToast('Someone joined from the link, so this bill stays out of groups');
    close();
    setPopup(true);
  }

  // The bar says what's still missing, whichever tab you're on: items to tag, then who paid.
  const paidLabel = !covered
    ? 'Add who paid'
    : gap > 0
      ? `${inr(gap)} left to cover`
      : `${inr(-gap)} over the bill`;
  let bar;
  if (paidUp(r) && itemsDone)
    bar = <Cta label="What’s the damage?" icon="bills" onPress={() => revealDamage(bill)} />;
  else if (view === 'paid' && !paidUp(r))
    bar = <Cta kind="grey" label={paidLabel} onPress={paidHint} />;
  else if (left.length)
    bar = (
      <Cta
        kind="grey"
        label={`${left.length} ${left.length === 1 ? 'item' : 'items'} to tag`}
        onPress={() => jump(left[0].id)}
      />
    );
  else bar = <Cta label="Who paid?" icon="arrow" onPress={() => setView('paid')} />;

  const steps: [Step, string, boolean][] = [
    ['items', 'Items', itemsDone],
    ['paid', 'Who paid', paidUp(r)],
  ];

  return (
    <Frame
      title={view === 'paid' ? 'Who paid' : 'Items'}
      scrollRef={scroll}
      right={
        <>
          <HeadButton
            icon="tag"
            label={left.length ? `${left.length} items need tagging` : 'Every item is tagged'}
            count={left.length}
            onPress={() => show('needs')}
          />
          <HeadButton icon="user" label="My share" onPress={() => show('mine')} />
        </>
      }
      bar={<BottomBar>{bar}</BottomBar>}
      overlay={
        <>
          {line ? (
            <SplitSheet
              key={`split${nonce}`}
              open={open === 'split'}
              line={line}
              people={bill.people}
              onDone={(t) => {
                change(line, t);
                close();
              }}
              onClose={close}
            />
          ) : null}
          {line ? (
            <UnitsSheet
              key={`units${nonce}`}
              open={open === 'units'}
              line={line}
              onPick={(n) => {
                change(line, withUnits(line, ME, n));
                close();
              }}
              onClose={close}
            />
          ) : null}
          {line ? (
            <LineSheet
              key={`line${nonce}`}
              open={open === 'line'}
              line={line}
              onSave={saveLine}
              onDelete={r.lines.length > 1 ? deleteLine : undefined}
              onClose={close}
            />
          ) : null}
          <NeedsTaggingSheet open={open === 'needs'} lines={left} onJump={jump} onClose={close} />
          <MyShareSheet open={open === 'mine'} receipt={r} people={bill.people} onClose={close} />
          <PayerSheet
            open={open === 'payer'}
            people={bill.people.filter((p) => !payers.includes(p))}
            onPick={pickPayer}
            onClose={close}
          />
          <PaidSheet
            key={`paid${nonce}`}
            open={open === 'paid'}
            person={payer}
            total={total}
            others={covered - (r.paid[payer] ?? 0)}
            start={r.paid[payer] ?? Math.max(0, gap)}
            onSave={(n) => {
              setPaid(bill, payer, n);
              close();
            }}
            onClose={close}
          />
          <WhoSheet
            key={`who${nonce}`}
            open={open === 'who'}
            mode={whoMode}
            bill={bill}
            onDone={whoDone}
            onClose={() => {
              close();
              setPopup(true);
            }}
            onNewGroup={(name) => {
              close();
              router.push({ pathname: '/group/new', params: name ? { bill: bill.id, name } : { bill: bill.id } });
            }}
          />
          {popup ? (
            <WhoPopup
              bill={bill}
              onPeople={() => who('people')}
              onGroup={() => who('group')}
              onDone={() => setPopup(false)}
            />
          ) : null}
        </>
      }>
      <NameBlock bill={bill} />
      <StepTabs steps={steps} value={view} onChange={setView} label="Bill steps" />

      {view === 'items' ? (
        <>
          <Card>
            <CardLabel text="Who’s here" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.people}>
              {bill.people.map((p) => (
                <View key={p} style={styles.person}>
                  <View>
                    <Face id={p} size={46} />
                    {p === ME ? <View style={styles.meDot} /> : null}
                  </View>
                  <Txt variant="small" color={colors.inkSoft} numberOfLines={1}>
                    {nameOf(p)}
                  </Txt>
                </View>
              ))}
              <Pressable
                onPress={() => setPopup(true)}
                accessibilityRole="button"
                accessibilityLabel="Add people or make it part of a group"
                style={styles.person}>
                <View style={styles.addBig}>
                  <Icon name="peoplePlus" size={20} color={colors.ink} />
                </View>
                <Txt variant="small" color={colors.inkSoft}>
                  Add
                </Txt>
              </Pressable>
            </ScrollView>
          </Card>
          <View style={styles.total}>
            <Icon name="bills" size={18} color={colors.ink} />
            <Txt variant="label" style={styles.totalLabel}>
              TOTAL BILL
            </Txt>
            <DashedLine kind="dotted" thickness={2} style={styles.leader} />
            <Txt variant="bodyStrong">{inr(total)}</Txt>
          </View>
          <Label
            text={`Items · ${r.lines.length}`}
            aside={left.length ? `${left.length} to tag` : 'All tagged'}
          />
          <View onLayout={(e) => (listY.current = e.nativeEvent.layout.y)}>
            {r.lines.map((l) => (
              <View key={l.id} onLayout={(e) => (ys.current[l.id] = e.nativeEvent.layout.y)}>
                <ItemCard
                  line={l}
                  people={bill.people}
                  open={openItem === l.id}
                  armed={armed?.id === l.id ? armed.p : undefined}
                  flash={flash === l.id}
                  onEdit={() => show('line', l.id)}
                  onSplit={() => show('split', l.id)}
                  onMe={() => me(l)}
                  onFace={(p) => face(l, p)}
                  onToggle={() => setOpenItem(openItem === l.id ? undefined : l.id)}
                />
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <Label text="Who paid?" aside={`Bill total ${inr(total)}`} />
          {payers.length ? (
            <Card bare style={styles.payCard}>
              {payers.map((p, i) => (
                <View key={p} style={styles.whoRow}>
                  {i > 0 ? <View style={styles.whoRule} /> : null}
                  <Pressable
                    onPress={() => pickPayer(p)}
                    accessibilityRole="button"
                    accessibilityLabel={`Amount ${nameOf(p)} paid, ${inr(r.paid[p])}`}
                    style={styles.whoBody}>
                    <PeopleSticker id={p} index={i} />
                    <Txt variant="rowTitle" numberOfLines={1} style={{ flex: 1 }}>
                      {p === ME ? 'You' : nameOf(p)}
                    </Txt>
                    <Txt variant="rowTitle">{inr(r.paid[p])}</Txt>
                  </Pressable>
                  <Pressable
                    onPress={() => setPaid(bill, p, 0)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${nameOf(p)} as payer`}
                    style={styles.remove}>
                    <Icon name="close" size={16} strokeWidth={2.6} color={colors.inkHint} />
                  </Pressable>
                </View>
              ))}
              {payers.length < bill.people.length ? (
                <Pressable
                  onPress={addPayer}
                  accessibilityRole="button"
                  style={[styles.payRow, styles.payRule, { gap: 10, paddingLeft: 4 }]}>
                  <Icon name="peoplePlus" size={18} color={colors.inkSoft} />
                  <Txt variant="label" color={colors.inkSoft} style={{ fontSize: 14.5 }}>
                    Add another payer
                  </Txt>
                </Pressable>
              ) : null}
            </Card>
          ) : (
            // Nobody yet: everyone on the bill is right here, tap whoever paid (the founder's call).
            // Once someone's in, it's the payer list with Add another payer.
            <Card bare style={styles.payCard}>
              <Txt variant="small" color={colors.inkHint} style={styles.payHint}>
                Tap whoever paid
              </Txt>
              {bill.people.map((p, i) => (
                <Pressable
                  key={p}
                  onPress={() => pickPayer(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`${nameOf(p)} paid`}
                  style={({ pressed }) => [styles.whoRow, pressed && { backgroundColor: colors.pressed }]}>
                  {i > 0 ? <View style={styles.whoRule} /> : null}
                  <View style={styles.whoBody}>
                    <PeopleSticker id={p} index={i} />
                    <Txt variant="rowTitle" numberOfLines={1} style={{ flex: 1 }}>
                      {p === ME ? 'You' : nameOf(p)}
                    </Txt>
                  </View>
                </Pressable>
              ))}
            </Card>
          )}
          {payers.length ? (
            <View style={styles.balance}>
              <View style={styles.balanceLeft}>
                {gap === 0 ? (
                  <Icon name="check" size={15} strokeWidth={3.2} color={colors.inText} />
                ) : null}
                <Txt
                  variant="label"
                  color={gap === 0 ? colors.inText : gap < 0 ? colors.outText : colors.ink}>
                  {gap === 0
                    ? 'Balance reached'
                    : gap > 0
                      ? `${inr(gap)} left`
                      : `${inr(-gap)} over`}
                </Txt>
              </View>
              <Txt variant="label" color={colors.inkHint} style={{ fontFamily: fonts.bodyBold }}>
                <Txt variant="label">{inr(covered)}</Txt> / {inr(total)}
              </Txt>
            </View>
          ) : null}
        </>
      )}
    </Frame>
  );
}

const styles = StyleSheet.create({
  /** Who paid's people, the same as a person on People: sticker, name, a rule from the name on. */
  whoRow: { flexDirection: 'row', alignItems: 'center', minHeight: 74 },
  whoRule: { position: 'absolute', top: 0, left: 64, right: -gutter, height: 1, backgroundColor: colors.hairline },
  whoBody: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  payHint: { paddingTop: 2, paddingBottom: 8, fontSize: 12.5 },
  name: { marginHorizontal: 20, gap: 6, alignItems: 'flex-start' },
  nameText: { ...typeScale.amount, lineHeight: 36 },
  people: { gap: 12, paddingTop: 10, paddingBottom: 2, paddingHorizontal: 2 },
  person: { alignItems: 'center', gap: 5, minWidth: 52 },
  meDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: stroke.s,
    borderColor: colors.line,
    backgroundColor: colors.highlight,
  },
  addBig: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: stroke.s,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: { flexDirection: 'row', marginTop: 12, marginHorizontal: gutter },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginHorizontal: gutter,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: stroke.s,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: colors.paper,
  },
  totalLabel: { fontSize: 13, letterSpacing: 0.8 },
  leader: { flex: 1, marginTop: 6, marginHorizontal: 4 },
  payCard: { paddingTop: 4, paddingBottom: 4 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56 },
  payRule: { borderTopWidth: 1, borderTopColor: colors.hairline },
  payBody: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  remove: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
    marginHorizontal: 20,
  },
  balanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
