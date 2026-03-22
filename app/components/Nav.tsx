'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import type { Role } from '@/lib/user-types';

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`nav-tab ${active ? 'nav-tab-active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname() ?? '';
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: Role })?.role;

  const isHome = pathname === '/';
  const isTree = pathname.startsWith('/tree');
  const isStats = pathname.startsWith('/stats');
  const isMap = pathname.startsWith('/map');
  const isAsk = pathname.startsWith('/ask');
  const isEvents = pathname.startsWith('/events');
  const isUsers = pathname.startsWith('/admin/users');
  const isHistory = pathname.startsWith('/admin/history');
  const isLogin = pathname.startsWith('/login');

  return (
    <nav className="nav" role="navigation">
      <div className="nav-inner">
        <div className="nav-top">
          <Link href="/" className="nav-brand" aria-label="Accueil">
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
          <div className="nav-actions">
            {status === 'loading' ? (
              <span className="nav-muted">Chargement…</span>
            ) : session ? (
              <>
                <span className="nav-user" title={role}>
                  {session.user?.email}
                  <span className="nav-role">{role === 'admin' ? 'admin' : role === 'edit' ? 'éditeur' : 'lecteur'}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost nav-btn-outline"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className={`nav-tab nav-tab-action ${isLogin ? 'nav-tab-active' : ''}`}
                aria-current={isLogin ? 'page' : undefined}
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
        <div className="nav-tabs">
          <NavLink href="/" active={isHome}>
            Biographies
          </NavLink>
          <NavLink href="/events" active={isEvents}>
            Événements
          </NavLink>
          <NavLink href="/tree" active={isTree}>
            Arbre généalogique
          </NavLink>
          <NavLink href="/stats" active={isStats}>
            Statistiques
          </NavLink>
          <NavLink href="/map" active={isMap}>
            Carte
          </NavLink>
          <NavLink href="/ask" active={isAsk}>
            Questions
          </NavLink>
          {role === 'admin' && (
            <>
              <NavLink href="/admin/history" active={isHistory}>
                Historique
              </NavLink>
              <NavLink href="/admin/users" active={isUsers}>
                Utilisateurs
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
