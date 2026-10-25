import { useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAccess } from '../data/access';
import { useBookActions } from '../data/actions';
import { useBook, type SyncState } from '../data/BookContext';
import { MONTHS } from '../lib/constants';
import { ROLE_INFO } from '../lib/roles';
import { todayISO } from '../lib/dates';
import { num } from '../lib/format';
import { allPayments, isActive, orderBalance } from '../lib/money';
import type { View } from '../lib/types';
import { ExpenseSheet } from '../sheets/ExpenseSheet';
import { ListsSheet } from '../sheets/ListsSheet';
import { OrderSheet } from '../sheets/OrderSheet';
import { SettingsSheet } from '../sheets/SettingsSheet';
import { useUI } from '../ui';
import { CalendarView } from '../views/CalendarView';
import { FinancesView } from '../views/FinancesView';
import { OrdersView } from '../views/OrdersView';
import { TeamView } from '../views/TeamView';
import { BrandLogo, Icon } from './Icons';
import { ThemeButton, ThemeSwitch } from './ThemeToggle';

const VIEWS: { id: View; label: string; icon: ReactNode }[] = [
  { id: 'calendar', label: 'Calendar', icon: Icon.calendar },
  { id: 'orders', label: 'Orders', icon: Icon.orders },
  { id: 'finances', label: 'Finances', icon: Icon.finances },
  { id: 'team', label: 'Team', icon: Icon.team },
];

const SYNC_TEXT: Record<SyncState, string> = {
  synced: 'Saved to your account',
  saving: 'Saving…',
  local: 'Saved in this browser',
  offline: 'Offline, changes will sync later',
  error: 'Last change didn’t save',
};

export function Shell() {
  const book = useBook();
  const ui = useUI();
  const auth = useAuth();
  const { clearAll } = useBookActions();
  const { can, mode, role } = useAccess();
  const views = VIEWS.filter((v) => (v.id === 'finances' ? can.finances : v.id === 'team' ? can.manageTeam && mode === 'cloud' : true));
  const view = views.some((v) => v.id === ui.view) ? ui.view : 'calendar';
  const closeSheet = useCallback(() => ui.setSheet(null), [ui.setSheet]);

  // Close the mobile menu with Escape (sheets handle their own Escape).
  useEffect(() => {
    if (!ui.menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') ui.setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ui.menuOpen, ui.setMenuOpen]);

  const newOrder = () => {
    ui.setMenuOpen(false);
    ui.setSheet({ kind: 'order', id: null, date: ui.view === 'calendar' ? ui.selDate : null });
  };
  const navButtons = views.map((v) => (
    <button key={v.id} aria-current={view === v.id ? 'page' : undefined} onClick={() => ui.go(v.id)}>
      {v.icon}<span>{v.label}</span>
    </button>
  ));

  const s = ui.sheet;
  return (
    <div id="cc-root">
      <aside className={'side' + (ui.menuOpen ? ' open' : '')} aria-label="Main">
        <div className="brand">
          <BrandLogo size={116} />
          <div className="brand-sub">Order book and ledger</div>
        </div>
        {can.editOrders && <button className="side-new" onClick={newOrder}>{Icon.plusBold}New order</button>}
        <nav className="nav">{navButtons}</nav>
        {can.finances && <SideMonth />}
        <div className="side-foot">
          <ThemeSwitch />
          <button onClick={() => { ui.setMenuOpen(false); ui.setSheet({ kind: 'settings' }); }}>{Icon.settings}Settings and data</button>
          {can.manageBusiness && <button onClick={() => { ui.setMenuOpen(false); ui.setSheet({ kind: 'lists' }); }}>{Icon.tag}Statuses and lists</button>}
          {can.manageBusiness && <button onClick={clearAll}>{Icon.bin}Clear all data</button>}
          {book.kind === 'cloud' && auth?.user && (
            <button onClick={() => auth.signOut()}>{Icon.signOut}Sign out</button>
          )}
          <div className="sync" data-s={book.sync} role="status"><i /><span>{SYNC_TEXT[book.sync]}</span></div>
          {book.kind === 'cloud' && auth?.user?.email && <div className="who" title={auth.user.email}>{auth.user.email} · {ROLE_INFO[role].label}</div>}
        </div>
      </aside>
      {ui.menuOpen && <div className="scrim" onClick={() => ui.setMenuOpen(false)} />}

      <div className="main-col">
        <header className="topbar">
          <button className="tb-btn" aria-label="Open menu" onClick={() => ui.setMenuOpen(true)}>{Icon.menu}</button>
          <div className="grow">
            <BrandLogo size={36} />
            <span className="brand-name">The Candle Club</span>
          </div>
          <ThemeButton className="tb-btn" />
          {can.editOrders ? <button className="tb-btn tb-new" aria-label="New order" onClick={newOrder}>{Icon.plusBold}</button> : <span style={{ width: 40 }} />}
        </header>
        <main className="main" tabIndex={-1}>
          {view === 'orders' ? <OrdersView /> : view === 'finances' ? <FinancesView /> : view === 'team' ? <TeamView /> : <CalendarView />}
        </main>
      </div>
      <nav className="tabbar" aria-label="Views" style={{ gridTemplateColumns: `repeat(${views.length}, 1fr)` }}>{navButtons}</nav>

      {s?.kind === 'order' && <OrderSheet key={s.id || 'new'} id={s.id} date={s.date} onClose={closeSheet} />}
      {s?.kind === 'expense' && <ExpenseSheet key={s.id || 'new'} id={s.id} onClose={closeSheet} />}
      {s?.kind === 'settings' && <SettingsSheet onClose={closeSheet} />}
      {s?.kind === 'lists' && can.manageBusiness && <ListsSheet onClose={closeSheet} />}
    </div>
  );
}

function SideMonth() {
  const { orders, money } = useBook();
  const ym = todayISO().slice(0, 7);
  const monthOrders = orders.filter((o) => isActive(o) && (o.eventDate || '').slice(0, 7) === ym);
  const booked = monthOrders.reduce((s, o) => s + num(o.totalPrice), 0);
  const collected = allPayments(orders).filter((p) => (p.date || '').slice(0, 7) === ym).reduce((s, p) => s + p.amount, 0);
  const toCollect = monthOrders.reduce((s, o) => s + Math.max(0, orderBalance(o)), 0);
  return (
    <section className="side-month" aria-live="polite">
      <h2>{MONTHS[new Date().getMonth()]} at a glance</h2>
      <div className="side-stat">Events<b>{monthOrders.length}</b></div>
      <div className="side-stat">Booked<b>{money(booked)}</b></div>
      <div className="side-stat">Collected<b>{money(collected)}</b></div>
      <div className="side-stat">Still to collect<b>{money(toCollect)}</b></div>
    </section>
  );
}
