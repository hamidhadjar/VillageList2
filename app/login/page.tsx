'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import LoginForm from '../components/LoginForm';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  return (
    <>
      <div className="page-header login-header">
        <Image
          src="/logo.png"
          alt="Association Sociale IXULAF - Imaghdacen"
          width={160}
          height={64}
          className="login-logo"
          priority
        />
        <h1>Connexion</h1>
      </div>
      <LoginForm callbackUrl={callbackUrl} />
    </>
  );
}

function LoginPageFallback() {
  return (
    <>
      <div className="page-header login-header">
        <Image
          src="/logo.png"
          alt="Association Sociale IXULAF - Imaghdacen"
          width={160}
          height={64}
          className="login-logo"
          priority
        />
        <h1>Connexion</h1>
      </div>
      <div className="card" style={{ maxWidth: '400px' }}>
        <p className="empty-state">Chargement…</p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="container">
      <Suspense fallback={<LoginPageFallback />}>
        <LoginPageContent />
      </Suspense>
    </div>
  );
}
