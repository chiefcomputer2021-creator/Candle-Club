import { useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toasts';
import { useAccess } from '../data/access';
import { useBookActions } from '../data/actions';
import { useBook } from '../data/BookContext';
import { exportBackup, exportExpensesCSV, exportOrdersCSV } from '../lib/exports';
import { plural } from '../lib/format';
import { allPayments } from '../lib/money';
import { ROLE_INFO } from '../lib/roles';
import { setTheme, useTheme, type Theme } from '../lib/theme';
import { useUI } from '../ui';
import { Sheet } from './Sheet';

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const book = useBook();
  const auth = useAuth();
  const { can, role, mode } = useAccess();
  const toast = useToast();
  const { loadSample, clearAll, restoreFromFile } = useBookActions();
  const fileRef = useRef<HTMLInputElement>(null);
  const ui = useUI();
  const s = book.settings;

  const [businessName, setBusinessName] = useState(s.businessName);
  const [contact, setContact] = useState(s.contact);
  const [currency, setCurrency] = useState(s.currency);
  const [weekStart, setWeekStart] = useState(+s.weekStart || 0);
  const theme = useTheme();

  function save(e?: FormEvent) {
    e?.preventDefault();
    if (can.manageBusiness) {
      book.saveSettings({
        ...s,
        businessName: businessName.trim() || 'The Candle Club',
        contact: contact.trim(),
        currency: currency.trim() || '₹',
        weekStart,
      });
    }
    onClose();
    toast('Settings saved');
  }

  const cloud = mode === 'cloud';
  return (
    <Sheet labelId="s-title" onClose={onClose}>
      <div className="sh-head">
        <div>
          <h2 id="s-title">{can.manageBusiness ? 'Settings and data' : 'Settings'}</h2>
          <p>{cloud ? 'Your team’s book is saved to the cloud and syncs across devices.' : 'Your book is saved in this browser. Add Firebase credentials to sync it to your account.'}</p>
        </div>
        <button className="x" aria-label="Close" onClick={onClose}>{Icon.close}</button>
      </div>
      <form className="sh-body" id="set-form" noValidate onSubmit={save}>
        {cloud && auth?.user && (
          <div className="fs">
            <h3>Account</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              Signed in as <b>{auth.user.email || auth.user.displayName || 'you'}</b>, {ROLE_INFO[role].label.toLowerCase()} of {s.businessName}. {ROLE_INFO[role].desc}
            </p>
            <div><button type="button" className="btn" onClick={() => { onClose(); auth.signOut(); }}>{Icon.signOut}Sign out</button></div>
          </div>
        )}
        {can.manageBusiness && (
          <div className="fs">
            <h3>Business</h3>
            <label className="field"><span>Business name on invoices</span><input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} /></label>
            <label className="field"><span>Contact line on invoices</span><input className="input" value={contact} placeholder="Phone, email or address" onChange={(e) => setContact(e.target.value)} /></label>
            <div className="g2">
              <label className="field"><span>Currency symbol</span><input className="input mono" maxLength={4} value={currency} onChange={(e) => setCurrency(e.target.value)} /></label>
              <label className="field">
                <span>Week starts on</span>
                <select className="input" value={weekStart} onChange={(e) => setWeekStart(+e.target.value)}>
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                </select>
              </label>
            </div>
          </div>
        )}
        {can.manageBusiness && (
          <div className="fs">
            <h3>Statuses, labels and lists</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              {plural(s.statuses.length, 'status', 'statuses')}, {plural(s.labels.length, 'label')}, {plural(s.services.length, 'service')}, {plural(s.paymentMethods.length, 'payment method')}.
            </p>
            <div><button type="button" className="btn" onClick={() => ui.setSheet({ kind: 'lists' })}>{Icon.tag}Edit statuses, labels and lists</button></div>
          </div>
        )}
        <div className="fs">
          <h3>This device</h3>
          <label className="field">
            <span>Appearance (applies straight away)</span>
            <select className="input" value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
              <option value="auto">Match my device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
        {can.manageBusiness && (
          <div className="fs">
            <h3>Your data</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              {plural(book.orders.length, 'order')}, {plural(allPayments(book.orders).length, 'payment')} and {plural(book.expenses.length, 'expense')} in your book.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="btn" onClick={() => exportBackup(book)}>{Icon.download}Download backup</button>
              <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Restore from backup</button>
              <button type="button" className="btn" onClick={() => exportOrdersCSV(book.orders, book.labelNames)}>Orders CSV</button>
              <button type="button" className="btn" onClick={() => exportExpensesCSV(book.expenses)}>Expenses CSV</button>
              <button type="button" className="btn" onClick={loadSample}>Load sample data</button>
              <button type="button" className="btn danger" onClick={clearAll}>Clear all data</button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) restoreFromFile(f); }} />
          </div>
        )}
      </form>
      <div className="sh-foot">
        <span className="spacer" />
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" type="submit" form="set-form">Save settings</button>
      </div>
    </Sheet>
  );
}
