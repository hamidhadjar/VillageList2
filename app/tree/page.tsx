'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Biography } from '@/lib/types';
import { getImageUrls } from '@/lib/types';
import { formatDateDisplay } from '@/lib/date-input';
import { ChahidFilterSegmented } from '@/app/components/ChahidFilterSegmented';

type ChahidFilter = 'all' | 'chahid' | 'non-chahid';

function matchesChahidFilter(bio: Biography, f: ChahidFilter): boolean {
  if (f === 'all') return true;
  if (f === 'chahid') return bio.chahid !== false;
  return bio.chahid === false;
}

const AVATAR_SIZE = 88;

function PersonCard({ bio }: { bio: Biography }) {
  const imageUrls = getImageUrls(bio);
  const firstImage = imageUrls[0];
  const isChahid = bio.chahid !== false;
  return (
    <Link href={`/bio/${bio.id}`} className="tree-gen-person">
      <div className={isChahid ? 'tree-gen-avatar-wrap tree-gen-avatar-wrap--chahid' : 'tree-gen-avatar-wrap'}>
        {firstImage ? (
          <img
            src={firstImage}
            alt=""
            className="tree-gen-avatar"
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        {!firstImage && <div className="tree-gen-avatar-placeholder" />}
      </div>
      <span className="tree-gen-label">{bio.name}</span>
      {bio.deathDate && <span className="tree-gen-meta">{formatDateDisplay(bio.deathDate)}</span>}
    </Link>
  );
}

function normId(b: Biography): string {
  return (b.id != null ? String(b.id) : '').trim();
}

/** Person card with optional spouse side by side. */
function PersonWithSpouse({ bio, map }: { bio: Biography; map: Map<string, Biography> }) {
  const spouseId = bio.spouseId != null ? String(bio.spouseId).trim() : '';
  const spouse = spouseId ? map.get(spouseId) : null;
  if (!spouse) return <PersonCard bio={bio} />;
  return (
    <div className="tree-gen-couple-row">
      <PersonCard bio={bio} />
      <div className="tree-gen-spouse-connector" aria-hidden="true" />
      <PersonCard bio={spouse} />
    </div>
  );
}

/** One person in the tree (card only) and below them their sons as a single row of siblings. No duplicate "brothers" row - brothers are the other children in the same row. */
function TreePersonCell({ bio, map, childrenMap }: { bio: Biography; map: Map<string, Biography>; childrenMap: Map<string, Biography[]> }) {
  const sons = childrenMap.get(normId(bio)) ?? []; // normId so numeric ids from API match map keys

  return (
    <div className="tree-gen-branch">
      <div className="tree-gen-connector-vert" aria-hidden="true" />
      <div className="tree-gen-node">
        <PersonWithSpouse bio={bio} map={map} />
        {sons.length > 0 && (
          <>
            <div className="tree-gen-connector-down" aria-hidden="true" />
            <div className="tree-gen-children-row">
              {sons.map((son) => (
                <TreePersonCell key={son.id} bio={son} map={map} childrenMap={childrenMap} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Root node: can show brothers on same row (only for roots). Sons are below, connected to the father. */
function TreeRoot({ bio, map, childrenMap }: { bio: Biography; map: Map<string, Biography>; childrenMap: Map<string, Biography[]> }) {
  const sons = childrenMap.get(normId(bio)) ?? [];
  const brotherIds = bio.brotherIds ?? [];
  const brothers = brotherIds.map((id) => map.get((id != null ? String(id) : '').trim())).filter((b): b is Biography => b != null);
  const hasBrothers = brothers.length > 0;

  return (
    <div className="tree-gen-node">
      {hasBrothers ? (
        <div className="tree-gen-siblings-wrap">
          <div className="tree-gen-siblings-connector-h" aria-hidden="true" />
          <div className="tree-gen-siblings-row">
            <div className="tree-gen-self-cell">
              <div className="tree-gen-connector-vert" aria-hidden="true" />
              <PersonWithSpouse bio={bio} map={map} />
              {sons.length > 0 && (
                <>
                  <div className="tree-gen-connector-down" aria-hidden="true" />
                  <div className="tree-gen-children-row">
                    {sons.map((son) => (
                      <TreePersonCell key={son.id} bio={son} map={map} childrenMap={childrenMap} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {brothers.map((b) => (
              <div key={b.id} className="tree-gen-brother-cell">
                <div className="tree-gen-connector-vert" aria-hidden="true" />
                <PersonCard bio={b} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <PersonWithSpouse bio={bio} map={map} />
          {sons.length > 0 && (
            <>
              <div className="tree-gen-connector-down" aria-hidden="true" />
              <div className="tree-gen-children-row">
                {sons.map((son) => (
                  <TreePersonCell key={son.id} bio={son} map={map} childrenMap={childrenMap} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Build map, childrenMap, roots from a biography list (used full DB vs Chahid-filtered subset). */
function computeGenealogyTree(biographies: Biography[]) {
  const toId = (x: string | number | undefined | null): string => (x == null ? '' : String(x).trim());
  const map = new Map<string, Biography>();
  for (const b of biographies) {
    const id = toId(b.id) || String(b.id);
    if (id) map.set(id, b);
  }

  const childrenMap = new Map<string, Biography[]>();
  const safeSonIds = (b: Biography): string[] =>
    Array.isArray(b.sonIds) ? b.sonIds.map((id) => toId(id)).filter(Boolean) : [];
  for (const bio of biographies) {
    const parentId = toId(bio.id);
    if (!parentId) continue;
    const fromSonIds = safeSonIds(bio)
      .map((id) => map.get(id))
      .filter((b): b is Biography => b != null);
    const fromFatherId = biographies.filter((b) => toId(b.fatherId) === parentId);
    const seen = new Set<string>();
    const merged: Biography[] = [];
    for (const b of [...fromFatherId, ...fromSonIds]) {
      const bid = toId(b.id) || String(b.id);
      if (!bid || seen.has(bid)) continue;
      seen.add(bid);
      merged.push(b);
    }
    if (merged.length > 0) childrenMap.set(parentId, merged);
  }

  const hasRelation = (b: Biography) => {
    const id = toId(b.id);
    if (!id) return false;
    if (toId(b.fatherId) || (b.sonIds && b.sonIds.length > 0) || (b.brotherIds && b.brotherIds.length > 0))
      return true;
    return biographies.some((o) => toId(o.fatherId) === id);
  };

  const isSonOfSomeone = (b: Biography) => {
    const fatherId = toId(b.fatherId);
    if (fatherId && map.has(fatherId)) return true;
    const myId = toId(b.id) || String(b.id);
    return biographies.some((other) => (other.sonIds ?? []).map(toId).includes(myId));
  };

  let roots = biographies.filter((b) => hasRelation(b) && !isSonOfSomeone(b));
  const rootIds = new Set(roots.map((r) => toId(r.id) || String(r.id)));
  roots = roots.filter((r) => {
    const myId = toId(r.id) || String(r.id);
    const brothersInRoots = (r.brotherIds ?? []).map(toId).filter((id) => id && rootIds.has(id));
    if (brothersInRoots.length === 0) return true;
    const allIds = [myId, ...brothersInRoots].sort();
    return myId === allIds[0];
  });

  const withRelations = biographies.filter(hasRelation);
  return { map, childrenMap, roots, withRelations };
}

export default function TreePage() {
  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [loading, setLoading] = useState(true);
  const [chahidFilter, setChahidFilter] = useState<ChahidFilter>('all');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/biographies')
      .then((res) => res.ok ? res.json() : [])
      .then((data: Biography[]) => {
        if (!cancelled) setBiographies(data);
      })
      .catch(() => { if (!cancelled) setBiographies([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const fullTree = useMemo(() => computeGenealogyTree(biographies), [biographies]);
  const visibleBios = useMemo(
    () => biographies.filter((b) => matchesChahidFilter(b, chahidFilter)),
    [biographies, chahidFilter]
  );
  const filteredTree = useMemo(() => computeGenealogyTree(visibleBios), [visibleBios]);

  const { map, childrenMap, roots } = filteredTree;
  const withRelations = fullTree.withRelations;

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Arbre généalogique</h1>
        </div>
        <p className="empty-state">Chargement…</p>
      </div>
    );
  }

  if (withRelations.length === 0) {
    return (
      <div className="container">
        <div className="page-header page-header-with-actions">
          <h1>Arbre généalogique</h1>
          <Link href="/" className="btn btn-ghost">Retour à la liste</Link>
        </div>
        <div className="card">
          <p className="empty-state">
            Aucun lien familial (père, fils, frères) n’est renseigné pour le moment.
          </p>
          <p className="meta" style={{ marginTop: '0.5rem' }}>
            Modifiez une biographie pour ajouter un père, des fils ou des frères. L’arbre apparaîtra ici.
          </p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Voir les biographies
          </Link>
        </div>
      </div>
    );
  }

  const exportTreeUrl = (format: 'pdf' | 'docx') => {
    const params = new URLSearchParams({ format });
    if (chahidFilter !== 'all') params.set('chahid', chahidFilter);
    return `/api/tree/export?${params.toString()}`;
  };

  if (roots.length === 0 && chahidFilter !== 'all') {
    return (
      <div className="container">
        <div className="page-header page-header-with-actions">
          <h1>Arbre généalogique</h1>
          <Link href="/" className="btn btn-ghost">Retour à la liste</Link>
        </div>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <ChahidFilterSegmented
            id="tree-chahid-filter"
            value={chahidFilter}
            onChange={setChahidFilter}
          />
        </div>
        <div className="card">
          <p className="empty-state">
            Aucun arbre visible avec ce filtre Chahid.
          </p>
          <p className="meta" style={{ marginTop: '0.5rem' }}>
            Essayez « Tous » ou un autre filtre.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header page-header-with-actions">
        <h1>Arbre généalogique</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a
            href={exportTreeUrl('pdf')}
            className="btn btn-ghost"
            download
            rel="noopener noreferrer"
          >
            Export PDF
          </a>
          <a
            href={exportTreeUrl('docx')}
            className="btn btn-ghost"
            download
            rel="noopener noreferrer"
          >
            Export Word
          </a>
          <Link href="/" className="btn btn-ghost">Retour à la liste</Link>
        </div>
      </div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <ChahidFilterSegmented
          id="tree-chahid-filter-main"
          value={chahidFilter}
          onChange={setChahidFilter}
        />
      </div>
      <p className="meta" style={{ marginBottom: '1.5rem' }}>
        Les fils sont reliés au père sous lui ; les frères apparaissent sur la même ligne (même niveau).
      </p>
      <div className="tree-gen-forest">
        {roots.map((bio) => (
          <TreeRoot key={bio.id} bio={bio} map={map} childrenMap={childrenMap} />
        ))}
      </div>
    </div>
  );
}
