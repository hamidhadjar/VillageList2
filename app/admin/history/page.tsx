'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { EditHistoryEntry } from '@/lib/edit-history-types';

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

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/admin/history?limit=200', { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
        setForbidden(false);
      } else if (res.status === 403) {
        setEntries([]);
        setForbidden(true);
      }
      setLoading(false);
    }
    load();
  }, []);

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

  return (
    <div className="container">
      <div className="page-header">
        <h1>Historique des modifications</h1>
        <p className="page-header-count">
          <strong>{entries.length}</strong> action{entries.length !== 1 ? 's' : ''} récente{entries.length !== 1 ? 's' : ''}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="card">
          <p className="empty-state">Aucune action enregistrée.</p>
          <p className="meta" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            Les créations, modifications et suppressions de biographies, événements et utilisateurs apparaîtront ici.
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
