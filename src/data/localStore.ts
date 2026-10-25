import { sanitizeBook } from '../lib/sanitize';
import type { BookData } from '../lib/types';
import type { BookPatch, BookStore } from './store';

export const LS_KEY = 'candleclub-data';

export function readLocalBook(): BookData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? sanitizeBook(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Replaces items with the same id and appends the rest (matches Firestore's set-by-id). */
function upsert<T extends { id: string }>(list: T[], items: T[]): T[] {
  const byId = new Map(items.map((x) => [x.id, x]));
  const kept = list.map((x) => byId.get(x.id) ?? x);
  const existing = new Set(list.map((x) => x.id));
  return [...kept, ...items.filter((x) => !existing.has(x.id))];
}

/** Keeps the book in this browser's localStorage. Used when Firebase isn't configured. */
export function createLocalStore(): BookStore {
  let book: BookData = readLocalBook() || sanitizeBook({});
  const listeners = new Set<(p: BookPatch) => void>();

  const commit = (next: BookData) => {
    book = next;
    try { localStorage.setItem(LS_KEY, JSON.stringify(book)); } catch { /* storage full or blocked */ }
    listeners.forEach((l) => l(book));
    return Promise.resolve();
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key !== LS_KEY) return;
    book = readLocalBook() || sanitizeBook({});
    listeners.forEach((l) => l(book));
  };

  return {
    kind: 'local',
    subscribe(onData) {
      listeners.add(onData);
      if (listeners.size === 1) window.addEventListener('storage', onStorage);
      onData(book);
      return () => {
        listeners.delete(onData);
        if (!listeners.size) window.removeEventListener('storage', onStorage);
      };
    },
    saveOrder: (o) => commit({ ...book, orders: book.orders.some((x) => x.id === o.id) ? book.orders.map((x) => (x.id === o.id ? o : x)) : [...book.orders, o] }),
    deleteOrder: (id) => commit({ ...book, orders: book.orders.filter((x) => x.id !== id) }),
    saveExpense: (e) => commit({ ...book, expenses: book.expenses.some((x) => x.id === e.id) ? book.expenses.map((x) => (x.id === e.id ? e : x)) : [...book.expenses, e] }),
    deleteExpense: (id) => commit({ ...book, expenses: book.expenses.filter((x) => x.id !== id) }),
    saveSettings: (s) => commit({ ...book, settings: s }),
    addMany: (orders, expenses) => commit({ ...book, orders: upsert(book.orders, orders), expenses: upsert(book.expenses, expenses) }),
    replaceAll: (d) => commit(sanitizeBook(d)),
    clearAll: () => commit({ ...book, orders: [], expenses: [] }),
  };
}
