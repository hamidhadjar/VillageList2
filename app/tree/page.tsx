'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Biography } from '@/lib/types';
import { getImageUrls } from '@/lib/types';

const AVATAR_SIZE = 88;

function TreePerson({
  bio,
  map,
  depth,
}: {
  bio: Biography;
  map: Map<string, Biography>;
  depth: number;
}) {
  const sonIds = bio.sonIds ?? [];
  const brotherIds = bio.brotherIds ?? [];
  const sons = sonIds.map((id) => map.get(id)).filter((b): b is Biography => b != null);
  const brothers = brotherIds.map((id) => map.get(id)).filter((b): b is Biography => b != null);
  const imageUrls = getImageUrls(bio);
  const firstImage = imageUrls[0];

  return (
    <div className="tree-gen-node">
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
        {brothers.length > 0 && (
          <span className="tree-gen-brothers">
            Frères : {brothers.map((b, i) => (
              <span key={b.id}>{i > 0 ? ', ' : ''}<Link href={`/bio/${b.id}`} onClick={(ev) => ev.stopPropagation()}>{b.name}</Link></span>
            ))}
          </span>
        )}
      </Link>

      {sons.length > 0 && (
        <>
          <div className="tree-gen-connector-down" aria-hidden="true" />
          <div className="tree-gen-children-row">
            {sons.map((son) => (
              <div key={son.id} className="tree-gen-branch">
                <div className="tree-gen-connector-vert" aria-hidden="true" />
                <TreePerson bio={son} map={map} depth={depth + 1} />
              </div>
            ))}
          </div>
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

  const hasRelation = (b: Biography) =>
    (b.fatherId && b.fatherId.trim()) ||
    (b.sonIds && b.sonIds.length > 0) ||
    (b.brotherIds && b.brotherIds.length > 0);

  const isSonOfSomeone = (b: Biography) =>
    biographies.some((other) => (other.sonIds ?? []).includes(b.id));

  const roots = biographies.filter((b) => hasRelation(b) && !isSonOfSomeone(b));

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
        Les personnes avec un père renseigné apparaissent sous leur père. Les frères sont indiqués à côté de chaque nom.
      </p>
      <div className="tree-gen-forest">
        {roots.map((bio) => (
          <TreePerson key={bio.id} bio={bio} map={map} depth={0} />
        ))}
      </div>
    </div>
  );
}
