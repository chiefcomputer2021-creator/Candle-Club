import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export interface ToastAction { label: string; onClick: () => void }
type Toast = { id: number; msg: string; out: boolean; action?: ToastAction };
type ToastFn = (msg: string, action?: ToastAction) => void;
const ToastCtx = createContext<ToastFn>(() => {});

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 320);
  }, []);

  const toast = useCallback<ToastFn>((msg, action) => {
    const id = next.current++;
    setToasts((t) => [...t, { id, msg, out: false, action }]);
    // Toasts with an action stay a little longer so there's time to tap Undo.
    setTimeout(() => dismiss(id), action ? 6000 : 2800);
  }, [dismiss]);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={'toast' + (t.out ? ' out' : '') + (t.action ? ' has-action' : '')}>
            <i className="flame" /><span>{t.msg}</span>
            {t.action && <button onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
