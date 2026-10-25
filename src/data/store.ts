import type { BookData, Expense, Order, Settings } from '../lib/types';

export type BookPatch = Partial<BookData>;

/** Storage backend for one user's book. Both implementations push changes through `subscribe`. */
export interface BookStore {
  kind: 'cloud' | 'local';
  /** Calls onData with whichever parts changed; returns an unsubscribe function. */
  subscribe(onData: (patch: BookPatch) => void, onError: (err: unknown) => void): () => void;
  saveOrder(o: Order): Promise<void>;
  deleteOrder(id: string): Promise<void>;
  saveExpense(e: Expense): Promise<void>;
  deleteExpense(id: string): Promise<void>;
  saveSettings(s: Settings): Promise<void>;
  addMany(orders: Order[], expenses: Expense[]): Promise<void>;
  replaceAll(d: BookData): Promise<void>;
  /** Removes every order and expense; settings are kept. */
  clearAll(): Promise<void>;
}
