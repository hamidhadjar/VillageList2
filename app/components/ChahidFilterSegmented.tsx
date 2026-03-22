'use client';

export type ChahidFilterValue = 'all' | 'chahid' | 'non-chahid';

type Props = {
  id: string;
  value: ChahidFilterValue;
  onChange: (v: ChahidFilterValue) => void;
  /** Stretch buttons to fill container width (e.g. search bar column) */
  stretch?: boolean;
  className?: string;
};

const OPTIONS: { value: ChahidFilterValue; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'chahid', label: 'Chahid' },
  { value: 'non-chahid', label: 'Non Chahid' },
];

export function ChahidFilterSegmented({ id, value, onChange, stretch, className }: Props) {
  const labelId = `${id}-heading`;
  return (
    <div className={`chahid-filter ${className ?? ''}`.trim()}>
      <span id={labelId} className="chahid-filter-label">
        Statut Chahid
      </span>
      <div
        className={`chahid-segment-group${stretch ? ' chahid-segment-group--stretch' : ''}`}
        role="group"
        aria-labelledby={labelId}
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            id={`${id}-${opt.value}`}
            className="chahid-segment"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
