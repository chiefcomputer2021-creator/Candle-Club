import { useBook } from '../data/BookContext';
import { statusDef, swatchClass } from '../lib/lists';
import { payClass, type PayLabel } from '../lib/money';

export function StatusBadge({ status }: { status: string }) {
  const d = statusDef(status);
  return <span className={'badge ' + swatchClass(d.color)}><i className="flame" />{d.name}</span>;
}

export function PayPill({ label }: { label: PayLabel }) {
  return <span className={'pay ' + payClass(label)}>{label}</span>;
}

/** Coloured label chips for an order; unknown (deleted) labels are skipped. */
export function LabelTags({ ids, className = '' }: { ids: string[]; className?: string }) {
  const { labelById } = useBook();
  const labels = ids.map(labelById).filter(Boolean);
  if (!labels.length) return null;
  return (
    <span className={'labels ' + className}>
      {labels.map((l) => <span key={l!.id} className={'label ' + swatchClass(l!.color)}>{l!.name}</span>)}
    </span>
  );
}
