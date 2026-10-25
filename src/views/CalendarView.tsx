import { useMemo, type KeyboardEvent } from 'react';
import { CandleBig, Icon } from '../components/Icons';
import { CompleteButton } from '../components/QuickComplete';
import { LabelTags } from '../components/Bits';
import { DOW, MONTHS } from '../lib/constants';
import { statusDef, statusKind, swatchClass } from '../lib/lists';
import { useAccess } from '../data/access';
import { useBook } from '../data/BookContext';
import { useBookActions } from '../data/actions';
import { readLocalBook } from '../data/localStore';
import { addDays, fmtLong, iso, pad, parseISO, relDay, todayISO } from '../lib/dates';
import { num, plural } from '../lib/format';
import { isActive, orderBalance, paymentStatusLabel } from '../lib/money';
import type { Order } from '../lib/types';
import { useUI } from '../ui';

export function CalendarView() {
  const book = useBook();
  const ui = useUI();
  const { can } = useAccess();
  const { orders, settings, money } = book;
  const y = ui.calYear, m = ui.calMonth, ws = +settings.weekStart || 0;
  const t = todayISO();

  const byDate = useMemo(() => {
    const map: Record<string, Order[]> = {};
    orders.forEach((o) => { if (o.eventDate) (map[o.eventDate] = map[o.eventDate] || []).push(o); });
    Object.values(map).forEach((list) => list.sort((a, b) =>
      Number(statusKind(a.status) === 'cancelled') - Number(statusKind(b.status) === 'cancelled') || String(a.clientName).localeCompare(b.clientName)));
    return map;
  }, [orders]);

  const ym = y + '-' + pad(m + 1);
  const monthOrders = orders.filter((o) => isActive(o) && (o.eventDate || '').slice(0, 7) === ym);
  const monthValue = monthOrders.reduce((s, o) => s + num(o.totalPrice), 0);
  const offset = (new Date(y, m, 1).getDay() - ws + 7) % 7;

  const newOrder = (date?: string | null) => ui.setSheet({ kind: 'order', id: null, date });
  const openOrder = (id: string) => ui.setSheet({ kind: 'order', id });

  function dayActivate(ds: string) {
    const narrow = window.matchMedia('(max-width: 720px)').matches;
    const has = orders.some((o) => o.eventDate === ds);
    if (narrow || !can.editOrders || (has && ui.selDate === ds)) {
      ui.setSelDate(ds);
      const d = parseISO(ds);
      if (d.getMonth() !== m) ui.setCal(d.getFullYear(), d.getMonth());
      if (narrow) setTimeout(() => document.querySelector('.sel-day')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
      return;
    }
    newOrder(ds);
  }

  const cells = [];
  for (let c = 0; c < 42; c++) {
    const d = new Date(y, m, 1 - offset + c);
    const ds = iso(d);
    const list = byDate[ds] || [];
    const cls = 'day' + (d.getMonth() !== m ? ' out' : '') + (ds === t ? ' today' : '') + (ui.selDate === ds ? ' sel' : '');
    const label = fmtLong(ds) + (list.length ? ', ' + plural(list.length, 'order') : '');
    cells.push(
      <div
        key={ds}
        className={cls}
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => dayActivate(ds)}
        onKeyDown={(e: KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); dayActivate(ds); } }}
      >
        <div className="day-top">
          <span className="dnum">{d.getDate()}</span>
          <svg className="day-add" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12" /></svg>
        </div>
        {list.slice(0, 3).map((o) => (
          <button
            key={o.id}
            className={'chip ' + swatchClass(statusDef(o.status).color) + (statusKind(o.status) === 'cancelled' ? ' is-cancelled' : '')}
            title={o.clientName + ', ' + o.serviceType + ' (' + statusDef(o.status).name + ')'}
            onClick={(e) => { e.stopPropagation(); openOrder(o.id); }}
          >
            <i className="flame" /><span>{o.clientName}</span>
          </button>
        ))}
        {list.length > 3 && (
          <button className="more" onClick={(e) => { e.stopPropagation(); ui.setSelDate(ds); }}>+{list.length - 3} more</button>
        )}
        {list.length > 0 && (
          <div className="dots" aria-hidden="true">
            {list.slice(0, 4).map((o) => <i key={o.id} className={'flame ' + swatchClass(statusDef(o.status).color)} />)}
          </div>
        )}
      </div>,
    );
  }

  return (
    <>
      <div className="head">
        <div>
          <h1 className="title">{MONTHS[m]} <span className="yr">{y}</span></h1>
          <p className="subline">
            {monthOrders.length
              ? <>{plural(monthOrders.length, 'event')} booked this month, worth <span className="mono">{money(monthValue)}</span>.</>
              : can.editOrders ? 'Nothing booked this month yet. Click any day to add an order.' : 'Nothing booked this month yet.'}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn icon" aria-label="Previous month" onClick={() => ui.setCal(y, m - 1)}>{Icon.left}</button>
          <button className="btn" onClick={() => { const n = new Date(); ui.setCal(n.getFullYear(), n.getMonth()); ui.setSelDate(null); }}>Today</button>
          <button className="btn icon" aria-label="Next month" onClick={() => ui.setCal(y, m + 1)}>{Icon.right}</button>
          {can.editOrders && <button className="btn primary" onClick={() => newOrder(ui.selDate)}>{Icon.plus}New order</button>}
        </div>
      </div>

      <div className="cal-wrap">
        <div>
          <div className="cal">
            <div className="cal-dow">
              {Array.from({ length: 7 }, (_, i) => {
                const dn = DOW[(i + ws) % 7];
                return <span key={dn}><span aria-hidden="true">{dn.slice(0, 3)}</span><span className="sr-only">{dn}</span></span>;
              })}
            </div>
            <div className="cal-grid">{cells}</div>
          </div>
          <div className="legend">
            {settings.statuses.map((s) => <span key={s.id} className={swatchClass(s.color)}><i className="flame" />{s.name}</span>)}
          </div>
        </div>
        <aside className="rail">
          <RailSelected />
          <RailUpcoming />
          <RailDue />
        </aside>
      </div>
      {!orders.length && <EmptyBook />}
    </>
  );
}

