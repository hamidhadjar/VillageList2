'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Biography } from '@/lib/types';
import { getImageUrls } from '@/lib/types';

const AVATAR_SIZE = 88;

function PersonCard({ bio }: { bio: Biography }) {
  const imageUrls = getImageUrls(bio);
  const firstImage = imageUrls[0];
  return (
    <Link href={`/bio/${bio.id}`} className="tree-gen-person">
      <div className="tree-gen-avatar-wrap">
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
      {bio.deathDate && <span className="tree-gen-meta">{bio.deathDate}</span>}
    </Link>
  );
}

/** One person in the tree (card only) and below them their sons as a single row of siblings. No duplicate "brothers" row - brothers are the other children in the same row. */
function TreePersonCell({ bio, map, childrenMap }: { bio: Biography; map: Map<string, Biography>; childrenMap: Map<string, Biography[]> }) {
  const sons = childrenMap.get(bio.id) ?? [];

  return (
    <div className="tree-gen-branch">
      <div className="tree-gen-connector-vert" aria-hidden="true" />
      <div className="tree-gen-node">
        <PersonCard bio={bio} />
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
  const sons = childrenMap.get(bio.id) ?? [];
  const brotherIds = bio.brotherIds ?? [];
  const brothers = brotherIds.map((id) => map.get(id)).filter((b): b is Biography => b != null);
  const hasBrothers = brothers.length > 0;

  return (
    <div className="tree-gen-node">
      {hasBrothers ? (
        <div className="tree-gen-siblings-wrap">
          <div className="tree-gen-siblings-connector-h" aria-hidden="true" />
          <div className="tree-gen-siblings-row">
            <div className="tree-gen-self-cell">
              <div className="tree-gen-connector-vert" aria-hidden="true" />
              <PersonCard bio={bio} />
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
          <PersonCard bio={bio} />
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

export default function TreePage() {
  const [biographies, setBiographies] = useState<Biography[]>([]);
  const [loading, setLoading] = useState(true);

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

  const map = new Map(biographies.map((b) => [b.id, b]));

  // Children = union of parent.sonIds and everyone who has parent as fatherId (so tree is correct even if one side is missing)
  const childrenMap = new Map<string, Biography[]>();
  for (const bio of biographies) {
    const fromSonIds = (bio.sonIds ?? []).map((id) => map.get(id)).filter((b): b is Biography => b != null);
    const fromFatherId = biographies.filter((b) => (b.fatherId ?? '').trim() === bio.id);
    const seen = new Set<string>();
    const merged: Biography[] = [];
    for (const b of [...fromSonIds, ...fromFatherId]) {
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      merged.push(b);
    }
    if (merged.length > 0) childrenMap.set(bio.id, merged);
  }

  const hasRelation = (b: Biography) =>
    (b.fatherId && b.fatherId.trim()) ||
    (b.sonIds && b.sonIds.length > 0) ||
    (b.brotherIds && b.brotherIds.length > 0);

  // Not a root if someone lists them as son, or if they have a father (so they appear only under the father)
  const isSonOfSomeone = (b: Biography) =>
    (b.fatherId != null && b.fatherId.trim() !== '') ||
    biographies.some((other) => (other.sonIds ?? []).includes(b.id));

  let roots = biographies.filter((b) => hasRelation(b) && !isSonOfSomeone(b));
  const rootIds = new Set(roots.map((r) => r.id));
  roots = roots.filter((r) => {
    const brothersInRoots = (r.brotherIds ?? []).filter((id) => rootIds.has(id));
    if (brothersInRoots.length === 0) return true;
    const allIds = [r.id, ...brothersInRoots].sort();
    return r.id === allIds[0];
  });

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

  const withRelations = biographies.filter(hasRelation);
  if (withRelations.length === 0) {
    return (
      <div className="container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Arbre généalogique</h1>
        <Link href="/" className="btn btn-ghost">Retour à la liste</Link>
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
