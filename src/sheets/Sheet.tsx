import { useEffect, useRef, type ReactNode } from 'react';

/** Right-hand slide-over panel. Closes on Escape or a click on the backdrop. */
export function Sheet({ labelId, onClose, children }: { labelId: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    document.body.classList.add('modal-open');
    const t = setTimeout(() => {
      const first = ref.current?.querySelector<HTMLElement>('input:not([type=hidden]):not([type=radio]):not([type=file]), select, textarea');
      if (first && window.matchMedia('(min-width: 721px)').matches) first.focus();
      else ref.current?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-confirm]')) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      if (prev && document.contains(prev)) prev.focus();
    };
  }, []);

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelId} tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
