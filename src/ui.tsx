import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Period } from './lib/dates';
import type { View } from './lib/types';

export type SheetState =
  | { kind: 'order'; id: string | null; date?: string | null }
  | { kind: 'expense'; id: string | null }
  | { kind: 'settings' }
  | { kind: 'lists' }
  | null;

export type When = 'upcoming' | 'past' | 'due' | 'all';
export interface Filters { q: string; status: string; service: string; label: string; when: When }
export const DEFAULT_FILTERS: Filters = { q: '', status: '', service: '', label: '', when: 'upcoming' };

interface UICtx {
  view: View;
  go(v: View): void;
  calYear: number;
  calMonth: number;
  setCal(year: number, month: number): void;
  selDate: string | null;
  setSelDate(d: string | null): void;
  filters: Filters;
  setFilters(f: Filters | ((f: Filters) => Filters)): void;
  finPeriod: Period;
  setFinPeriod(p: Period): void;
  sheet: SheetState;
  setSheet(s: SheetState): void;
  menuOpen: boolean;
  setMenuOpen(v: boolean): void;
}

const VIEWS: View[] = ['calendar', 'orders', 'finances', 'team'];
const viewFromHash = (): View => {
  const h = window.location.hash.slice(1) as View;
  return VIEWS.includes(h) ? h : 'calendar';
};

const Ctx = createContext<UICtx | null>(null);

export function useUI(): UICtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUI must be used inside UIProvider');
  return c;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const [view, setView] = useState<View>(viewFromHash);
  const [cal, setCalState] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selDate, setSelDate] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [finPeriod, setFinPeriod] = useState<Period>('month');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((v: View) => {
    setView(v);
    if (window.location.hash !== '#' + v) window.location.hash = v;
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const setCal = useCallback((y: number, m: number) => {
    const d = new Date(y, m, 1);
    setCalState({ y: d.getFullYear(), m: d.getMonth() });
  }, []);

  const value = useMemo<UICtx>(() => ({
    view, go, calYear: cal.y, calMonth: cal.m, setCal, selDate, setSelDate,
    filters, setFilters, finPeriod, setFinPeriod, sheet, setSheet, menuOpen, setMenuOpen,
  }), [view, go, cal, setCal, selDate, filters, finPeriod, sheet, menuOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
