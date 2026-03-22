'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

const SAVED_EMAIL_KEY = 'loginEmail';

type LoginFormProps = {
  callbackUrl?: string;
};

export default function LoginForm({ callbackUrl = '/' }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedEmailLoaded, setSavedEmailLoaded] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(SAVED_EMAIL_KEY);
      if (v) setEmail(v);
    } catch {
      // ignore
    }
    setSavedEmailLoaded(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError('Email ou mot de passe incorrect.');
      return;
    }
    try {
      localStorage.setItem(SAVED_EMAIL_KEY, email);
    } catch {
      // ignore
    }
    // Full navigation so the session is applied and the biography page loads correctly
    const target = (callbackUrl && callbackUrl !== '/login' && callbackUrl.startsWith('/')) ? callbackUrl : '/';
    window.location.href = target;
  };

  if (!savedEmailLoaded) {
    return (
      <form className="card" style={{ maxWidth: '400px' }}>
        <p className="empty-state">Chargement…</p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: '400px' }}>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