function AgItem({ o, mode }: { o: Order; mode?: 'due' }) {
  const { money } = useBook();
  const ui = useUI();
  const d = parseISO(o.eventDate);
  const bal = orderBalance(o);
  const owing = bal > 0 && isActive(o);
  return (
    <li className="ag-row">
      <button className="ag" onClick={() => ui.setSheet({ kind: 'order', id: o.id })}>
        <div className="ag-date"><b>{d.getDate()}</b><small>{MONTHS[d.getMonth()].slice(0, 3)}</small></div>
        <div style={{ minWidth: 0 }}>
          <div className={'ag-name ' + swatchClass(statusDef(o.status).color)}><i className="flame" /><span>{o.clientName}</span></div>
          <div className="ag-meta">{o.serviceType}{mode === 'due' ? '' : ', ' + relDay(o.eventDate)}</div>
          <LabelTags ids={o.labels} className="sm" />
        </div>
        {mode === 'due'
          ? <div className="ag-amt due">{money(bal)}<small>{relDay(o.eventDate)}</small></div>
          : <div className={'ag-amt' + (owing ? ' due' : '')}>
              {owing ? <>{money(bal)}<small>to collect</small></> : <>{money(o.totalPrice)}<small>{paymentStatusLabel(o)}</small></>}
            </div>}
      </button>
      <CompleteButton order={o} />
    </li>
  );
}

