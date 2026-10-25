import { useEffect, useState, type FormEvent } from 'react';
import { useConfirm } from '../components/Confirm';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toasts';
import { useBook } from '../data/BookContext';
import { todayISO } from '../lib/dates';
import { num, uid } from '../lib/format';
import { Sheet } from './Sheet';

export function ExpenseSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const book = useBook();
  const toast = useToast();
  const confirm = useConfirm();
  const { money, settings } = book;
  const live = id ? book.expenses.find((x) => x.id === id) || null : null;

  const [amount, setAmount] = useState(live ? String(live.amount) : '');
  const [date, setDate] = useState(live ? live.date : todayISO());
  const [category, setCategory] = useState(live ? live.category : settings.expenseCategories[0] || 'Other');
  const [note, setNote] = useState(live ? live.note : '');
  const [bad, setBad] = useState(false);

  useEffect(() => { if (id && !live) onClose(); }, [id, live, onClose]);

  function save(e?: FormEvent) {
    e?.preventDefault();
    const amt = num(amount);
    if (amt <= 0) { setBad(true); document.getElementById('e-amt')?.focus(); return; }
    const data = { date: date || todayISO(), category, amount: amt, note: note.trim() };
    if (live) { book.saveExpense({ ...live, ...data }); toast('Expense saved'); }
    else { book.saveExpense({ id: uid('exp'), ...data }); toast(money(amt) + ' added to ' + category); }
    onClose();
  }

  async function remove() {
    if (!live) return;
    const ok = await confirm({ title: 'Delete this expense?', body: money(live.amount) + ' for ' + (live.note || live.category) + ' will be removed from your finances.', ok: 'Delete expense', danger: true });
    if (!ok) return;
    book.deleteExpense(live.id);
    onClose();
    toast('Expense deleted');
  }

  return (
    <Sheet labelId="e-title" onClose={onClose}>
      <div className="sh-head">
        <div><h2 id="e-title">{live ? 'Edit expense' : 'Add expense'}</h2><p>Money out, logged against a category.</p></div>
        <button className="x" aria-label="Close" onClick={onClose}>{Icon.close}</button>
      </div>
      <form className="sh-body" id="exp-form" noValidate onSubmit={save}>
        <div className="g2">
          <label className={'field' + (bad ? ' invalid' : '')}>
            <span>Amount <em>*</em></span>
            <div className="prefix"><b>{settings.currency}</b>
              <input id="e-amt" className="input money" type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={amount}
                onChange={(e) => { setAmount(e.target.value); setBad(false); }} />
            </div>
            <small className="err">Enter an amount above zero.</small>
          </label>
          <label className="field"><span>Date</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <label className="field">
          <span>Category</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {(settings.expenseCategories.includes(category) ? settings.expenseCategories : [...settings.expenseCategories, category]).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Note</span>
          <input className="input" value={note} placeholder="e.g. Roses and baby’s breath from the market" onChange={(e) => setNote(e.target.value)} />
        </label>
      </form>
      <div className="sh-foot">
        {live && <button className="btn danger" onClick={remove}>{Icon.trash}Delete</button>}
        <span className="spacer" />
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" type="submit" form="exp-form">{live ? 'Save changes' : 'Add expense'}</button>
      </div>
    </Sheet>
  );
}
