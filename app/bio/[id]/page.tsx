'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useShowLastEdited } from '@/app/context/ShowLastEditedContext';
import { Biography, getImageUrls } from '@/lib/types';
import type { Role } from '@/lib/user-types';

const CAN_EDIT: Role[] = ['edit', 'admin'];

function formatLastEdited(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

export default function ViewBioPage() {
  const { data: session } = useSession();
  const { showLastEdited } = useShowLastEdited();
  const role = (session?.user as { role?: Role })?.role;
  const canEdit = role && CAN_EDIT.includes(role);

  const params = useParams();
  const id = params.id as string;
  const [bio, setBio] = useState<Biography | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/biographies/${id}`);
      if (!res.ok) {
        setBio(null);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (!cancelled) {
        const urls = getImageUrls(data);
        setBio({ ...data, imageUrls: urls.length ? urls : undefined, imageUrl: urls[0] });
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Biographie</h1>
        </div>
        <p className="empty-state">Chargement…</p>
      </div>
    );
  }

  if (!bio) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Biographie</h1>
        </div>
        <p className="empty-state">Biographie introuvable.</p>
        <Link href="/" className="btn btn-primary">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h1>Biographie</h1>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/" className="btn btn-ghost">
            Retour à la liste
          </Link>
          {canEdit && (
            <Link href={`/edit/${bio.id}`} className="btn btn-primary">
              Modifier
            </Link>
          )}
        </div>
      </div>

      <article className="card bio-view">
        {(() => {
          const imageUrls = getImageUrls(bio);
          if (imageUrls.length === 0) return null;
          return (
            <div className="bio-view-image-gallery" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {imageUrls.map((url, i) => (
                <div key={`img-${i}-${url}`} className="bio-view-image-wrap" style={{ minHeight: '80px' }}>
                  <img
                    src={url}
                    alt={`${bio.name} ${i + 1}`}
                    className="bio-view-image"
                    style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          );
        })()}
        <h2 className="bio-view-name">{bio.name}</h2>
        {bio.title && <p className="bio-view-title">{bio.title}</p>}
        {(bio.birthDate || bio.deathDate) && (
          <p className="meta bio-view-dates">
            {bio.birthDate && <span>{bio.birthDate}</span>}
            {bio.birthDate && bio.deathDate && ' — '}
            {bio.deathDate && <span>{bio.deathDate}</span>}
          </p>
        )}
        {showLastEdited && (bio.lastEditedAt || bio.lastEditedBy) && (
          <p className="meta bio-view-last-edited">
            Dernière modification{bio.lastEditedAt ? ` le ${formatLastEdited(bio.lastEditedAt)}` : ''}{bio.lastEditedBy ? ` par ${bio.lastEditedBy}` : ''}.
          </p>
        )}
        <p className="bio-view-summary">{bio.summary}</p>
        <div className="bio-view-full">
          {bio.fullBio.split('\n').map((para, i) => (
            <p key={i}>{para || '\u00A0'}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
