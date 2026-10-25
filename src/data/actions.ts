import { useConfirm } from '../components/Confirm';
import { useToast } from '../components/Toasts';
import { plural } from '../lib/format';
import { buildSample } from '../lib/sample';
import { sanitizeBook } from '../lib/sanitize';
import type { BookData } from '../lib/types';
import { useUI } from '../ui';
import { useBook } from './BookContext';

/** Book-wide actions that need a confirmation step, shared by the sidebar, empty states and settings. */
export function useBookActions() {
  const book = useBook();
  const ui = useUI();
  const confirm = useConfirm();
  const toast = useToast();

  async function loadSample() {
    if (book.orders.length || book.expenses.length) {
      const ok = await confirm({ title: 'Add sample data?', body: 'Sample orders and expenses will be added alongside what you already have. You can remove them with Clear all data.', ok: 'Add samples' });
      if (!ok) return;
    }
    const s = buildSample();
    book.addMany(s.orders, s.expenses);
    ui.setSheet(null);
    const t = new Date();
    ui.setCal(t.getFullYear(), t.getMonth());
    toast('Sample orders and expenses added');
  }

  async function clearAll() {
    ui.setMenuOpen(false);
    const ok = await confirm({ title: 'Clear all data?', body: 'Every order, payment and expense will be permanently deleted. Download a backup first if you might want them back.', ok: 'Clear everything', danger: true });
    if (!ok) return;
    book.clearAll();
    ui.setSelDate(null);
    ui.setSheet(null);
    toast('All data cleared');
  }

  async function restoreFromFile(file: File) {
    let raw: any;
    try { raw = JSON.parse(await file.text()); } catch { toast('That file isn’t a backup from The Candle Club.'); return; }
    if (!raw || !Array.isArray(raw.orders) || !Array.isArray(raw.expenses)) { toast('That file isn’t a backup from The Candle Club.'); return; }
    const d = sanitizeBook(raw);
    const ok = await confirm({ title: 'Replace your book with this backup?', body: 'This backup has ' + plural(d.orders.length, 'order') + ' and ' + plural(d.expenses.length, 'expense') + '. Everything currently in your book will be replaced.', ok: 'Replace', danger: true });
    if (!ok) return;
    book.replaceAll(d);
    ui.setSheet(null);
    toast('Backup restored');
  }

  /** Copies a book saved in this browser (local-only mode) into the signed-in account. */
  function importLocal(d: BookData) {
    book.addMany(d.orders, d.expenses);
    book.saveSettings(d.settings);
    toast('Imported ' + plural(d.orders.length, 'order') + ' from this browser');
  }

  return { loadSample, clearAll, restoreFromFile, importLocal };
}
