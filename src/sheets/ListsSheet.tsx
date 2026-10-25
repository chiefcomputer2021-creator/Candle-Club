import { useMemo, useState, type ReactNode } from 'react';
import { useConfirm } from '../components/Confirm';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toasts';
import { useBook } from '../data/BookContext';
import { plural } from '../lib/format';
import {
  KIND_LABEL, newLabel, newStatus, SWATCHES, swatchClass,
  type Label, type ListKey, type StatusDef, type StatusKind, type Swatch,
} from '../lib/lists';
import type { Expense, Order } from '../lib/types';
import { Sheet } from './Sheet';

type Tab = 'statuses' | 'labels' | ListKey;
const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'statuses', label: 'Statuses', hint: 'The steps an order moves through. “Counts as” decides how each one is treated: completed orders can be ticked off in one tap, cancelled ones drop out of money totals.' },
  { id: 'labels', label: 'Labels', hint: 'Tags anyone can put on an order, like VIP, Church or Rush. They show on the order list and calendar and can be used as a filter.' },
  { id: 'services', label: 'Services', hint: 'What you offer. Renaming one updates existing orders too; removing one leaves past orders as they are.' },
  { id: 'flowers', label: 'Flowers', hint: 'Flower choices on the order form. Renaming updates existing orders.' },
  { id: 'paymentMethods', label: 'Payment methods', hint: 'How clients pay you. Renaming updates recorded payments.' },
  { id: 'expenseCategories', label: 'Expense categories', hint: 'Groups for your spending in Finances. Renaming updates existing expenses.' },
];

type Row = { key: string; orig: string | null; value: string };
const toRows = (list: string[]): Row[] => list.map((v) => ({ key: v, orig: v, value: v }));
const move = <T,>(arr: T[], i: number, d: number) => {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};
const nextSwatch = (used: number): Swatch => SWATCHES[(used + 6) % SWATCHES.length];

