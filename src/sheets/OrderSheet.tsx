import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useConfirm } from '../components/Confirm';
import { Icon } from '../components/Icons';
import { useQuickStatus } from '../components/QuickComplete';
import { useToast } from '../components/Toasts';
import { useAccess } from '../data/access';
import { useBook } from '../data/BookContext';
import { fmtFull, fmtShort, parseISO, todayISO } from '../lib/dates';
import { downloadInvoice } from '../lib/exports';
import { num, plural, uid } from '../lib/format';
import { newLabel, statusDef, swatchClass, SWATCHES } from '../lib/lists';
import { isActive, isDone, orderBalance, orderPaid } from '../lib/money';
import type { Order } from '../lib/types';
import { useUI } from '../ui';
import { Sheet } from './Sheet';

interface Form {
  clientName: string; phone: string; email: string; eventDate: string; serviceType: string;
  flowerType: string; status: string; labels: string[]; notes: string; totalPrice: string;
}

/** The current list plus the order's existing value if it has since been removed from the list. */
const withCurrent = (list: string[], v: string) => (v && !list.includes(v) ? [...list, v] : list);
const defaultMethod = (methods: string[]) => (methods.includes('UPI') ? 'UPI' : methods[0] || '');

export function OrderSheet({ id, date, onClose }: { id: string | null; date?: string | null; onClose: () => void }) {
  const book = useBook();
  const ui = useUI();
  const toast = useToast();
  const confirm = useConfirm();
  const { money, settings } = book;
  const { can } = useAccess();
  const live = id ? book.orders.find((o) => o.id === id) || null : null;
  const isNew = !id;
  const readOnly = !can.editOrders;
  const { complete } = useQuickStatus();
  const firstOpen = settings.statuses.find((s) => s.kind === 'open') || settings.statuses[0];

  const [form, setForm] = useState<Form>(() => live ? {
    clientName: live.clientName, phone: live.phone, email: live.email, eventDate: live.eventDate, serviceType: live.serviceType,
    flowerType: live.flowerType, status: live.status, labels: live.labels, notes: live.notes, totalPrice: live.totalPrice ? String(live.totalPrice) : '',
  } : {
    clientName: '', phone: '', email: '', eventDate: date || todayISO(), serviceType: settings.services[0] || '',
    flowerType: settings.flowers[0] || '', status: firstOpen.id, labels: [], notes: '', totalPrice: '',
  });
  const [deposit, setDeposit] = useState('');
  const [depositMethod, setDepositMethod] = useState(() => defaultMethod(settings.paymentMethods));
  const [newLabelName, setNewLabelName] = useState<string | null>(null);
  const labelOpen = useRef(false);
  const [err, setErr] = useState({ name: false, date: false });

  // The order was deleted elsewhere (another tab or device) while open.
  useEffect(() => { if (id && !live) onClose(); }, [id, live, onClose]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  /** Validated form values, or null (with errors shown) if something required is missing. */
  function readFields() {
    const clientName = form.clientName.trim();
    const bad = { name: !clientName, date: !form.eventDate };
    setErr(bad);
    if (bad.name || bad.date) {
      setTimeout(() => document.querySelector<HTMLElement>('.sheet .field.invalid .input')?.focus(), 0);
      return null;
    }
    return {
      clientName, phone: form.phone.trim(), email: form.email.trim(), eventDate: form.eventDate, serviceType: form.serviceType,
      flowerType: form.flowerType, status: form.status, labels: form.labels, notes: form.notes.trim(), totalPrice: num(form.totalPrice),
    };
  }

  /** Saves any edits in the form and marks the order complete in one go. */
  async function markComplete() {
    if (!live) return;
    const fields = readFields();
    if (!fields) return;
    if (await complete({ ...live, ...fields })) onClose();
  }

  function toggleLabel(lid: string) {
    set('labels', form.labels.includes(lid) ? form.labels.filter((x) => x !== lid) : [...form.labels, lid]);
  }

  function addLabel() {
    // Enter and the blur that follows both land here; only act once per open input.
    if (!labelOpen.current) return;
    labelOpen.current = false;
    const name = (newLabelName || '').trim();
    if (!name) { setNewLabelName(null); return; }
    const existing = settings.labels.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (existing) { if (!form.labels.includes(existing.id)) toggleLabel(existing.id); setNewLabelName(null); return; }
    const label = newLabel(name, SWATCHES[(settings.labels.length + 5) % SWATCHES.length]);
    book.saveSettings({ ...settings, labels: [...settings.labels, label] });
    set('labels', [...form.labels, label.id]);
    setNewLabelName(null);
  }

  function save(e?: FormEvent) {
    e?.preventDefault();
    if (readOnly) return;
    const fields = readFields();
    if (!fields) return;
    const clientName = fields.clientName;
    if (live) {
      book.saveOrder({ ...live, ...fields });
      toast('Order saved');
    } else {
      const order: Order = { id: uid('ord'), createdAt: new Date().toISOString(), payments: [], ...fields };
      const dep = num(deposit);
      if (dep > 0) order.payments.push({ id: uid('pay'), date: todayISO(), amount: dep, method: depositMethod });
      book.saveOrder(order);
      if (ui.view === 'calendar') { const d = parseISO(fields.eventDate); ui.setCal(d.getFullYear(), d.getMonth()); }
      toast('Order created for ' + clientName);
    }
    onClose();
  }

  async function remove() {
    if (!live) return;
    const ok = await confirm({ title: 'Delete this order?', body: 'The order for ' + live.clientName + ' and its ' + plural(live.payments.length, 'payment') + ' (' + money(orderPaid(live)) + ') will be removed from your book and your finances.', ok: 'Delete order', danger: true });
    if (!ok) return;
    book.deleteOrder(live.id);
    onClose();
    toast('Order deleted');
  }

  return (
    <Sheet labelId="o-title" onClose={onClose}>
      <div className="sh-head">
        <div>
          <h2 id="o-title">{live ? live.clientName : 'New order'}</h2>
          <p>{live ? live.serviceType + ' on ' + fmtFull(live.eventDate) + (readOnly ? ' · view only' : '') : 'Fields marked with a star are required.'}</p>
        </div>
        <div className="sh-head-actions">
          {live && can.editOrders && isActive(live) && !isDone(live) && (
            <button className="btn sm complete-btn" onClick={markComplete}>{Icon.check}Mark complete</button>
          )}
          <button className="x" aria-label="Close" onClick={onClose}>{Icon.close}</button>
        </div>
      </div>

      <form className="sh-body" id="order-form" noValidate onSubmit={save}>
        {live && <MoneySummary o={live} />}
        <fieldset className="fs-wrap" disabled={readOnly}>

        <div className="fs">
          <h3>Client</h3>
          <label className={'field' + (err.name ? ' invalid' : '')}>
            <span>Client name <em>*</em></span>
            <input className="input" value={form.clientName} autoComplete="off" placeholder="e.g. Joseph and Maria D’Souza"
              onChange={(e) => { set('clientName', e.target.value); setErr((x) => ({ ...x, name: false })); }} />
            <small className="err">Add the client’s name.</small>
          </label>
          <div className="g2">
            <label className="field"><span>Phone</span><input className="input" type="tel" value={form.phone} autoComplete="off" onChange={(e) => set('phone', e.target.value)} /></label>
            <label className="field"><span>Email</span><input className="input" type="email" value={form.email} autoComplete="off" onChange={(e) => set('email', e.target.value)} /></label>
          </div>
        </div>

        <div className="fs">
          <h3>The job</h3>
          <div className="g2">
            <label className={'field' + (err.date ? ' invalid' : '')}>
              <span>Event date <em>*</em></span>
              <input className="input" type="date" value={form.eventDate} onChange={(e) => { set('eventDate', e.target.value); setErr((x) => ({ ...x, date: false })); }} />
              <small className="err">Pick the event date.</small>
            </label>
            <label className="field">
              <span>Service</span>
              <select className="input" value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)}>
                {withCurrent(settings.services, form.serviceType).map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="field">
            <span>Flowers</span>
            <div className="pills" role="radiogroup" aria-label="Flowers">
              {withCurrent(settings.flowers, form.flowerType).map((s) => (
                <label key={s} className="pill-opt" style={{ ['--c' as string]: 'var(--accent)' }}>
                  <input type="radio" name="o-flower" value={s} checked={form.flowerType === s} onChange={() => set('flowerType', s)} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Status</span>
            <div className="pills" role="radiogroup" aria-label="Status">
              {settings.statuses.concat(settings.statuses.some((s) => s.id === form.status) ? [] : [statusDef(form.status)]).map((s) => (
                <label key={s.id} className={'pill-opt ' + swatchClass(s.color)}>
                  <input type="radio" name="o-status" value={s.id} checked={form.status === s.id} onChange={() => set('status', s.id)} />
                  <span><i className="flame" />{s.name}</span>
                </label>
              ))}
            </div>
          </div>
          {(settings.labels.length > 0 || can.manageBusiness) && (
            <div className="field">
              <span>Labels</span>
              <div className="pills" role="group" aria-label="Labels">
                {settings.labels.map((l) => (
                  <label key={l.id} className={'pill-opt ' + swatchClass(l.color)}>
                    <input type="checkbox" checked={form.labels.includes(l.id)} onChange={() => toggleLabel(l.id)} />
                    <span>{Icon.tag}{l.name}</span>
                  </label>
                ))}
                {can.manageBusiness && (newLabelName === null ? (
                  <button type="button" className="pill-add" onClick={() => { labelOpen.current = true; setNewLabelName(''); }}>{Icon.plus}New label</button>
                ) : (
                  <span className="pill-new">
                    <input className="input" autoFocus placeholder="Label name" value={newLabelName} maxLength={30}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } if (e.key === 'Escape') { e.stopPropagation(); labelOpen.current = false; setNewLabelName(null); } }}
                      onBlur={addLabel} />
                  </span>
                ))}
              </div>
            </div>
          )}
          <label className="field">
            <span>Notes</span>
            <textarea className="input" value={form.notes} placeholder="Colours, venue, timings, special requests" onChange={(e) => set('notes', e.target.value)} />
          </label>
        </div>

        <div className="fs">
          <h3>Price</h3>
          <div className="g2">
            <label className="field">
              <span>Agreed price</span>
              <div className="prefix"><b>{settings.currency}</b>
                <input className="input money" type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={form.totalPrice} onChange={(e) => set('totalPrice', e.target.value)} />
              </div>
            </label>
            {isNew ? (
              <label className="field">
                <span>Deposit received now</span>
                <div className="prefix"><b>{settings.currency}</b>
                  <input className="input money" type="number" inputMode="decimal" min="0" step="any" placeholder="Optional" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
                </div>
              </label>
            ) : <div />}
          </div>
          {isNew && (
            <label className="field">
              <span>Deposit paid by</span>
              <select className="input" value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)}>
                {settings.paymentMethods.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
          )}
        </div>

        </fieldset>
        {live && <Payments o={live} />}
      </form>

      <div className="sh-foot">
        {live && can.deleteOrders && <button className="btn danger" onClick={remove}>{Icon.trash}Delete</button>}
        {live && can.editOrders && <button className="btn ghost" onClick={() => downloadInvoice(live, settings)}>{Icon.download}Invoice</button>}
        <span className="spacer" />
        <button className="btn" onClick={onClose}>{readOnly ? 'Close' : 'Cancel'}</button>
        {!readOnly && <button className="btn primary" type="submit" form="order-form">{isNew ? 'Create order' : 'Save changes'}</button>}
      </div>
    </Sheet>
  );
}