function RailSelected() {
  const { orders } = useBook();
  const { can } = useAccess();
  const ui = useUI();
  if (!ui.selDate) return null;
  const list = orders.filter((o) => o.eventDate === ui.selDate);
  return (
    <section className="panel sel-day">
      <div className="panel-h">
        <h3>{fmtLong(ui.selDate)}</h3>
        <button className="x" aria-label="Close day" onClick={() => ui.setSelDate(null)}>{Icon.close}</button>
      </div>
      <div className="panel-b">
        {list.length
          ? <ul className="agenda">{list.map((o) => <AgItem key={o.id} o={o} />)}</ul>
          : <p className="empty-note">No orders on this day.</p>}
        {can.editOrders && <button className="btn sm" style={{ marginTop: 10 }} onClick={() => ui.setSheet({ kind: 'order', id: null, date: ui.selDate })}>{Icon.plus}Add order on this day</button>}
      </div>
    </section>
  );
}

function RailUpcoming() {
  const { orders } = useBook();
  const t = todayISO(), end = addDays(t, 14);
  const list = orders.filter((o) => isActive(o) && o.eventDate >= t && o.eventDate <= end)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  return (
    <section className="panel">
      <div className="panel-h"><h3>Next two weeks</h3><span className="faint" style={{ fontSize: 12.5 }}>{plural(list.length, 'event')}</span></div>
      <div className="panel-b">
        {list.length ? (
          <>
            <ul className="agenda">{list.slice(0, 8).map((o) => <AgItem key={o.id} o={o} />)}</ul>
            {list.length > 8 && <p className="empty-note">+{list.length - 8} more in the Orders view.</p>}
          </>
        ) : <p className="empty-note">No events in the next 14 days.</p>}
      </div>
    </section>
  );
}

function RailDue() {
  const { orders, money } = useBook();
  const soon = addDays(todayISO(), 7);
  const list = orders.filter((o) => isActive(o) && orderBalance(o) > 0 && o.eventDate && o.eventDate <= soon)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const total = list.reduce((s, o) => s + orderBalance(o), 0);
  return (
    <section className="panel">
      <div className="panel-h"><h3>Balances to collect</h3><span className="mono" style={{ fontSize: 13, color: 'var(--rose)' }}>{list.length ? money(total) : ''}</span></div>
      <div className="panel-b">
        {list.length
          ? <ul className="agenda">{list.slice(0, 6).map((o) => <AgItem key={o.id} o={o} mode="due" />)}</ul>
          : <p className="empty-note">Nothing owed on past or this week’s events.</p>}
      </div>
    </section>
  );
}

export function EmptyBook() {
  const book = useBook();
  const ui = useUI();
  const { loadSample, importLocal } = useBookActions();
  const { can } = useAccess();
  // After switching on Firebase, offer to bring over anything entered in local-only mode.
  const local = book.kind === 'cloud' ? readLocalBook() : null;
  const hasLocal = can.manageBusiness && !!local && (local.orders.length > 0 || local.expenses.length > 0);
  if (!can.editOrders) {
    return (
      <div className="panel empty" style={{ marginTop: 22 }}>
        <CandleBig />
        <h3>No orders yet</h3>
        <p>Orders your team adds will show up here.</p>
      </div>
    );
  }
  return (
    <div className="panel empty" style={{ marginTop: 22 }}>
      <CandleBig />
      <h3>Your order book is empty</h3>
      <p>
        {hasLocal
          ? `This browser has ${plural(local!.orders.length, 'order')} saved from before you signed in. Import them into your account, or start fresh.`
          : 'Add your first order to see it on the calendar, or load a set of sample orders to explore how everything fits together.'}
      </p>
      <div className="row">
        {hasLocal && <button className="btn primary" onClick={() => importLocal(local!)}>Import from this browser</button>}
        <button className={'btn' + (hasLocal ? '' : ' primary')} onClick={() => ui.setSheet({ kind: 'order', id: null })}>{Icon.plus}New order</button>
        {can.manageBusiness && <button className="btn" onClick={loadSample}>Load sample data</button>}
      </div>
    </div>
  );
}

