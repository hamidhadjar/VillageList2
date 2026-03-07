'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import type { Role } from '@/lib/user-types';

export function Nav() {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: Role })?.role;

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          <Image
            src="/logo.png"
            alt="Association Sociale IXULAF - Imaghdacen"
            width={120}
            height={48}
            className="nav-logo"
            priority
          />
          <span className="nav-title">Gestion des biographies</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/tree">Arbre généalogique</Link>
          <Link href="/stats">Statistiques</Link>
          {(role === 'admin' || role === 'edit') && (
            <Link href="/add">Ajouter une biographie</Link>
          )}
          {role === 'admin' && (
            <Link href="/admin/users">Utilisateurs</Link>
          )}
          {status === 'loading' ? (
            <span className="nav-muted">Chargement…</span>
          ) : session ? (
            <>
              <span className="nav-muted" title={role}>
                {session.user?.email} ({role === 'admin' ? 'admin' : role === 'edit' ? 'éditeur' : 'lecteur'})
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '0.35rem 0.75rem' }}
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <Link href="/login">Connexion</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