function MoneySummary({ o }: { o: Order }) {
  const { money } = useBook();
  const total = num(o.totalPrice), paid = orderPaid(o), bal = orderBalance(o);
  const pct = total > 0 ? Math.min(100, paid / total * 100) : (paid > 0 ? 100 : 0);
  return (
    <div className="money-sum">
      <div className="ms-row">
        <div><small>Agreed</small><b>{money(total)}</b></div>
        <div className="ok"><small>Received</small><b>{money(paid)}</b></div>
        <div className={bal > 0 ? 'due' : 'ok'}><small>{bal < 0 ? 'Overpaid' : 'Balance'}</small><b>{money(Math.abs(bal))}</b></div>
      </div>
      <div className="progress" aria-hidden="true"><i style={{ width: pct.toFixed(1) + '%' }} /></div>
    </div>
  );
}

/** Payments are saved straight away, separately from the order fields above. */
function Payments({ o }: { o: Order }) {
  const book = useBook();
  const toast = useToast();
  const confirm = useConfirm();
  const { money, settings } = book;
  const { can } = useAccess();
  const [amt, setAmt] = useState('');
  const [method, setMethod] = useState(() => defaultMethod(settings.paymentMethods));
  const [date, setDate] = useState(todayISO);
  const [bad, setBad] = useState(false);
  const pays = o.payments.slice().sort((a, b) => a.date.localeCompare(b.date));
  const bal = orderBalance(o);

  function add() {
    const amount = num(amt);
    if (amount <= 0) { setBad(true); document.getElementById('p-amt')?.focus(); return; }
    book.saveOrder({ ...o, payments: [...o.payments, { id: uid('pay'), date: date || todayISO(), amount, method }] });
    setAmt('');
    toast(money(amount) + ' recorded from ' + o.clientName);
  }

  async function removePay(pid: string) {
    const p = o.payments.find((x) => x.id === pid);
    const ok = await confirm({ title: 'Remove this payment?', body: money(p ? p.amount : 0) + ' will be taken off this order and out of your income.', ok: 'Remove payment', danger: true });
    if (!ok) return;
    book.saveOrder({ ...o, payments: o.payments.filter((x) => x.id !== pid) });
    toast('Payment removed');
  }

  return (
    <div className="fs">
      <h3>Payments <span className="mono faint" style={{ fontSize: 13 }}>{plural(pays.length, 'payment')}</span></h3>
      <ul className="paylist">
        {pays.length ? pays.map((p) => (
          <li key={p.id}>
            <span className="d">{fmtShort(p.date)}</span>
            <span>{p.method}</span>
            <span className="a">+{money(p.amount)}</span>
            {can.deleteOrders ? <button type="button" className="x" aria-label="Remove payment" onClick={() => removePay(p.id)}>{Icon.close}</button> : <span />}
          </li>
        )) : <li className="none-row"><span className="none">No payments yet.</span></li>}
      </ul>
      {can.editOrders && <div className="addpay">
        <div className="g3">
          <label className={'field' + (bad ? ' invalid' : '')}>
            <span>Amount</span>
            <div className="prefix"><b>{settings.currency}</b>
              <input id="p-amt" className="input money" type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={amt}
                onChange={(e) => { setAmt(e.target.value); setBad(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
            </div>
          </label>
          <label className="field">
            <span>Method</span>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
              {settings.paymentMethods.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="field"><span>Date</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <div className="row">
          {bal > 0 && <button type="button" className="btn sm ghost" onClick={() => { setAmt(String(bal)); setBad(false); document.getElementById('p-amt')?.focus(); }}>Fill balance ({money(bal)})</button>}
          <button type="button" className="btn sm primary" onClick={add}>{Icon.plus}Record payment</button>
        </div>
      </div>}
    </div>
  );
}
