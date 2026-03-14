'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AskPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setAnswer(data.answer ?? data.error ?? 'Aucune réponse.');
    } catch {
      setAnswer('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
        <div>
          <h1>Poser une question</h1>
          <p className="meta">
            Posez une question sur les biographies du village. L’assistant répond en s’appuyant sur les données disponibles.
          </p>
        </div>
        <Link href="/" className="btn btn-ghost">
          Retour à la liste
        </Link>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="ask-question" className="meta" style={{ display: 'block', marginBottom: '0.35rem' }}>
            Votre question
          </label>
          <input
            id="ask-question"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ex. Combien de biographies ? Où sont nées la plupart des personnes ?"
            disabled={loading}
            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '0.75rem' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Recherche…' : 'Envoyer'}
          </button>
        </form>
        {answer && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <p className="meta" style={{ marginBottom: '0.35rem' }}>Réponse</p>
            <p style={{ margin: 0 }}>{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
