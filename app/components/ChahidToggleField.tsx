'use client';

type Props = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ChahidToggleField({ id, checked, onChange }: Props) {
  return (
    <div className="chahid-toggle-card">
      <div className="chahid-toggle-header">
        <div className="chahid-toggle-copy">
          <span className="chahid-toggle-title">Chahid</span>
          <p className="chahid-toggle-desc">
            Indiquez si cette personne est reconnue comme martyr (Chahid).
          </p>
        </div>
        <label className="chahid-toggle-switch" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            className="chahid-toggle-input"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-label="Marquer comme Chahid"
          />
          <span className="chahid-toggle-track" aria-hidden />
        </label>
      </div>
    </div>
  );
}
