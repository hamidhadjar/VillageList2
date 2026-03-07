'use client';

import { useMemo, useState, useId } from 'react';

export interface PersonOption {
  id: string;
  name: string;
}

interface SearchablePersonMultiSelectProps {
  label: string;
  id: string;
  options: PersonOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  searchPlaceholder?: string;
  /** Exclude this id from the options list (e.g. current biography on edit) */
  excludeId?: string;
}

export function SearchablePersonMultiSelect({
  label,
  id,
  options,
  value,
  onChange,
  searchPlaceholder = 'Rechercher par nom…',
  excludeId,
}: SearchablePersonMultiSelectProps) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const listId = useId();

  const filtered = useMemo(() => {
    const list = excludeId ? options.filter((o) => o.id !== excludeId) : options;
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, excludeId, query]);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const selectedOptions = useMemo(
    () => options.filter((o) => selectedSet.has(o.id)),
    [options, selectedSet]
  );

  const toggle = (personId: string) => {
    if (selectedSet.has(personId)) {
      onChange(value.filter((id) => id !== personId));
    } else {
      onChange([...value, personId]);
    }
  };

  const remove = (personId: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(value.filter((id) => id !== personId));
  };

  return (
    <div className="form-group searchable-multi-select">
      <label htmlFor={inputId}>{label}</label>
      {/* Selected as chips */}
      {selectedOptions.length > 0 && (
        <div className="searchable-multi-select-chips" role="list">
          {selectedOptions.map((o) => (
            <span
              key={o.id}
              className="searchable-multi-select-chip"
              role="listitem"
            >
              <span className="searchable-multi-select-chip-label">{o.name}</span>
              <button
                type="button"
                className="searchable-multi-select-chip-remove"
                onClick={(e) => remove(o.id, e)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && remove(o.id, e)}
                aria-label={`Retirer ${o.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Search */}
      <input
        id={inputId}
        type="search"
        className="searchable-multi-select-input"
        placeholder={searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        aria-describedby={listId}
        aria-label={label}
      />
      {/* Option list - touch-friendly min height and tap targets */}
      <div
        id={listId}
        className="searchable-multi-select-list"
        role="listbox"
        aria-multiselectable="true"
        aria-label={label}
      >
        {filtered.length === 0 ? (
          <div className="searchable-multi-select-empty">
            {query.trim() ? 'Aucun résultat' : 'Aucune personne'}
          </div>
        ) : (
          filtered.map((o) => {
            const isSelected = selectedSet.has(o.id);
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`searchable-multi-select-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => toggle(o.id)}
              >
                <span className="searchable-multi-select-option-check" aria-hidden>
                  {isSelected ? '✓' : ''}
                </span>
                <span className="searchable-multi-select-option-label">{o.name}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
