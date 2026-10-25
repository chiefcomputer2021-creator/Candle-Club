import { useMemo } from 'react';
import { LabelTags, PayPill } from '../components/Bits';
import { CompleteButton, StatusMenu } from '../components/QuickComplete';
import { Icon } from '../components/Icons';
import { useAccess } from '../data/access';
import { useBook } from '../data/BookContext';
import { fmtDate, relDay, todayISO } from '../lib/dates';
import { exportOrdersCSV } from '../lib/exports';
import { num, plural } from '../lib/format';
import { isActive, orderBalance, orderPaid, paymentStatusLabel } from '../lib/money';
import type { Order } from '../lib/types';
import { useUI, type Filters, type When } from '../ui';
import { EmptyBook } from './CalendarView';

const WHEN: [When, string][] = [['upcoming', 'Upcoming'], ['past', 'Past'], ['due', 'Owing'], ['all', 'All']];

function filterOrders(orders: Order[], f: Filters): Order[] {
  const t = todayISO(), q = f.q.trim().toLowerCase();
  return orders.filter((o) => {
    if (q && !String(o.clientName || '').toLowerCase().includes(q)) return false;
    if (f.status && o.status !== f.status) return false;
    if (f.service && o.serviceType !== f.service) return false;
    if (f.label && !o.labels.includes(f.label)) return false;
    if (f.when === 'upcoming' && o.eventDate < t) return false;
    if (f.when === 'past' && o.eventDate >= t) return false;
    if (f.when === 'due' && !(isActive(o) && orderBalance(o) > 0)) return false;
    return true;
  }).sort((a, b) => (f.when === 'past' ? b.eventDate.localeCompare(a.eventDate) : a.eventDate.localeCompare(b.eventDate)));
}

export function OrdersView() {
  const book = useBook();
  const { orders, money, settings } = book;
  const ui = useUI();
  const { can } = useAccess();
  const f = ui.filters;
  const list = useMemo(() => filterOrders(orders, f), [orders, f]);
  const set = (patch: Partial<Filters>) => ui.setFilters((cur) => ({ ...cur, ...patch }));
  const openOrder = (id: string) => ui.setSheet({ kind: 'order', id });

  let sumTotal = 0, sumPaid = 0, sumBal = 0;
  list.forEach((o) => { if (!isActive(o)) return; sumTotal += num(o.totalPrice); sumPaid += orderPaid(o); sumBal += Math.max(0, orderBalance(o)); });

  const head = (
    <div className="head">
      <div>
        <h1 className="title">Orders</h1>
        <p className="subline">{plural(orders.length, 'order')} in your book. Click a row to open it.</p>
      </div>
      <div className="head-actions">
        {can.finances && orders.length > 0 && <button className="btn" onClick={() => exportOrdersCSV(orders, book.labelNames)}>{Icon.download}Export CSV</button>}
        {can.editOrders && <button className="btn primary" onClick={() => ui.setSheet({ kind: 'order', id: null })}>{Icon.plus}New order</button>}
      </div>
    </div>
  );

  if (!orders.length) return <>{head}<EmptyBook /></>;

  return (
    <>
      {head}
      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Search by client</span>
          {Icon.search}
          <input className="input" type="search" placeholder="Search by client name" value={f.q} autoComplete="off" onChange={(e) => set({ q: e.target.value })} />
        </label>
        <div className="seg" role="group" aria-label="Show">
          {WHEN.map(([k, label]) => <button key={k} aria-pressed={f.when === k} onClick={() => set({ when: k })}>{label}</button>)}
        </div>
        <select className="input" aria-label="Filter by status" value={f.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">All statuses</option>
          {settings.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" aria-label="Filter by service" value={f.service} onChange={(e) => set({ service: e.target.value })}>
          <option value="">All services</option>
          {settings.services.map((s) => <option key={s}>{s}</option>)}
        </select>
        {settings.labels.length > 0 && (
          <select className="input" aria-label="Filter by label" value={f.label} onChange={(e) => set({ label: e.target.value })}>
            <option value="">All labels</option>
            {settings.labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      <div className="summary-strip">
        <span>Showing<b>{list.length}</b></span>
        <span>Value<b>{money(sumTotal)}</b></span>
        <span>Received<b>{money(sumPaid)}</b></span>
        <span>Owing<b style={{ color: 'var(--rose)' }}>{money(sumBal)}</b></span>
      </div>

      <div className="tbl-wrap">
        {!list.length ? (
          <div className="empty">
            <h3>No orders match</h3>
            <p>Try a different search, or switch to All.</p>
            <div className="row"><button className="btn" onClick={() => ui.setFilters({ q: '', status: '', service: '', label: '', when: 'all' })}>Clear filters</button></div>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Event date</th><th>Client</th><th>Service</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th><th>Payment</th><th>Status</th></tr>
            </thead>
            <tbody>
              {list.map((o) => {
                const bal = orderBalance(o);
                return (
                  <tr
                    key={o.id}
                    tabIndex={0}
                    onClick={() => openOrder(o.id)}
                    onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openOrder(o.id); } }}
                  >
                    <td className="date c-date">{fmtDate(o.eventDate)}<small>{relDay(o.eventDate)}</small></td>
                    <td className="client c-client"><b>{o.clientName}</b>{o.phone && <small>{o.phone}</small>}<LabelTags ids={o.labels} className="sm" /></td>
                    <td className="c-service">{o.serviceType}{o.flowerType && <> <span className="faint">({o.flowerType})</span></>}</td>
                    <td className="num c-total">{money(o.totalPrice)}</td>
                    <td className="num c-paid">{money(orderPaid(o))}</td>
                    <td className={'num c-bal ' + (bal > 0 && isActive(o) ? 'bal-due' : 'bal-zero')}>{money(bal)}</td>
                    <td className="c-pay"><PayPill label={paymentStatusLabel(o)} /></td>
                    <td className="c-status"><div className="status-cell"><StatusMenu order={o} /><CompleteButton order={o} /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
