'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const MapPickerLeaflet = dynamic(
  () => import('./MapPickerLeaflet').then((m) => m.MapPickerLeaflet),
  { ssr: false }
);

export interface MapPickerModalProps {
  open: boolean;
  onClose: () => void;
  lat: number | string | null | undefined;
  lng: number | string | null | undefined;
  onSelect: (lat: number, lng: number) => void;
}

export function MapPickerModal({ open, onClose, lat, lng, onSelect }: MapPickerModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const numLat = lat !== '' && lat != null && !Number.isNaN(Number(lat)) ? Number(lat) : null;
  const numLng = lng !== '' && lng != null && !Number.isNaN(Number(lng)) ? Number(lng) : null;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-picker-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{ maxWidth: '90vw', width: '640px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="map-picker-title" style={{ marginTop: 0 }}>Choisir le lieu de décès sur la carte</h2>
        <p className="meta" style={{ marginBottom: '1rem' }}>
          Cliquez sur la carte pour placer le marqueur. Ajustez si besoin puis fermez.
        </p>
        <div style={{ flex: 1, minHeight: '360px', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {mounted && (
            <MapPickerLeaflet
              lat={numLat}
              lng={numLng}
              onSelect={onSelect}
              height="360px"
            />
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
