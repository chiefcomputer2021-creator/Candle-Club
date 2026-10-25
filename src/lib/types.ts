import type { Label, StatusDef } from './lists';

export interface Payment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  method: string;
}

export interface Order {
  id: string;
  clientName: string;
  phone: string;
  email: string;
  eventDate: string; // YYYY-MM-DD
  serviceType: string;
  flowerType: string;
  totalPrice: number;
  /** A StatusDef id from settings.statuses. */
  status: string;
  /** Label ids from settings.labels. */
  labels: string[];
  notes: string;
  createdAt: string; // ISO timestamp
  payments: Payment[];
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  amount: number;
  note: string;
}

export interface Settings {
  currency: string;
  weekStart: number; // 0 = Sunday, 1 = Monday
  businessName: string;
  contact: string;
  statuses: StatusDef[];
  labels: Label[];
  services: string[];
  flowers: string[];
  paymentMethods: string[];
  expenseCategories: string[];
}

export interface BookData {
  orders: Order[];
  expenses: Expense[];
  settings: Settings;
}

export type View = 'calendar' | 'orders' | 'finances' | 'team';
