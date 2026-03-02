'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Biography } from '@/lib/types';
import type { Role } from '@/lib/user-types';

type SortOption = 'name-asc' | 'name-desc' | 'death-asc' | 'death-desc';

function parseDeathDate(dateStr: string | undefined): string {
  if (!dateStr || !dateStr.trim()) return '';
  const s = dateStr.trim();
  const ddmmyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyy) return `${ddmmyy[3]}${ddmmyy[2].padStart(2, '0')}${ddmmyy[1].padStart(2, '0')}`;
  const mmyy = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyy) return `${mmyy[2]}${mmyy[1].padStart(2, '0')}00`;
  const yy = s.match(/^(\d{4})$/);
  if (yy) return `${yy[1]}0000`;
  return s;
}

const CAN_EDIT: Role[] = ['edit', 'admin'];

export default function HomePage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: Role })?.role;
  const canEdit = role && CAN_EDIT.includes(role);

  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchName, setSearchName] = useState('');
  const [searchBirthDate, setSearchBirthDate] = useState('');
  const [searchDeathDate, setSearchDeathDate] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

  const filtered = biographies.filter((bio) => {
    const nameMatch = !searchName.trim() || bio.name.toLowerCase().includes(searchName.trim().toLowerCase());
    const birthMatch = !searchBirthDate.trim() || (bio.birthDate ?? '').toLowerCase().includes(searchBirthDate.trim().toLowerCase());
    const deathMatch = !searchDeathDate.trim() || (bio.deathDate ?? '').toLowerCase().includes(searchDeathDate.trim().toLowerCase());
    return nameMatch && birthMatch && deathMatch;
  });

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    else if (sortBy === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name, 'fr'));
    else if (sortBy === 'death-asc') list.sort((a, b) => parseDeathDate(a.deathDate).localeCompare(parseDeathDate(b.deathDate)));
    else if (sortBy === 'death-desc') list.sort((a, b) => parseDeathDate(b.deathDate).localeCompare(parseDeathDate(a.deathDate)));
    return list;
  }, [filtered, sortBy]);

  const fetchBiographies = async () => {
    const res = await fetch('/api/biographies');
    if (res.ok) {
      const data = await res.json();
      setBiographies(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBiographies();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette biographie ?')) return;
    const res = await fetch(`/api/biographies/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBiographies((prev) => prev.filter((b) => b.id !== id));
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Biographies</h1>
        </div>
        <p className="empty-state">Chargement…</p>
      </div>
    );
  }

  const hasFilters = !!(searchName.trim() || searchBirthDate.trim() || searchDeathDate.trim());

  return (
    <div className="container">
      <div className="page-header">
        <h1>Biographies</h1>
        {biographies.length > 0 && (
          <p className="page-header-count">
            {hasFilters ? (
              <>Affichage de <strong>{filtered.length}</strong> sur <strong>{biographies.length}</strong> biographie(s)</>
            ) : (
              <><strong>{biographies.length}</strong> biographie(s) au total</>
            )}
          </p>
        )}
      </div>

      {biographies.length > 0 && (
        <div className="search-bar card">
          <label className="search-bar-label">Recherche</label>
          <div className="search-bar-fields">
            <div className="form-group search-field">
              <label htmlFor="search-name">Nom</label>
              <input
                id="search-name"
                type="text"
                placeholder="Filtrer par nom…"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <div className="form-group search-field">
              <label htmlFor="search-birth">Date de naissance</label>
              <input
                id="search-birth"
                type="text"
                placeholder="ex. 1920"
                value={searchBirthDate}
                onChange={(e) => setSearchBirthDate(e.target.value)}
              />
            </div>
            <div className="form-group search-field">
              <label htmlFor="search-death">Date de décès</label>
              <input
                id="search-death"
                type="text"
                placeholder="ex. 1995"
                value={searchDeathDate}
                onChange={(e) => setSearchDeathDate(e.target.value)}
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
              <option value="name-asc">Nom (A → Z)</option>
              <option value="name-desc">Nom (Z → A)</option>
              <option value="death-asc">Date de décès (ancien → récent)</option>
              <option value="death-desc">Date de décès (récent → ancien)</option>
            </select>
          </div>
        </div>
      )}

      {biographies.length === 0 ? (
        <div className="empty-state">
          <p>Aucune biographie pour le moment.</p>
          {canEdit && (
            <Link href="/add" className="btn btn-primary">
              Ajouter la première biographie
            </Link>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <p>Aucune biographie ne correspond à votre recherche.</p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearchName('');
              setSearchBirthDate('');
              setSearchDeathDate('');
            }}
          >
            Effacer les filtres
          </button>
        </div>
      ) : (
        <ul style={{ listStyle: 'none' }}>
          {sorted.map((bio) => (
            <li key={bio.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                {bio.imageUrl && (
                  <div className="bio-thumb-wrap">
                    <img src={bio.imageUrl} alt="" className="bio-thumb" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: '1.35rem' }}>
                    <Link href={`/bio/${bio.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {bio.name}
                    </Link>
                  </h2>
                  {bio.title && <p className="bio-title">{bio.title}</p>}
                  {(bio.birthDate || bio.deathDate) && (
                    <p className="meta">
                      {bio.birthDate && <span>{bio.birthDate}</span>}
                      {bio.birthDate && bio.deathDate && ' — '}
                      {bio.deathDate && <span>{bio.deathDate}</span>}
                    </p>
                  )}
                  <p className="bio-summary">{bio.summary}</p>
                </div>
                <div className="actions" style={{ marginTop: 0, flexShrink: 0 }}>
                  <Link href={`/bio/${bio.id}`} className="btn btn-ghost">
                    Voir
                  </Link>
                  {canEdit && (
                    <>
                      <Link href={`/edit/${bio.id}`} className="btn btn-ghost">
                        Modifier
                      </Link>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setDeleteId(bio.id)}
                        aria-label="Supprimer"
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>

              {deleteId === bio.id && (
                <div className="overlay" onClick={() => setDeleteId(null)} role="dialog" aria-modal="true">
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <h3>Supprimer cette biographie ?</h3>
                    <p>« {bio.name} » sera définitivement supprimé. Cette action est irréversible.</p>
                    <div className="actions">
                      <button type="button" className="btn btn-ghost" onClick={() => setDeleteId(null)}>
                        Annuler
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDelete(bio.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
