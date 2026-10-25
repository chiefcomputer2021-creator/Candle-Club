import { DEFAULT_SETTINGS } from './constants';
import { num } from './format';
import { DEFAULT_LISTS, DEFAULT_STATUSES, SWATCHES, type Label, type StatusDef, type Swatch } from './lists';
import type { BookData, Expense, Order, Payment, Settings } from './types';

const str = (v: unknown) => (v == null ? '' : String(v));
const swatch = (v: unknown, fallback: Swatch): Swatch => (SWATCHES.includes(v as Swatch) ? (v as Swatch) : fallback);

export function sanitizePayment(p: any): Payment | null {
  if (!p || !p.id) return null;
  return { id: str(p.id), date: str(p.date), amount: num(p.amount), method: str(p.method) };
}

export function sanitizeOrder(o: any): Order | null {
  if (!o || !o.id) return null;
  return {
    id: str(o.id),
    clientName: str(o.clientName),
    phone: str(o.phone),
    email: str(o.email),
    eventDate: str(o.eventDate),
    serviceType: str(o.serviceType),
    flowerType: str(o.flowerType),
    totalPrice: num(o.totalPrice),
    status: str(o.status) || 'Inquiry',
    labels: Array.isArray(o.labels) ? o.labels.map(str).filter(Boolean) : [],
    notes: str(o.notes),
    createdAt: str(o.createdAt) || new Date().toISOString(),
    payments: Array.isArray(o.payments) ? o.payments.map(sanitizePayment).filter(Boolean) as Payment[] : [],
  };
}

export function sanitizeExpense(e: any): Expense | null {
  if (!e || !e.id) return null;
  return { id: str(e.id), date: str(e.date), category: str(e.category) || 'Other', amount: num(e.amount), note: str(e.note) };
}

const strList = (v: unknown, fallback: string[]) => {
  const list = Array.isArray(v) ? Array.from(new Set(v.map(str).map((s) => s.trim()).filter(Boolean))) : [];
  return list.length ? list : fallback;
};

function sanitizeStatuses(v: unknown): StatusDef[] {
  if (!Array.isArray(v)) return DEFAULT_STATUSES;
  const list = v.filter((s) => s && s.id && s.name).map((s): StatusDef => ({
    id: str(s.id), name: str(s.name), color: swatch(s.color, 'taupe'),
    kind: s.kind === 'done' || s.kind === 'cancelled' ? s.kind : 'open',
  }));
  // The app needs at least one of each kind; fall back to the defaults if a save ever broke that.
  const kinds = new Set(list.map((s) => s.kind));
  return kinds.has('open') && kinds.has('done') && kinds.has('cancelled') ? list : DEFAULT_STATUSES;
}

function sanitizeLabels(v: unknown): Label[] {
  if (!Array.isArray(v)) return [];
  return v.filter((l) => l && l.id && l.name).map((l) => ({ id: str(l.id), name: str(l.name), color: swatch(l.color, 'umber') }));
}

export function sanitizeSettings(s: any): Settings {
  const merged = Object.assign({}, DEFAULT_SETTINGS, s || {});
  return {
    currency: str(merged.currency) || DEFAULT_SETTINGS.currency,
    weekStart: +merged.weekStart === 1 ? 1 : 0,
    businessName: str(merged.businessName) || DEFAULT_SETTINGS.businessName,
    contact: str(merged.contact),
    statuses: sanitizeStatuses(merged.statuses),
    labels: sanitizeLabels(merged.labels),
    services: strList(merged.services, DEFAULT_LISTS.services),
    flowers: strList(merged.flowers, DEFAULT_LISTS.flowers),
    paymentMethods: strList(merged.paymentMethods, DEFAULT_LISTS.paymentMethods),
    expenseCategories: strList(merged.expenseCategories, DEFAULT_LISTS.expenseCategories),
  };
}

/** Accepts a backup file (from this app or the original single-file version). */
export function sanitizeBook(d: any): BookData {
  d = d || {};
  return {
    orders: Array.isArray(d.orders) ? d.orders.map(sanitizeOrder).filter(Boolean) as Order[] : [],
    expenses: Array.isArray(d.expenses) ? d.expenses.map(sanitizeExpense).filter(Boolean) as Expense[] : [],
    settings: sanitizeSettings(d.settings),
  };
}
