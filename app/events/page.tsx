'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ date: '', place: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date.trim() || undefined,
          place: form.place.trim() || undefined,
          description: form.description.trim() || 'Sans description',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Impossible d’ajouter l’événement.');
        setSaving(false);
        return;
      }
      setForm({ date: '', place: '', description: '' });
      setEvents((prev) => [data, ...prev]);
    } catch {
      setError('Une erreur s’est produite.');
    }
    setSaving(false);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date.trim() || undefined,
          place: form.place.trim() || undefined,
          description: form.description.trim() || '',
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
      setForm({ date: '', place: '', description: '' });
    } catch {
      setError('Une erreur s’est produite.');
    }
    setSaving(false);
  };

  const startEdit = (ev: Event) => {
    setEditingId(ev.id);
    setForm({
      date: ev.date ?? '',
      place: ev.place ?? '',
      description: ev.description ?? '',
    });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ date: '', place: '', description: '' });
    setError('');
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
        <h1>Événements</h1>
      </div>

      {canEdit && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>
            {editingId ? 'Modifier l’événement' : 'Ajouter un événement'}
          </h2>
          <form
            onSubmit={editingId ? handleSubmitEdit : handleSubmitAdd}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
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
              {editingId && (
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
          {canEdit && (
            <p className="meta" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              Utilisez le formulaire ci-dessus pour en ajouter.
            </p>
          )}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {events.map((ev) => (
            <li key={ev.id} className="card" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
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
          ))}
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
