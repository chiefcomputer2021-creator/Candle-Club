import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useToast } from '../components/Toasts';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { formatCompact, formatMoney } from '../lib/format';
import { registerStatuses, type Label } from '../lib/lists';
import type { BookData, Expense, Order, Settings } from '../lib/types';
import type { BookPatch, BookStore } from './store';

export type SyncState = 'synced' | 'saving' | 'local' | 'offline' | 'error';

interface BookCtx extends BookData {
  kind: BookStore['kind'];
  loaded: boolean;
  sync: SyncState;
  money(n: unknown): string;
  compact(n: number): string;
  labelById(id: string): Label | undefined;
  labelNames(ids: string[]): string;
  saveOrder(o: Order): void;
  deleteOrder(id: string): void;
  saveExpense(e: Expense): void;
  deleteExpense(id: string): void;
  saveSettings(s: Settings): void;
  /** Writes many orders/expenses at once (new or existing). */
  addMany(orders: Order[], expenses: Expense[]): void;
  replaceAll(d: BookData): void;
  clearAll(): void;
}

const Ctx = createContext<BookCtx | null>(null);

export function useBook(): BookCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBook must be used inside BookProvider');
  return c;
}

export function BookProvider({ store, children }: { store: BookStore; children: ReactNode }) {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const seen = useRef(new Set<keyof BookData>());

  useEffect(() => {
    seen.current = new Set();
    setLoaded(false);
    return store.subscribe(
      (patch: BookPatch) => {
        if (patch.orders) setOrders(patch.orders);
        if (patch.expenses) setExpenses(patch.expenses);
        if (patch.settings) setSettings(patch.settings);
        (Object.keys(patch) as (keyof BookData)[]).forEach((k) => seen.current.add(k));
        if (seen.current.size === 3) setLoaded(true);
      },
      (err) => {
        console.error(err);
        setFailed(true);
        setLoaded(true);
        const code = (err as { code?: string })?.code;
        toast(code === 'permission-denied'
          ? 'Your account couldn’t read the book. Check that the Firestore rules are deployed.'
          : 'Couldn’t load your book from the server.');
      },
    );
  }, [store, toast]);

  useEffect(() => {
    const up = () => setOnline(true), down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // Writes show up immediately through the snapshot listener (Firestore applies them to its
  // local cache first), so callers don't wait. This only tracks the server acknowledgement.
  const run = useCallback((p: Promise<void>) => {
    setPending((n) => n + 1);
    p.then(() => setFailed(false))
      .catch((err) => {
        console.error(err);
        setFailed(true);
        const code = (err as { code?: string })?.code;
        toast(code === 'permission-denied' ? 'Not allowed to save. Check the Firestore rules.' : 'Couldn’t save that change. Try again.');
      })
      .finally(() => setPending((n) => n - 1));
  }, [toast]);

  const sync: SyncState = store.kind === 'local' ? 'local'
    : !online ? 'offline'
    : pending > 0 ? 'saving'
    : failed ? 'error'
    : 'synced';

  // Register before children render so isActive()/statusName() see this business's statuses.
  useMemo(() => registerStatuses(settings.statuses), [settings.statuses]);
  const labelMap = useMemo(() => new Map(settings.labels.map((l) => [l.id, l])), [settings.labels]);

  const value = useMemo<BookCtx>(() => ({
    orders, expenses, settings, loaded, sync, kind: store.kind,
    money: (n) => formatMoney(n, settings.currency || '₹'),
    compact: (n) => formatCompact(n, settings.currency || '₹'),
    labelById: (id) => labelMap.get(id),
    labelNames: (ids) => ids.map((id) => labelMap.get(id)?.name).filter(Boolean).join(', '),
    saveOrder: (o) => run(store.saveOrder(o)),
    deleteOrder: (id) => run(store.deleteOrder(id)),
    saveExpense: (e) => run(store.saveExpense(e)),
    deleteExpense: (id) => run(store.deleteExpense(id)),
    saveSettings: (s) => run(store.saveSettings(s)),
    addMany: (o, e) => run(store.addMany(o, e)),
    replaceAll: (d) => run(store.replaceAll(d)),
    clearAll: () => run(store.clearAll()),
  }), [orders, expenses, settings, loaded, sync, store, run, labelMap]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
