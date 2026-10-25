import {
  collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch,
  type DocumentReference, type Firestore,
} from 'firebase/firestore';
import { sanitizeExpense, sanitizeOrder, sanitizeSettings } from '../lib/sanitize';
import type { Expense, Order } from '../lib/types';
import type { BookStore } from './store';

// Firestore caps a batch at 500 writes.
const BATCH_LIMIT = 450;

type Op = { ref: DocumentReference; data?: object; merge?: boolean };

/**
 * One shared book per business (access is enforced by firestore.rules):
 *   businesses/{bizId}                 { name, ownerUid, settings }
 *   businesses/{bizId}/orders/{id}     Order, with payments embedded
 *   businesses/{bizId}/expenses/{id}   Expense (owners and admins only)
 */
export function createFirestoreStore(db: Firestore, bizId: string, opts: { expenses: boolean }): BookStore {
  const bizRef = doc(db, 'businesses', bizId);
  const ordersCol = collection(bizRef, 'orders');
  const expensesCol = collection(bizRef, 'expenses');
  const orderRef = (id: string) => doc(ordersCol, id);
  const expenseRef = (id: string) => doc(expensesCol, id);

  // IDs from the latest snapshots, used by replaceAll / clearAll.
  let orderIds: string[] = [];
  let expenseIds: string[] = [];

  async function commit(ops: Op[]) {
    for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      ops.slice(i, i + BATCH_LIMIT).forEach((op) => {
        if (!op.data) batch.delete(op.ref);
        else if (op.merge) batch.set(op.ref, op.data, { merge: true });
        else batch.set(op.ref, op.data);
      });
      await batch.commit();
    }
  }

  return {
    kind: 'cloud',
    subscribe(onData, onError) {
      const unsubs = [
        onSnapshot(ordersCol, (snap) => {
          orderIds = snap.docs.map((d) => d.id);
          onData({ orders: snap.docs.map((d) => sanitizeOrder({ ...d.data(), id: d.id })).filter(Boolean) as Order[] });
        }, onError),
        onSnapshot(bizRef, (snap) => {
          onData({ settings: sanitizeSettings(snap.exists() ? snap.get('settings') : null) });
        }, onError),
      ];
      if (opts.expenses) {
        unsubs.push(onSnapshot(expensesCol, (snap) => {
          expenseIds = snap.docs.map((d) => d.id);
          onData({ expenses: snap.docs.map((d) => sanitizeExpense({ ...d.data(), id: d.id })).filter(Boolean) as Expense[] });
        }, onError));
      } else {
        onData({ expenses: [] });
      }
      return () => unsubs.forEach((u) => u());
    },
    saveOrder: (o) => setDoc(orderRef(o.id), o),
    deleteOrder: (id) => deleteDoc(orderRef(id)),
    saveExpense: (e) => setDoc(expenseRef(e.id), e),
    deleteExpense: (id) => deleteDoc(expenseRef(id)),
    saveSettings: (s) => setDoc(bizRef, { settings: s, name: s.businessName }, { merge: true }),
    addMany: (orders, expenses) => commit([
      ...orders.map((o) => ({ ref: orderRef(o.id), data: o })),
      ...expenses.map((e) => ({ ref: expenseRef(e.id), data: e })),
    ]),
    replaceAll(d) {
      const keepO = new Set(d.orders.map((o) => o.id));
      const keepE = new Set(d.expenses.map((e) => e.id));
      return commit([
        ...orderIds.filter((id) => !keepO.has(id)).map((id) => ({ ref: orderRef(id) })),
        ...expenseIds.filter((id) => !keepE.has(id)).map((id) => ({ ref: expenseRef(id) })),
        ...d.orders.map((o) => ({ ref: orderRef(o.id), data: o })),
        ...d.expenses.map((e) => ({ ref: expenseRef(e.id), data: e })),
        { ref: bizRef, data: { settings: d.settings, name: d.settings.businessName }, merge: true },
      ]);
    },
    clearAll: () => commit([
      ...orderIds.map((id) => ({ ref: orderRef(id) })),
      ...expenseIds.map((id) => ({ ref: expenseRef(id) })),
    ]),
  };
}
