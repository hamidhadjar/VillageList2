'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { EditHistoryEntry, DeleteHistoryRange } from '@/lib/edit-history-types';

const ACTION_LABEL: Record<EditHistoryEntry['action'], string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
};

const ENTITY_LABEL: Record<EditHistoryEntry['entityType'], string> = {
  biography: 'Biographie',
  event: 'Événement',
  user: 'Utilisateur',
};

const RANGE_OPTIONS: { value: DeleteHistoryRange; label: string }[] = [
  { value: '1h', label: 'Dernière heure' },
  { value: '1d', label: 'Dernier jour' },
  { value: '7d', label: 'Dernière semaine' },
  { value: '30d', label: 'Dernier mois' },
  { value: 'all', label: 'Tout' },
];

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function AdminHistoryPage() {
  const [entries, setEntries] = useState<EditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState<string>('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRange, setDeleteRange] = useState<DeleteHistoryRange>('7d');
  const [deleteUser, setDeleteUser] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setFetchError(null);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (userFilter.trim()) params.set('user', userFilter.trim());
      const res = await fetch(`/api/admin/history?${params}`, { credentials: 'same-origin' });
      if (res.ok) {
        let data: unknown;
        try {
          data = await res.json();
        } catch {
          data = [];
        }
        setEntries(Array.isArray(data) ? data : []);
        setForbidden(false);
      } else if (res.status === 403) {
        setEntries([]);
        setForbidden(true);
      } else {
        setEntries([]);
        setFetchError(res.status === 500 ? 'Erreur serveur.' : `Erreur ${res.status}`);
      }
    } catch {
      setEntries([]);
      setFetchError('Impossible de charger l’historique.');
    } finally {
      setLoading(false);
    }
  }, [userFilter]);

  useEffect(() => {
    setLoading(true);
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Historique des modifications</h1>
        </div>
        <p className="empty-state">Chargement…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Historique des modifications</h1>
        </div>
        <p className="empty-state">Accès réservé aux administrateurs.</p>
        <Link href="/" className="btn btn-primary">
          Retour
        </Link>
      </div>
    );
  }

  const uniqueEmails = Array.from(new Set(entries.map((e) => e.userEmail).filter(Boolean))).sort();

  async function handleDeleteConfirm() {
    setDeleteError(null);
    setDeleting(true);
    try {
      const params = new URLSearchParams({ range: deleteRange });
      if (deleteUser.trim()) params.set('user', deleteUser.trim());
      const res = await fetch(`/api/admin/history?${params}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data?.error ?? 'Erreur lors de la suppression');
        return;
      }
      setDeleteModalOpen(false);
      await loadHistory();
    } catch {
      setDeleteError('Impossible de contacter le serveur.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Historique des modifications</h1>
        <p className="page-header-count">
          <strong>{entries.length}</strong> action{entries.length !== 1 ? 's' : ''} récente{entries.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="meta">Filtrer par utilisateur :</span>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border)' }}
          >
            <option value="">Tous</option>
            {uniqueEmails.map((email) => (
              <option key={email} value={email}>
                {email}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn"
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            setDeleteError(null);
            setDeleteUser(userFilter);
            setDeleteRange('7d');
            setDeleteModalOpen(true);
          }}
        >
          Vider l’historique
        </button>
      </div>

      {deleteModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !deleting && setDeleteModalOpen(false)}
        >
          <div
            className="card"
            style={{ maxWidth: '420px', width: '90%', margin: '1rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-modal-title" style={{ marginTop: 0 }}>Vider l’historique</h2>
            <p className="meta" style={{ marginBottom: '1rem' }}>
              Choisissez la période à supprimer et éventuellement l’utilisateur concerné.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label>
                <span className="meta" style={{ display: 'block', marginBottom: '0.35rem' }}>Période</span>
                <select
                  value={deleteRange}
                  onChange={(e) => setDeleteRange(e.target.value as DeleteHistoryRange)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                >
                  {RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="meta" style={{ display: 'block', marginBottom: '0.35rem' }}>Pour l’utilisateur (optionnel)</span>
                <select
                  value={deleteUser}
                  onChange={(e) => setDeleteUser(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                >
                  <option value="">Tous les utilisateurs</option>
                  {uniqueEmails.map((email) => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                </select>
              </label>
            </div>
            {deleteError && (
              <p style={{ color: 'var(--danger)', marginTop: '0.75rem', fontSize: '0.9rem' }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn"
                onClick={() => !deleting && setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Suppression…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {fetchError ? (
        <div className="card">
          <p className="empty-state" style={{ color: 'var(--danger)' }}>{fetchError}</p>
          <p className="meta" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            Vérifiez que vous êtes connecté en tant qu’administrateur et réessayez.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card">
          <p className="empty-state">Aucune action enregistrée.</p>
          <p className="meta" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            Les créations, modifications et suppressions de biographies, événements et utilisateurs apparaîtront ici.
          </p>
          <p className="meta" style={{ textAlign: 'center', marginTop: '0.75rem' }}>
            Avec Supabase : exécutez <code style={{ fontSize: '0.9em' }}>docs/supabase-migration-edit-history.sql</code> dans le SQL Editor pour créer la table <code>edit_history</code>.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Utilisateur</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Action</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '0.75rem', fontWeight: 600 }}>Élément</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }} className="meta">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {entry.userEmail}
                    {entry.userRole && (
                      <span className="meta" style={{ marginLeft: '0.35rem' }}>
                        ({entry.userRole})
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{ACTION_LABEL[entry.action]}</td>
                  <td style={{ padding: '0.75rem' }}>{ENTITY_LABEL[entry.entityType]}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {entry.entityLabel ? (
                      <span title={entry.entityId}>{entry.entityLabel}</span>
                    ) : entry.entityId ? (
                      <span className="meta">{entry.entityId.slice(0, 8)}…</span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
