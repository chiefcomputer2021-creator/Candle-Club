import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ConfirmOptions { title: string; body: string; ok: string; danger?: boolean }
type Pending = ConfirmOptions & { resolve: (v: boolean) => void };

const ConfirmCtx = createContext<(o: ConfirmOptions) => Promise<boolean>>(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<Element | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => {
    prevFocus.current = document.activeElement;
    setPending({ ...o, resolve });
  }), []);

  const done = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
    const p = prevFocus.current as HTMLElement | null;
    if (p && document.contains(p)) p.focus();
  };

  useEffect(() => { if (pending) okRef.current?.focus(); }, [pending]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="overlay center"
          data-confirm
          onClick={(e) => { if (e.target === e.currentTarget) done(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } }}
        >
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="c-t">
            <h2 id="c-t">{pending.title}</h2>
            <p>{pending.body}</p>
            <div className="row">
              <button className="btn" onClick={() => done(false)}>Keep it</button>
              <button ref={okRef} className={'btn ' + (pending.danger ? 'solid-danger' : 'primary')} onClick={() => done(true)}>{pending.ok}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
