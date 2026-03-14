'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Biography } from '@/lib/types';
import type { Event } from '@/lib/event-types';

type MapTab = 'bios' | 'events';

export default function DeathMapClient() {
  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    bios: Biography[];
    events?: Event[];
    mode?: 'bios' | 'events';
    searchCenter?: { lat: number; lng: number } | null;
    selectedBioId?: string | null;
    selectedEventId?: string | null;
  }> | null>(null);
  const [tab, setTab] = useState<MapTab>('bios');
  const [filterQuery, setFilterQuery] = useState('');
  const [onlyWithDeathLocation, setOnlyWithDeathLocation] = useState(false);
  const [onlyWithEventLocation, setOnlyWithEventLocation] = useState(false);
  const [selectedBio, setSelectedBio] = useState<Biography | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'selected'>('all');
  const [fullScreenMap, setFullScreenMap] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/biographies').then((res) => (res.ok ? res.json() : [])).catch(() => []),
      fetch('/api/events').then((res) => (res.ok ? res.json() : [])).catch(() => []),
    ]).then(([bioData, eventData]) => {
      setBiographies(Array.isArray(bioData) ? bioData : []);
      setEvents(Array.isArray(eventData) ? eventData : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const loadMap = async () => {
      const { DeathMapLeaflet } = await import('./DeathMapLeaflet');
      setMapComponent(() => DeathMapLeaflet);
    };
    loadMap();
  }, []);

  const withLocation = biographies.filter(
    (b) => b.deathLat != null && b.deathLng != null && !Number.isNaN(Number(b.deathLat)) && !Number.isNaN(Number(b.deathLng))
  );
  const eventsWithLocation = events.filter(
    (e) => e.eventLat != null && e.eventLng != null && !Number.isNaN(Number(e.eventLat)) && !Number.isNaN(Number(e.eventLng))
  );

  const q = filterQuery.trim().toLowerCase();
  const bioListSource = onlyWithDeathLocation ? withLocation : biographies;
  const filteredBioList = q
    ? bioListSource.filter((b) => b.name.toLowerCase().includes(q))
    : bioListSource;
  const eventListSource = onlyWithEventLocation ? eventsWithLocation : events;
  const filteredEventList = q
    ? eventListSource.filter((e) => (e.title ?? '').toLowerCase().includes(q) || (e.place ?? '').toLowerCase().includes(q))
    : eventListSource;

  const biosToShow =
    tab === 'bios' && filterMode === 'selected' && selectedBio && withLocation.some((b) => b.id === selectedBio.id)
      ? [selectedBio]
      : tab === 'bios' && filterMode === 'selected' && selectedBio
        ? []
        : withLocation;
  const eventsToShow =
    tab === 'events' && filterMode === 'selected' && selectedEvent && eventsWithLocation.some((e) => e.id === selectedEvent.id)
      ? [selectedEvent]
      : tab === 'events' && filterMode === 'selected' && selectedEvent
        ? []
        : eventsWithLocation;

  const searchCenter =
    tab === 'bios' && selectedBio && selectedBio.deathLat != null && selectedBio.deathLng != null
      ? { lat: Number(selectedBio.deathLat), lng: Number(selectedBio.deathLng) }
      : tab === 'events' && selectedEvent && selectedEvent.eventLat != null && selectedEvent.eventLng != null
        ? { lat: Number(selectedEvent.eventLat), lng: Number(selectedEvent.eventLng) }
        : null;

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Lieux de décès</h1>
        </div>
        <p className="empty-state">Chargement…</p>
      </div>
    );
  }

  const hasBios = biographies.length > 0;
  const hasEvents = events.length > 0;
  const showMapLayout = hasBios || hasEvents;

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
        <div>
          <h1>Carte</h1>
          <p className="meta">
            {tab === 'bios' && (withLocation.length === 0 ? 'Aucun lieu de décès renseigné.' : `${withLocation.length} personne(s) avec un lieu de décès.`)}
            {tab === 'events' && (eventsWithLocation.length === 0 ? 'Aucun événement avec lieu sur la carte.' : `${eventsWithLocation.length} événement(s) avec un lieu.`)}
          </p>
        </div>
        <Link href="/" className="btn btn-ghost">
          Retour à la liste
        </Link>
      </div>

      {showMapLayout && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`btn ${tab === 'bios' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setTab('bios'); setFilterQuery(''); setSelectedEvent(null); }}
          >
            Biographies
          </button>
          <button
            type="button"
            className={`btn ${tab === 'events' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setTab('events'); setFilterQuery(''); setSelectedBio(null); }}
          >
            Événements
          </button>
        </div>
      )}

      {!showMapLayout ? (
        <div className="card">
          <p className="empty-state">
            Aucune biographie ni événement. Ajoutez des biographies ou des événements, puis renseignez un lieu sur la carte (« Choisir sur la carte »).
          </p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Voir les biographies
          </Link>
          <Link href="/events" className="btn btn-ghost" style={{ marginTop: '0.5rem', marginLeft: '0.5rem' }}>
            Voir les événements
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
          {!fullScreenMap && (
          <div className="card" style={{ width: '280px', minWidth: '260px', display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
            <label htmlFor="map-list-filter" className="meta" style={{ display: 'block', marginBottom: '0.25rem' }}>
              {tab === 'bios' ? 'Filtrer par nom' : 'Filtrer par titre ou lieu'}
            </label>
            <input
              id="map-list-filter"
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={tab === 'bios' ? 'Ex. Hamid, Fatima…' : 'Ex. Fête, Paris…'}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '0.5rem' }}
              autoComplete="off"
            />
            {tab === 'bios' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <input type="checkbox" checked={onlyWithDeathLocation} onChange={(e) => setOnlyWithDeathLocation(e.target.checked)} />
                <span className="meta">Uniquement avec lieu de décès (sur la carte)</span>
              </label>
            )}
            {tab === 'events' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <input type="checkbox" checked={onlyWithEventLocation} onChange={(e) => setOnlyWithEventLocation(e.target.checked)} />
                <span className="meta">Uniquement avec lieu (sur la carte)</span>
              </label>
            )}
            <p className="meta" style={{ marginBottom: '0.35rem' }}>
              {tab === 'bios' && (onlyWithDeathLocation ? 'Biographies avec coordonnées GPS' : 'Toutes les biographies')}
              {tab === 'events' && (onlyWithEventLocation ? 'Événements avec coordonnées GPS' : 'Tous les événements')}
              {' — '}cliquez pour centrer la carte
            </p>
            <div
              role="listbox"
              style={{
                flex: 1,
                minHeight: '300px',
                maxHeight: '500px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg)',
              }}
            >
              {tab === 'bios' && (
                filteredBioList.length === 0 ? (
                  <div className="meta" style={{ padding: '0.75rem' }}>
                    {q ? `Aucun résultat pour « ${filterQuery} »` : 'Aucune biographie'}
                  </div>
                ) : (
                  filteredBioList.map((b) => {
                    const hasLoc = withLocation.some((x) => x.id === b.id);
                    return (
                      <div
                        key={b.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--border)',
                          background: selectedBio?.id === b.id ? 'var(--border)' : undefined,
                        }}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedBio?.id === b.id}
                          onClick={() => setSelectedBio(b)}
                          className="btn btn-ghost"
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.75rem',
                            textAlign: 'left',
                            fontWeight: selectedBio?.id === b.id ? 600 : undefined,
                            borderRadius: 0,
                            opacity: hasLoc ? 1 : 0.85,
                          }}
                        >
                          {b.name}
                          {b.deathPlace && <span style={{ opacity: 0.9 }}> — {b.deathPlace}</span>}
                          {!hasLoc && <span className="meta" style={{ display: 'block', fontSize: '0.85em' }}>sans lieu sur la carte</span>}
                        </button>
                        <Link
                          href={`/bio/${b.id}`}
                          className="btn btn-ghost"
                          style={{ padding: '0.4rem', flexShrink: 0 }}
                          title="Voir la biographie"
                          aria-label={`Voir la biographie de ${b.name}`}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </Link>
                      </div>
                    );
                  })
                )
              )}
              {tab === 'events' && (
                filteredEventList.length === 0 ? (
                  <div className="meta" style={{ padding: '0.75rem' }}>
                    {q ? `Aucun résultat pour « ${filterQuery} »` : 'Aucun événement'}
                  </div>
                ) : (
                  filteredEventList.map((e) => {
                    const hasLoc = eventsWithLocation.some((x) => x.id === e.id);
                    return (
                      <div
                        key={e.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--border)',
                          background: selectedEvent?.id === e.id ? 'var(--border)' : undefined,
                        }}
                      >
                        <button
                          type="button"
                          role="option"
                          aria-selected={selectedEvent?.id === e.id}
                          onClick={() => setSelectedEvent(e)}
                          className="btn btn-ghost"
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.75rem',
                            textAlign: 'left',
                            fontWeight: selectedEvent?.id === e.id ? 600 : undefined,
                            borderRadius: 0,
                            opacity: hasLoc ? 1 : 0.85,
                          }}
                        >
                          {e.title || 'Sans titre'}
                          {e.place && <span style={{ opacity: 0.9 }}> — {e.place}</span>}
                          {!hasLoc && <span className="meta" style={{ display: 'block', fontSize: '0.85em' }}>sans lieu sur la carte</span>}
                        </button>
                        <Link
                          href="/events"
                          className="btn btn-ghost"
                          style={{ padding: '0.4rem', flexShrink: 0 }}
                          title="Voir les événements"
                          aria-label={`Voir les événements`}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </Link>
                      </div>
                    );
                  })
                )
              )}
            </div>
            {tab === 'bios' && selectedBio && (
              <p className="meta" style={{ marginTop: '0.5rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span>Sélectionnée : <strong>{selectedBio.name}</strong></span>
                <Link href={`/bio/${selectedBio.id}`} className="btn btn-ghost" style={{ padding: '0.2rem 0.35rem' }} title="Voir la biographie">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
                <button type="button" className="btn btn-ghost" style={{ padding: '0 0.35rem', fontSize: '0.9em' }} onClick={() => setSelectedBio(null)}>Réinitialiser</button>
              </p>
            )}
            {tab === 'events' && selectedEvent && (
              <p className="meta" style={{ marginTop: '0.5rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span>Sélectionné : <strong>{selectedEvent.title || 'Sans titre'}</strong></span>
                <Link href="/events" className="btn btn-ghost" style={{ padding: '0.2rem 0.35rem' }} title="Voir les événements">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </Link>
                <button type="button" className="btn btn-ghost" style={{ padding: '0 0.35rem', fontSize: '0.9em' }} onClick={() => setSelectedEvent(null)}>Réinitialiser</button>
              </p>
            )}
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <span className="meta" style={{ display: 'block', marginBottom: '0.25rem' }}>Afficher sur la carte</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <input type="radio" name="map-filter" checked={filterMode === 'all'} onChange={() => setFilterMode('all')} />
                Toutes (avec lieu)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="radio" name="map-filter" checked={filterMode === 'selected'} onChange={() => setFilterMode('selected')} />
                Uniquement la sélection
              </label>
              {filterMode === 'selected' && tab === 'bios' && !selectedBio && <p className="meta" style={{ marginTop: '0.25rem', marginBottom: 0 }}>Cliquez sur un nom dans la liste.</p>}
              {filterMode === 'selected' && tab === 'events' && !selectedEvent && <p className="meta" style={{ marginTop: '0.25rem', marginBottom: 0 }}>Cliquez sur un événement dans la liste.</p>}
            </div>
          </div>
          )}
          <div className="card" style={{ flex: 1, minWidth: fullScreenMap ? '100%' : '300px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setFullScreenMap((v) => !v)}
              className="btn btn-ghost"
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                zIndex: 1000,
                padding: '0.4rem',
                borderRadius: 'var(--radius)',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={fullScreenMap ? 'Afficher la liste' : 'Plein écran'}
              aria-label={fullScreenMap ? 'Afficher la liste' : 'Plein écran'}
            >
              {fullScreenMap ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
            <div style={{ flex: 1, minHeight: '400px', height: fullScreenMap ? 'calc(100vh - 12rem)' : '500px' }}>
              {MapComponent ? (
                <MapComponent
                  bios={tab === 'bios' ? biosToShow : []}
                  events={tab === 'events' ? eventsToShow : []}
                  mode={tab}
                  searchCenter={searchCenter}
                  selectedBioId={tab === 'bios' ? selectedBio?.id ?? null : null}
                  selectedEventId={tab === 'events' ? selectedEvent?.id ?? null : null}
                />
              ) : (
                <p className="empty-state">Chargement de la carte…</p>
              )}
            </div>
            {tab === 'bios' && withLocation.length === 0 && (
              <p className="meta" style={{ padding: '0.5rem 0.75rem', margin: 0, borderTop: '1px solid var(--border)' }}>
                Aucun lieu de décès renseigné. Éditez une biographie et utilisez « Choisir sur la carte ».
              </p>
            )}
            {tab === 'events' && eventsWithLocation.length === 0 && (
              <p className="meta" style={{ padding: '0.5rem 0.75rem', margin: 0, borderTop: '1px solid var(--border)' }}>
                Aucun événement avec lieu. Sur la page Événements, utilisez « Choisir sur la carte » pour un événement.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