/** Admin-only editor for statuses, labels and the option lists used across the app. */
export function ListsSheet({ onClose }: { onClose: () => void }) {
  const book = useBook();
  const confirm = useConfirm();
  const toast = useToast();
  const { settings, orders, expenses } = book;
  const [tab, setTab] = useState<Tab>('statuses');
  const [statuses, setStatuses] = useState<StatusDef[]>(settings.statuses);
  const [labels, setLabels] = useState<Label[]>(settings.labels);
  const [lists, setLists] = useState<Record<ListKey, Row[]>>({
    services: toRows(settings.services), flowers: toRows(settings.flowers),
    paymentMethods: toRows(settings.paymentMethods), expenseCategories: toRows(settings.expenseCategories),
  });
  const [picker, setPicker] = useState<string | null>(null);
  const [adding, setAdding] = useState('');
  const [error, setError] = useState('');

  const usage = useMemo(() => {
    const status: Record<string, number> = {}, label: Record<string, number> = {};
    const list: Record<ListKey, Record<string, number>> = { services: {}, flowers: {}, paymentMethods: {}, expenseCategories: {} };
    const inc = (m: Record<string, number>, k: string) => { m[k] = (m[k] || 0) + 1; };
    orders.forEach((o) => {
      inc(status, o.status); o.labels.forEach((l) => inc(label, l));
      inc(list.services, o.serviceType); inc(list.flowers, o.flowerType);
      o.payments.forEach((p) => inc(list.paymentMethods, p.method));
    });
    expenses.forEach((e) => inc(list.expenseCategories, e.category));
    return { status, label, list };
  }, [orders, expenses]);

  const info = TABS.find((t) => t.id === tab)!;
  const isList = tab !== 'statuses' && tab !== 'labels';

  function add() {
    const name = adding.trim();
    if (!name) return;
    setError('');
    if (tab === 'statuses') setStatuses((s) => [...s, newStatus(name, nextSwatch(s.length))]);
    else if (tab === 'labels') setLabels((l) => [...l, newLabel(name, nextSwatch(l.length))]);
    else setLists((l) => ({ ...l, [tab]: [...l[tab as ListKey], { key: 'new-' + Date.now(), orig: null, value: name }] }));
    setAdding('');
  }

  function validate(): string {
    const dupes = (names: string[]) => names.find((n, i) => names.findIndex((m) => m.toLowerCase() === n.toLowerCase()) !== i);
    const names = statuses.map((s) => s.name.trim());
    if (names.some((n) => !n)) return 'Every status needs a name.';
    if (dupes(names)) return `There are two statuses called “${dupes(names)}”.`;
    for (const k of ['open', 'done', 'cancelled'] as StatusKind[]) {
      if (!statuses.some((s) => s.kind === k)) return `Keep at least one status that counts as “${KIND_LABEL[k]}”.`;
    }
    const lnames = labels.map((l) => l.name.trim());
    if (lnames.some((n) => !n)) return 'Every label needs a name.';
    if (dupes(lnames)) return `There are two labels called “${dupes(lnames)}”.`;
    for (const t of TABS.filter((x) => x.id !== 'statuses' && x.id !== 'labels')) {
      const vals = lists[t.id as ListKey].map((r) => r.value.trim());
      if (!vals.length) return `Keep at least one item in ${t.label}.`;
      if (vals.some((v) => !v)) return `An item in ${t.label} has no name.`;
      if (dupes(vals)) return `${t.label} has “${dupes(vals)}” twice.`;
    }
    return '';
  }

  async function save() {
    const problem = validate();
    if (problem) { setError(problem); return; }
    const cleanStatuses = statuses.map((s) => ({ ...s, name: s.name.trim() }));
    const cleanLabels = labels.map((l) => ({ ...l, name: l.name.trim() }));
    const vals = (k: ListKey) => lists[k].map((r) => r.value.trim());
    const renames = (k: ListKey) => new Map(lists[k].filter((r) => r.orig && r.orig !== r.value.trim()).map((r) => [r.orig!, r.value.trim()]));

    // Orders on a removed status move to the first remaining status of the same kind.
    const oldById = new Map(settings.statuses.map((s) => [s.id, s]));
    const keptIds = new Set(cleanStatuses.map((s) => s.id));
    const moved = new Map<string, StatusDef>();
    settings.statuses.filter((s) => !keptIds.has(s.id)).forEach((s) => {
      moved.set(s.id, cleanStatuses.find((c) => c.kind === s.kind)!);
    });
    const movedCount = orders.filter((o) => moved.has(o.status)).length;
    if (movedCount) {
      const parts = [...moved].filter(([id]) => usage.status[id]).map(([id, to]) => `${plural(usage.status[id], 'order')} on “${oldById.get(id)!.name}” will move to “${to.name}”`);
      const ok = await confirm({ title: 'Move orders to another status?', body: parts.join('. ') + '.', ok: 'Move and save' });
      if (!ok) return;
    }

    const keptLabels = new Set(cleanLabels.map((l) => l.id));
    const svc = renames('services'), flw = renames('flowers'), pay = renames('paymentMethods'), cat = renames('expenseCategories');
    const changedOrders: Order[] = [];
    orders.forEach((o) => {
      const status = moved.get(o.status)?.id ?? o.status;
      const lbls = o.labels.filter((l) => keptLabels.has(l));
      const serviceType = svc.get(o.serviceType) ?? o.serviceType;
      const flowerType = flw.get(o.flowerType) ?? o.flowerType;
      const payments = o.payments.map((p) => (pay.has(p.method) ? { ...p, method: pay.get(p.method)! } : p));
      if (status !== o.status || lbls.length !== o.labels.length || serviceType !== o.serviceType || flowerType !== o.flowerType || payments.some((p, i) => p !== o.payments[i])) {
        changedOrders.push({ ...o, status, labels: lbls, serviceType, flowerType, payments });
      }
    });
    const changedExpenses: Expense[] = expenses.filter((e) => cat.has(e.category)).map((e) => ({ ...e, category: cat.get(e.category)! }));

    book.saveSettings({
      ...settings, statuses: cleanStatuses, labels: cleanLabels,
      services: vals('services'), flowers: vals('flowers'), paymentMethods: vals('paymentMethods'), expenseCategories: vals('expenseCategories'),
    });
    if (changedOrders.length || changedExpenses.length) book.addMany(changedOrders, changedExpenses);
    toast('Lists saved' + (changedOrders.length ? `, ${plural(changedOrders.length, 'order')} updated` : ''));
    onClose();
  }

  const swatchPicker = (key: string, color: Swatch, onPick: (c: Swatch) => void) => (
    <div className="sw-wrap">
      <button type="button" className={'sw-dot ' + swatchClass(color)} aria-label="Change colour" aria-expanded={picker === key}
        onClick={() => setPicker(picker === key ? null : key)} />
      {picker === key && (
        <div className="sw-pop" role="listbox" aria-label="Colour">
          {SWATCHES.map((c) => (
            <button key={c} type="button" role="option" aria-selected={c === color} aria-label={c} className={'sw-dot ' + swatchClass(c)}
              onClick={() => { onPick(c); setPicker(null); }} />
          ))}
        </div>
      )}
    </div>
  );

  const rowTools = (i: number, total: number, onMove: (d: number) => void, onRemove: () => void, used: number, what: string): ReactNode => (
    <div className="row-tools">
      <span className="used" title={`Used by ${plural(used, what)}`} style={used ? undefined : { visibility: 'hidden' }}>{used}</span>
      <button type="button" className="x" aria-label="Move up" disabled={i === 0} onClick={() => onMove(-1)}>{Icon.up}</button>
      <button type="button" className="x" aria-label="Move down" disabled={i === total - 1} onClick={() => onMove(1)}>{Icon.down}</button>
      <button type="button" className="x" aria-label="Remove" onClick={onRemove}>{Icon.trash}</button>
    </div>
  );

  return (
    <Sheet labelId="l-title" onClose={onClose}>
      <div className="sh-head">
        <div>
          <h2 id="l-title">Statuses, labels and lists</h2>
          <p>Only owners and admins can change these. Everyone on the team picks from them.</p>
        </div>
        <button className="x" aria-label="Close" onClick={onClose}>{Icon.close}</button>
      </div>
      <div className="sh-body">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setPicker(null); setAdding(''); }}>{t.label}</button>
          ))}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{info.hint}</p>
        {error && <div className="gate-err" role="alert">{error}</div>}

        <ul className="edit-list">
          {tab === 'statuses' && statuses.map((s, i) => (
            <li key={s.id} className="edit-row st-row">
              {swatchPicker(s.id, s.color, (c) => setStatuses((x) => x.map((y) => (y.id === s.id ? { ...y, color: c } : y))))}
              <input className="input" aria-label="Status name" value={s.name} maxLength={30}
                onChange={(e) => setStatuses((x) => x.map((y) => (y.id === s.id ? { ...y, name: e.target.value } : y)))} />
              <select className="input kind" aria-label="Counts as" value={s.kind}
                onChange={(e) => setStatuses((x) => x.map((y) => (y.id === s.id ? { ...y, kind: e.target.value as StatusKind } : y)))}>
                {(Object.keys(KIND_LABEL) as StatusKind[]).map((k) => <option key={k} value={k}>Counts as {KIND_LABEL[k].toLowerCase()}</option>)}
              </select>
              {rowTools(i, statuses.length, (d) => setStatuses((x) => move(x, i, d)), () => setStatuses((x) => x.filter((y) => y.id !== s.id)), usage.status[s.id] || 0, 'order')}
            </li>
          ))}
          {tab === 'labels' && labels.map((l, i) => (
            <li key={l.id} className="edit-row">
              {swatchPicker(l.id, l.color, (c) => setLabels((x) => x.map((y) => (y.id === l.id ? { ...y, color: c } : y))))}
              <input className="input" aria-label="Label name" value={l.name} maxLength={30}
                onChange={(e) => setLabels((x) => x.map((y) => (y.id === l.id ? { ...y, name: e.target.value } : y)))} />
              {rowTools(i, labels.length, (d) => setLabels((x) => move(x, i, d)), () => setLabels((x) => x.filter((y) => y.id !== l.id)), usage.label[l.id] || 0, 'order')}
            </li>
          ))}
          {tab === 'labels' && !labels.length && <li className="empty-note">No labels yet. Add one below.</li>}
          {isList && lists[tab as ListKey].map((r, i) => {
            const k = tab as ListKey;
            const setRows = (fn: (rows: Row[]) => Row[]) => setLists((l) => ({ ...l, [k]: fn(l[k]) }));
            return (
              <li key={r.key} className="edit-row">
                <input className="input" aria-label="Name" value={r.value} maxLength={40}
                  onChange={(e) => setRows((rows) => rows.map((x) => (x.key === r.key ? { ...x, value: e.target.value } : x)))} />
                {rowTools(i, lists[k].length, (d) => setRows((rows) => move(rows, i, d)), () => setRows((rows) => rows.filter((x) => x.key !== r.key)),
                  r.orig ? usage.list[k][r.orig] || 0 : 0, k === 'expenseCategories' ? 'expense' : k === 'paymentMethods' ? 'payment' : 'order')}
              </li>
            );
          })}
        </ul>

        <form className="add-row" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input className="input" placeholder={'Add ' + (tab === 'statuses' ? 'a status' : tab === 'labels' ? 'a label' : 'an item') + '…'}
            value={adding} maxLength={40} onChange={(e) => setAdding(e.target.value)} />
          <button className="btn" type="submit" disabled={!adding.trim()}>{Icon.plus}Add</button>
        </form>
      </div>
      <div className="sh-foot">
        <span className="spacer" />
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save}>Save changes</button>
      </div>
    </Sheet>
  );
}
