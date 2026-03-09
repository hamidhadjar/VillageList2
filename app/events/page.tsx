'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useShowLastEdited } from '@/app/context/ShowLastEditedContext';
import { normalizeImageUrl } from '@/lib/types';
import type { Event } from '@/lib/event-types';
import type { Role } from '@/lib/user-types';
import { parseDateForInput, formatDateDisplay } from '@/lib/date-input';

function formatLastEditedShort(ev: Event): string | null {
  const at = ev.lastEditedAt || ev.updatedAt || ev.createdAt;
  if (!at && !ev.lastEditedBy) return null;
  const parts: string[] = [];
  if (at) {
    try {
      const d = new Date(at);
      parts.push('Modifié le ' + new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(d));
    } catch {
      parts.push('Modifié');
    }
  } else {
    parts.push('Modifié');
  }
  if (ev.lastEditedBy) parts.push('par ' + ev.lastEditedBy);
  return parts.join(' ');
}

type SortOption = 'title-asc' | 'title-desc' | 'date-asc' | 'date-desc' | 'updated-desc' | 'updated-asc';
type ViewMode = 'list' | 'gallery';

const CAN_EDIT: Role[] = ['edit', 'admin'];

export default function EventsPage() {
  const { data: session } = useSession();
  const { showLastEdited, setShowLastEdited } = useShowLastEdited();
  const role = (session?.user as { role?: Role })?.role;
  const canEdit = role && CAN_EDIT.includes(role);
  const canDelete = role === 'admin'; // only admin can delete; editors must not see the delete button

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTitle, setFilterTitle] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterPlace, setFilterPlace] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');
  const [viewMode, setViewMode] = useState<ViewMode>('gallery'); // gallery is the default; list/gallery preference is persisted in localStorage
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', date: '', place: '', description: '', imageUrls: [] as string[] });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredEvents = events.filter((ev) => {
    const titleMatch = !filterTitle.trim() || (ev.title ?? '').toLowerCase().includes(filterTitle.trim().toLowerCase());
    const dateMatch = !filterDate.trim() || (ev.date ?? '').toLowerCase().includes(filterDate.trim().toLowerCase());
    const placeMatch = !filterPlace.trim() || (ev.place ?? '').toLowerCase().includes(filterPlace.trim().toLowerCase());
    return titleMatch && dateMatch && placeMatch;
  });

  const sortedEvents = useMemo(() => {
    const list = [...filteredEvents];
    const updatedAt = (ev: Event) => ev.updatedAt || ev.createdAt || '';
    const titleOrEmpty = (ev: Event) => (ev.title ?? '').toLowerCase();
    const dateOrEmpty = (ev: Event) => (ev.date ?? '').toLowerCase();
    if (sortBy === 'title-asc') list.sort((a, b) => titleOrEmpty(a).localeCompare(titleOrEmpty(b), 'fr'));
    else if (sortBy === 'title-desc') list.sort((a, b) => titleOrEmpty(b).localeCompare(titleOrEmpty(a), 'fr'));
    else if (sortBy === 'date-asc') list.sort((a, b) => dateOrEmpty(a).localeCompare(dateOrEmpty(b), 'fr'));
    else if (sortBy === 'date-desc') list.sort((a, b) => dateOrEmpty(b).localeCompare(dateOrEmpty(a), 'fr'));
    else if (sortBy === 'updated-desc') list.sort((a, b) => updatedAt(b).localeCompare(updatedAt(a)));
    else if (sortBy === 'updated-asc') list.sort((a, b) => updatedAt(a).localeCompare(updatedAt(b)));
    return list;
  }, [filteredEvents, sortBy]);

  const hasActiveFilters = !!(filterTitle.trim() || filterDate.trim() || filterPlace.trim());

  const fetchEvents = async () => {
    const res = await fetch('/api/events');
    if (res.ok) {
      const data = await res.json();
      setEvents(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('eventsViewMode') as ViewMode | null;
      if (saved === 'list' || saved === 'gallery') setViewMode(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('eventsViewMode', viewMode);
    } catch {
      // ignore
    }
  }, [viewMode]);

  const uploadPendingFiles = async (): Promise<string[]> => {
    const uploaded: string[] = [];
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        cache: 'no-store',
        headers: { 'X-Upload-Index': String(i) },
      });
      const data = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error((data as { error?: string }).error || 'Échec du téléchargement.');
      const url = typeof (data as { url?: string }).url === 'string' ? (data as { url: string }).url.trim() : '';
      if (!url) throw new Error('Réponse invalide après upload.');
      uploaded.push(normalizeImageUrl(url));
    }
    return uploaded;
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const newUrls = await uploadPendingFiles();
      const allUrls = [...form.imageUrls, ...newUrls];
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim() || undefined,
          date: form.date.trim() || undefined,
          place: form.place.trim() || undefined,
          description: form.description.trim() || 'Sans description',
          imageUrls: allUrls.length ? allUrls : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Impossible d’ajouter l’événement.');
        setSaving(false);
        return;
      }
      setForm({ title: '', date: '', place: '', description: '', imageUrls: [] });
      setPendingFiles([]);
      pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
      setPendingPreviews([]);
      setShowAddForm(false);
      setEvents((prev) => [data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur s’est produite.');
    }
    setSaving(false);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSaving(true);
    try {
      const newUrls = await uploadPendingFiles();
      const allUrls = [...form.imageUrls, ...newUrls];
      const res = await fetch(`/api/events/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim() || undefined,
          date: form.date.trim() || undefined,
          place: form.place.trim() || undefined,
          description: form.description.trim() || '',
          imageUrls: allUrls,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Impossible de modifier.');
        setSaving(false);
        return;
      }
      setEvents((prev) => prev.map((ev) => (ev.id === editingId ? data : ev)));
      setEditingId(null);
      setForm({ title: '', date: '', place: '', description: '', imageUrls: [] });
      setPendingFiles([]);
      pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
      setPendingPreviews([]);
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur s’est produite.');
    }
    setSaving(false);
  };

  const startEdit = (ev: Event) => {
    setShowAddForm(false);
    setEditingId(ev.id);
    setForm({
      title: ev.title ?? '',
      date: ev.date ?? '',
      place: ev.place ?? '',
      description: ev.description ?? '',
      imageUrls: ev.imageUrls ?? [],
    });
    setPendingFiles([]);
    pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
    setPendingPreviews([]);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setForm({ title: '', date: '', place: '', description: '', imageUrls: [] });
    setPendingFiles([]);
    pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
    setPendingPreviews([]);
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    setPendingFiles((prev) => [...prev, ...files]);
    setPendingPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removeExistingImage = (index: number) => {
    setForm((p) => ({ ...p, imageUrls: p.imageUrls.filter((_, i) => i !== index) }));
  };

  const removePendingImage = (index: number) => {
    URL.revokeObjectURL(pendingPreviews[index]);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPendingPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/events/${deleteId}`, { method: 'DELETE' });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== deleteId));
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Événements</h1>
        </div>
        <p className="empty-state">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header page-header-with-actions">
        <div>
          <h1>Événements</h1>
          {events.length > 0 && (
            <p className="page-header-count">
              {hasActiveFilters ? (
                <>Affichage de <strong>{filteredEvents.length}</strong> sur <strong>{events.length}</strong> événement(s)</>
              ) : (
                <><strong>{events.length}</strong> événement(s) au total</>
              )}
            </p>
          )}
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          {canEdit && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                cancelEdit();
                setShowAddForm(true);
              }}
              style={{ display: showAddForm && !editingId ? 'none' : undefined }}
            >
              Ajouter un événement
            </button>
          )}
          {events.length > 0 && filteredEvents.length > 0 && (
            <>
              <a
                href={`/api/events/export?format=pdf&title=${encodeURIComponent(filterTitle)}&date=${encodeURIComponent(filterDate)}&place=${encodeURIComponent(filterPlace)}&sort=${sortBy}`}
                className="btn btn-ghost"
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                Exporter tout (PDF)
              </a>
              <a
                href={`/api/events/export?format=docx&title=${encodeURIComponent(filterTitle)}&date=${encodeURIComponent(filterDate)}&place=${encodeURIComponent(filterPlace)}&sort=${sortBy}`}
                className="btn btn-ghost"
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                Exporter tout (Word)
              </a>
            </>
          )}
        </div>
      </div>

      {events.length > 0 && (
        <div className="card search-bar" style={{ marginBottom: '1rem' }}>
          <label className="search-bar-label">Recherche</label>
          <div className="search-bar-fields">
            <div className="form-group search-field">
              <label htmlFor="filter-title">Titre</label>
              <input
                id="filter-title"
                type="text"
                placeholder="Filtrer par titre…"
                value={filterTitle}
                onChange={(e) => setFilterTitle(e.target.value)}
              />
            </div>
            <div className="form-group search-field">
              <label htmlFor="filter-date">Date</label>
              <input
                id="filter-date"
                type="text"
                placeholder="ex. 1960, juin"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <div className="form-group search-field">
              <label htmlFor="filter-place">Lieu</label>
              <input
                id="filter-place"
                type="text"
                placeholder="ex. Paris"
                value={filterPlace}
                onChange={(e) => setFilterPlace(e.target.value)}
              />
            </div>
          </div>
          <div className="sort-row">
            <label htmlFor="sort-by" className="sort-label">Trier par</label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="sort-select"
            >
              <option value="title-asc">Titre (A → Z)</option>
              <option value="title-desc">Titre (Z → A)</option>
              <option value="date-asc">Date (ancien → récent)</option>
              <option value="date-desc">Date (récent → ancien)</option>
              <option value="updated-desc">Dernière modification (récent → ancien)</option>
              <option value="updated-asc">Dernière modification (ancien → récent)</option>
            </select>
            <div className="view-toggle" role="group" aria-label="Affichage">
              <button
                type="button"
                className={`btn btn-ghost ${viewMode === 'list' ? 'btn-toggle-active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                Liste
              </button>
              <button
                type="button"
                className={`btn btn-ghost ${viewMode === 'gallery' ? 'btn-toggle-active' : ''}`}
                onClick={() => setViewMode('gallery')}
              >
                Galerie
              </button>
            </div>
            <label className="sort-row-toggle-label">
              <input
                type="checkbox"
                checked={showLastEdited}
                onChange={(e) => setShowLastEdited(e.target.checked)}
                className="sort-row-toggle-checkbox"
              />
              <span className="sort-label">Dernière modif.</span>
            </label>
          </div>
          {hasActiveFilters && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="meta">
                {filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''} affiché{filteredEvents.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setFilterTitle('');
                  setFilterDate('');
                  setFilterPlace('');
                }}
              >
                Effacer les filtres
              </button>
            </div>
          )}
        </div>
      )}

      {canEdit && (showAddForm || editingId) && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>
            {editingId ? 'Modifier l’événement' : 'Ajouter un événement'}
          </h2>
          <form
            onSubmit={editingId ? handleSubmitEdit : handleSubmitAdd}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div className="form-group">
              <label htmlFor="event-title">Titre</label>
              <input
                id="event-title"
                type="text"
                placeholder="ex. Fête du village"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Photos (plusieurs possibles)</label>
              {(form.imageUrls.length > 0 || pendingPreviews.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {form.imageUrls.map((url, i) => (
                    <div key={`e-${i}`} style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={url} alt="" className="image-preview" style={{ maxHeight: '100px', display: 'block', borderRadius: 'var(--radius)' }} />
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem', minWidth: 'auto', zIndex: 1 }}
                        onClick={() => removeExistingImage(i)}
                        aria-label="Retirer cette photo"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                  {pendingPreviews.map((src, i) => (
                    <div key={`p-${i}`} style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={src} alt={`Nouvelle ${i + 1}`} className="image-preview" style={{ maxHeight: '100px', display: 'block', borderRadius: 'var(--radius)' }} />
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem', minWidth: 'auto', zIndex: 1 }}
                        onClick={() => removePendingImage(i)}
                        aria-label="Retirer cette photo"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleImageChange}
                style={{ marginTop: '0.5rem' }}
              />
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="event-date">Date</label>
                <input
                  id="event-date"
                  type="date"
                  value={parseDateForInput(form.date)}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="event-place">Lieu</label>
                <input
                  id="event-place"
                  type="text"
                  placeholder="ex. Paris"
                  value={form.place}
                  onChange={(e) => setForm((p) => ({ ...p, place: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="event-desc">Description *</label>
              <textarea
                id="event-desc"
                required
                placeholder="Description de l’événement"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            {error && <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>}
            <div className="actions">
              {(editingId || showAddForm) && (
                <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                  Annuler
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {events.length === 0 ? (
        <div className="card">
          <p className="empty-state">Aucun événement pour le moment.</p>
          {canEdit && !showAddForm && (
            <p className="meta" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              Cliquez sur « Ajouter un événement » ci-dessus pour en ajouter.
            </p>
          )}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="card">
          <p className="empty-state">Aucun événement ne correspond aux filtres.</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setFilterTitle('');
              setFilterDate('');
              setFilterPlace('');
            }}
          >
            Effacer les filtres
          </button>
        </div>
      ) : viewMode === 'gallery' ? (
        <div className="gallery-grid">
          {sortedEvents.map((ev) => {
            const urls = ev.imageUrls?.length ? ev.imageUrls : (ev.imageUrl ? [ev.imageUrl] : []);
            const firstUrl = urls[0];
            const placeholderLetter = (ev.title ?? 'É').trim().slice(0, 1).toUpperCase() || 'É';
            const shortDesc = ev.description?.trim() ? (ev.description.length > 140 ? ev.description.slice(0, 140).trim() + '…' : ev.description) : '';
            const lastEditedStr = formatLastEditedShort(ev);
            return (
              <div key={ev.id} className="card gallery-card">
                <div className="gallery-media" aria-hidden="true">
                  {firstUrl ? (
                    <img src={firstUrl} alt="" className="gallery-image" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="gallery-placeholder">
                      <span>{placeholderLetter}</span>
                    </div>
                  )}
                </div>
                <div className="gallery-body">
                  <h2 className="gallery-title">{ev.title || 'Sans titre'}</h2>
                  {(ev.date || ev.place) && (
                    <p className="meta" style={{ marginTop: '0.25rem' }}>
                      {ev.date && <span>{formatDateDisplay(ev.date)}</span>}
                      {ev.date && ev.place && ' — '}
                      {ev.place && <span>{ev.place}</span>}
                    </p>
                  )}
                  {showLastEdited && lastEditedStr && (
                    <p className="meta bio-last-edited" style={{ marginTop: '0.25rem' }} title={lastEditedStr}>
                      {lastEditedStr}
                    </p>
                  )}
                  {shortDesc && <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem', lineHeight: 1.4 }}>{shortDesc}</p>}
                  {canEdit && (
                    <div className="actions" style={{ marginTop: '0.75rem' }}>
                      <button type="button" className="btn btn-ghost" onClick={() => startEdit(ev)}>
                        Modifier
                      </button>
                      {canDelete && (
                        <button type="button" className="btn btn-danger" onClick={() => setDeleteId(ev.id)}>
                          Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {sortedEvents.map((ev) => {
            const urls = ev.imageUrls?.length ? ev.imageUrls : (ev.imageUrl ? [ev.imageUrl] : []);
            const lastEditedStr = formatLastEditedShort(ev);
            return (
            <li key={ev.id} className="card" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {urls.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {urls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius)' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ))}
                    </div>
                  )}
                  {ev.title && (
                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.35rem 0', fontWeight: 600 }}>{ev.title}</h3>
                  )}
                  {(ev.date || ev.place) && (
                    <p className="meta" style={{ marginBottom: '0.35rem' }}>
                      {ev.date && <span>{formatDateDisplay(ev.date)}</span>}
                      {ev.date && ev.place && ' — '}
                      {ev.place && <span>{ev.place}</span>}
                    </p>
                  )}
                  {showLastEdited && lastEditedStr && (
                    <p className="meta bio-last-edited" style={{ marginBottom: '0.35rem' }} title={lastEditedStr}>
                      {lastEditedStr}
                    </p>
                  )}
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{ev.description}</p>
                </div>
                {canEdit && (
                  <div className="actions" style={{ marginTop: 0, flexShrink: 0 }}>
                    <button type="button" className="btn btn-ghost" onClick={() => startEdit(ev)}>
                      Modifier
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setDeleteId(ev.id)}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
          })}
        </ul>
      )}

      {deleteId && (
        <div className="overlay" onClick={() => setDeleteId(null)} role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-title">Supprimer cet événement ?</h3>
            <p>Cette action est irréversible.</p>
            <div className="actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(null)}>
                Annuler
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
