import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useAccess } from '../data/access';
import { useBook } from '../data/BookContext';
import { todayISO } from '../lib/dates';
import { uid } from '../lib/format';
import { firstOfKind, statusDef, statusName, swatchClass } from '../lib/lists';
import { isActive, isDone, orderBalance } from '../lib/money';
import type { Order } from '../lib/types';
import { Icon } from './Icons';
import { useToast } from './Toasts';

interface QuickCtx {
  /** Sets an order's status in one step. Resolves true once saved, false if cancelled. */
  setStatus(o: Order, statusId: string): Promise<boolean>;
  /** Moves the order to the first "done" status. */
  complete(o: Order): Promise<boolean>;
}
const Ctx = createContext<QuickCtx | null>(null);
export function useQuickStatus(): QuickCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useQuickStatus must be used inside QuickStatusProvider');
  return c;
}

type Pending = { order: Order; statusId: string; resolve: (v: boolean) => void };

export function QuickStatusProvider({ children }: { children: ReactNode }) {
  const book = useBook();
  const { can } = useAccess();
  const toast = useToast();
  const [pending, setPending] = useState<Pending | null>(null);

  const apply = useCallback((o: Order, statusId: string, payAmount = 0, method = '') => {
    const before = o;
    const payments = payAmount > 0 ? [...o.payments, { id: uid('pay'), date: todayISO(), amount: payAmount, method }] : o.payments;
    book.saveOrder({ ...o, status: statusId, payments });
    const msg = o.clientName + ': ' + statusName(statusId) + (payAmount > 0 ? ', ' + book.money(payAmount) + ' recorded' : '');
    // Staff can't remove payments, so there's no undo once one has been recorded on their behalf.
    const undoable = payAmount <= 0 || can.deleteOrders;
    toast(msg, undoable ? { label: 'Undo', onClick: () => book.saveOrder(before) } : undefined);
  }, [book, can.deleteOrders, toast]);

  const setStatus = useCallback((o: Order, statusId: string) => new Promise<boolean>((resolve) => {
    if (statusDef(statusId).kind === 'done' && !isDone(o) && orderBalance(o) > 0) {
      setPending({ order: o, statusId, resolve });
      return;
    }
    apply(o, statusId);
    resolve(true);
  }), [apply]);

  const complete = useCallback((o: Order) => {
    const done = firstOfKind('done');
    return done ? setStatus(o, done.id) : Promise.resolve(false);
  }, [setStatus]);

  return (
    <Ctx.Provider value={{ setStatus, complete }}>
      {children}
      {pending && (
        <BalanceDialog
          p={pending}
          onDone={(v, amount, method) => {
            if (v) apply(pending.order, pending.statusId, amount, method);
            pending.resolve(v);
            setPending(null);
          }}
        />
      )}
    </Ctx.Provider>
  );
}

function BalanceDialog({ p, onDone }: { p: Pending; onDone: (ok: boolean, amount?: number, method?: string) => void }) {
  const { money, settings } = useBook();
  const bal = orderBalance(p.order);
  const methods = settings.paymentMethods;
  const [method, setMethod] = useState(methods.includes('UPI') ? 'UPI' : methods[0] || '');
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { okRef.current?.focus(); }, []);
  return (
    <div className="overlay center" data-confirm onClick={(e) => { if (e.target === e.currentTarget) onDone(false); }}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onDone(false); } }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="qc-t">
        <h2 id="qc-t">Mark {p.order.clientName} as {statusName(p.statusId).toLowerCase()}?</h2>
        <p><b className="mono" style={{ color: 'var(--rose)' }}>{money(bal)}</b> is still owed on this order. Was it paid?</p>
        <label className="field" style={{ marginBottom: 18 }}>
          <span>Paid by</span>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {methods.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <div className="row qc-row">
          <button className="btn ghost" onClick={() => onDone(false)}>Cancel</button>
          <button className="btn" onClick={() => onDone(true, 0)}>Still owed</button>
          <button ref={okRef} className="btn primary" onClick={() => onDone(true, bal, method)}>Paid {money(bal)}</button>
        </div>
      </div>
    </div>
  );
}

/** Round tick that completes an order without opening it. */
export function CompleteButton({ order }: { order: Order }) {
  const { can } = useAccess();
  const { complete } = useQuickStatus();
  if (!can.editOrders || !isActive(order) || isDone(order)) return null;
  return (
    <button className="tick" title="Mark complete" aria-label={'Mark ' + order.clientName + ' complete'}
      onClick={(e) => { e.stopPropagation(); complete(order); }}
      onKeyDown={(e) => e.stopPropagation()}>
      {Icon.check}
    </button>
  );
}

/** Status badge that opens a menu to change the status in place (read-only badge for viewers). */
export function StatusMenu({ order }: { order: Order }) {
  const { can } = useAccess();
  const { settings } = useBook();
  const { setStatus } = useQuickStatus();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean }>({ top: 0, left: 0, up: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const d = statusDef(order.status);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const h = settings.statuses.length * 38 + 12;
    const up = r.bottom + h > window.innerHeight - 8;
    setPos({ top: up ? r.top - 4 : r.bottom + 4, left: Math.max(8, Math.min(r.left, window.innerWidth - 216)), up });
    menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [open, settings.statuses.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (!menuRef.current?.contains(e.target as Node) && e.target !== btnRef.current) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btnRef.current?.focus(); } };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey, true); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  if (!can.editOrders) return <span className={'badge ' + swatchClass(d.color)}><i className="flame" />{d.name}</span>;
  return (
    <>
      <button ref={btnRef} className={'badge badge-btn ' + swatchClass(d.color)} aria-haspopup="menu" aria-expanded={open}
        title="Change status" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} onKeyDown={(e) => e.stopPropagation()}>
        <i className="flame" />{d.name}<svg className="caret" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div ref={menuRef} className="menu" role="menu" aria-label="Status"
          style={{ top: pos.top, left: pos.left, transform: pos.up ? 'translateY(-100%)' : undefined }}
          onClick={(e) => e.stopPropagation()}>
          {settings.statuses.map((s) => (
            <button key={s.id} role="menuitemradio" aria-checked={s.id === order.status}
              onClick={() => { setOpen(false); if (s.id !== order.status) setStatus(order, s.id); }}>
              <i className={'flame ' + swatchClass(s.color)} /><span>{s.name}</span>
              {s.id === order.status && <span className="menu-check">{Icon.check}</span>}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
