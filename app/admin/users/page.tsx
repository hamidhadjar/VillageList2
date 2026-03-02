'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Role } from '@/lib/user-types';

type UserRow = { id: string; email: string; role: Role; createdAt: string };

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrateur',
  edit: 'Éditeur',
  viewer: 'Lecteur',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', role: 'viewer' as Role });
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: '', role: 'viewer' as Role, password: '' });
  const [forbidden, setForbidden] = useState(false);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
      setForbidden(false);
    } else if (res.status === 403) {
      setUsers([]);
      setForbidden(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password, role: form.role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Erreur');
      return;
    }
    setShowForm(false);
    setForm({ email: '', password: '', role: 'viewer' });
    fetchUsers();
  };

  const handleUpdate = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setError('');
    const body: { email: string; role: Role; password?: string } = {
      email: editForm.email,
      role: editForm.role,
    };
    if (editForm.password.trim()) body.password = editForm.password;
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Erreur');
      return;
    }
    setEditingId(null);
    fetchUsers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) fetchUsers();
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Utilisateurs</h1>
        </div>
        <p className="empty-state">Chargement…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Utilisateurs</h1>
        </div>
        <p className="empty-state">Accès réservé aux administrateurs.</p>
        <Link href="/" className="btn btn-primary">
          Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Utilisateurs</h1>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/" className="btn btn-ghost">Retour</Link>
          {!showForm && (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              Ajouter un utilisateur
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Nouvel utilisateur</h3>
          <div className="form-group">
            <label htmlFor="new-email">Email</label>
            <input
              id="new-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-password">Mot de passe</label>
            <input
              id="new-password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-role">Rôle</label>
            <select
              id="new-role"
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
              className="sort-select"
            >
              <option value="viewer">Lecteur</option>
              <option value="edit">Éditeur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Créer
            </button>
          </div>
        </form>
      )}

      <ul style={{ listStyle: 'none' }}>
        {users.map((u) => (
          <li key={u.id} className="card">
            {editingId === u.id ? (
              <form onSubmit={(e) => handleUpdate(e, u.id)}>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Nouveau mot de passe (laisser vide pour ne pas changer)</label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Rôle</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as Role }))}
                    className="sort-select"
                  >
                    <option value="viewer">Lecteur</option>
                    <option value="edit">Éditeur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
                <div className="actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Enregistrer
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <strong>{u.email}</strong>
                  <span className="meta" style={{ display: 'block', marginTop: '0.25rem' }}>
                    {ROLE_LABEL[u.role]}
                  </span>
                </div>
                <div className="actions" style={{ marginTop: 0 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditingId(u.id);
                      setEditForm({ email: u.email, role: u.role, password: '' });
                      setError('');
                    }}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDelete(u.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
