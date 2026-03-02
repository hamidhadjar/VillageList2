'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  return (
    <div className="container">
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
    </div>
  );
}
