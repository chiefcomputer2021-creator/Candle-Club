import type { Order } from './types';
import { num } from './format';
import { statusKind } from './lists';

export const orderPaid = (o: Order) => (o.payments || []).reduce((s, p) => s + num(p.amount), 0);
export const orderBalance = (o: Order) => Math.round((num(o.totalPrice) - orderPaid(o)) * 100) / 100;
/** Cancelled orders don't count towards money booked or owed. */
export const isActive = (o: Order) => statusKind(o.status) !== 'cancelled';
export const isDone = (o: Order) => statusKind(o.status) === 'done';

export type PayLabel = 'Paid' | 'Partial' | 'Unpaid' | 'No price';
export function paymentStatusLabel(o: Order): PayLabel {
  const paid = orderPaid(o), total = num(o.totalPrice);
  if (total <= 0) return paid > 0 ? 'Paid' : 'No price';
  if (paid <= 0) return 'Unpaid';
  if (paid < total) return 'Partial';
  return 'Paid';
}
export const payClass = (label: PayLabel) => ({ 'Unpaid': 'unpaid', 'Partial': 'partial', 'Paid': 'paid' } as Record<string, string>)[label] || 'na';

export interface FlatPayment {
  id: string;
  date: string;
  amount: number;
  method: string;
  orderId: string;
  client: string;
  service: string;
}
export function allPayments(orders: Order[]): FlatPayment[] {
  const out: FlatPayment[] = [];
  orders.forEach((o) => (o.payments || []).forEach((p) => out.push({
    id: p.id, date: p.date, amount: num(p.amount), method: p.method, orderId: o.id, client: o.clientName, service: o.serviceType,
  })));
  return out;
}
