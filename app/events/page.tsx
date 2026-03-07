'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { normalizeImageUrl } from '@/lib/types';
import type { Event } from '@/lib/event-types';
import type { Role } from '@/lib/user-types';

const CAN_EDIT: Role[] = ['edit', 'admin'];

export default function EventsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: Role })?.role;
  const canEdit = role && CAN_EDIT.includes(role);
  const canDelete = role === 'admin';

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterPlace, setFilterPlace] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: '', place: '', description: '', imageUrls: [] as string[] });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredEvents = events.filter((ev) => {
    const dateMatch = !filterDate.trim() || (ev.date ?? '').toLowerCase().includes(filterDate.trim().toLowerCase());
    const placeMatch = !filterPlace.trim() || (ev.place ?? '').toLowerCase().includes(filterPlace.trim().toLowerCase());
    return dateMatch && placeMatch;
  });
  const hasActiveFilters = filterDate.trim() !== '' || filterPlace.trim() !== '';

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
      setForm({ date: '', place: '', description: '', imageUrls: [] });
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
      setForm({ date: '', place: '', description: '', imageUrls: [] });
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
    setForm({ date: '', place: '', description: '', imageUrls: [] });
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
              <strong>{filteredEvents.length}</strong> événement{filteredEvents.length !== 1 ? 's' : ''} affiché{filteredEvents.length !== 1 ? 's' : ''}
              {hasActiveFilters && ` sur ${events.length}`}
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
                href={`/api/events/export?format=pdf&date=${encodeURIComponent(filterDate)}&place=${encodeURIComponent(filterPlace)}`}
                className="btn btn-ghost"
                download
                target="_blank"
                rel="noopener noreferrer"
              >
                Exporter tout (PDF)
              </a>
              <a
                href={`/api/events/export?format=docx&date=${encodeURIComponent(filterDate)}&place=${encodeURIComponent(filterPlace)}`}
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
          <label className="search-bar-label">Filtrer</label>
          <div className="search-bar-fields">
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
          {hasActiveFilters && (
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="meta">
                {filteredEvents.length} événement{filteredEvents.length !== 1 ? 's' : ''} affiché{filteredEvents.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
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
                  type="text"
                  placeholder="ex. 15 juin 1960"
                  value={form.date}
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
              setFilterDate('');
              setFilterPlace('');
            }}
          >
            Effacer les filtres
          </button>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {filteredEvents.map((ev) => {
            const urls = ev.imageUrls?.length ? ev.imageUrls : (ev.imageUrl ? [ev.imageUrl] : []);
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
                  {(ev.date || ev.place) && (
                    <p className="meta" style={{ marginBottom: '0.35rem' }}>
                      {ev.date && <span>{ev.date}</span>}
                      {ev.date && ev.place && ' — '}
                      {ev.place && <span>{ev.place}</span>}
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
