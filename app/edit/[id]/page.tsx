'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Biography } from '@/lib/types';

export default function EditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [bio, setBio] = useState<Biography | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    title: '',
    birthDate: '',
    deathDate: '',
    summary: '',
    fullBio: '',
  });
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

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
        setBio(data);
        setImageUrl(data.imageUrl);
        setForm({
          name: data.name ?? '',
          title: data.title ?? '',
          birthDate: data.birthDate ?? '',
          deathDate: data.deathDate ?? '',
          summary: data.summary ?? '',
          fullBio: data.fullBio ?? '',
        });
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveImage(false);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let finalImageUrl: string | undefined | null = imageUrl;
      if (removeImage) {
        finalImageUrl = undefined;
      } else if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          setError(data.error || 'Échec du téléchargement de l\'image.');
          setSaving(false);
          return;
        }
        const { url } = await uploadRes.json();
        finalImageUrl = url;
      }
      const res = await fetch(`/api/biographies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          title: form.title.trim() || undefined,
          birthDate: form.birthDate.trim() || undefined,
          deathDate: form.deathDate.trim() || undefined,
          summary: form.summary.trim(),
          fullBio: form.fullBio.trim(),
          imageUrl: removeImage ? null : (finalImageUrl ?? imageUrl ?? null),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Impossible de modifier la biographie.');
        setSaving(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Une erreur s\'est produite.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Modifier la biographie</h1>
        </div>
        <p className="empty-state">Chargement…</p>
      </div>
    );
  }

  if (!bio) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Modifier la biographie</h1>
        </div>
        <p className="empty-state">Biographie introuvable.</p>
        <div className="actions" style={{ justifyContent: 'center' }}>
          <Link href="/" className="btn btn-primary">
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Modifier la biographie</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Photo</label>
          {(imagePreview || (imageUrl && !removeImage)) && (
            <div className="image-preview-wrap">
              <img
                src={imagePreview ?? imageUrl}
                alt={form.name || 'Biographie'}
                className="image-preview"
              />
            </div>
          )}
          <input
            id="picture"
            name="picture"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageChange}
            style={{ marginTop: '0.5rem' }}
          />
          {(imageUrl || imageFile || imagePreview) && !removeImage && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: '0.5rem' }}
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
                setImageUrl(undefined);
                setRemoveImage(true);
              }}
            >
              Supprimer la photo
            </button>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="name">Nom *</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            placeholder="Nom complet"
          />
        </div>
        <div className="form-group">
          <label htmlFor="title">Titre ou fonction</label>
          <input
            id="title"
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            placeholder="ex. Écrivain, Maire"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="birthDate">Date de naissance</label>
            <input
              id="birthDate"
              name="birthDate"
              type="text"
              value={form.birthDate}
              onChange={handleChange}
              placeholder="ex. 1920"
            />
          </div>
          <div className="form-group">
            <label htmlFor="deathDate">Date de décès</label>
            <input
              id="deathDate"
              name="deathDate"
              type="text"
              value={form.deathDate}
              onChange={handleChange}
              placeholder="ex. 1995"
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="summary">Résumé *</label>
          <textarea
            id="summary"
            name="summary"
            required
            value={form.summary}
            onChange={handleChange}
            placeholder="Un bref résumé (affiché dans la liste)"
          />
        </div>
        <div className="form-group">
          <label htmlFor="fullBio">Biographie complète *</label>
          <textarea
            id="fullBio"
            name="fullBio"
            required
            value={form.fullBio}
            onChange={handleChange}
            placeholder="Récit de vie ou description complète"
            style={{ minHeight: '200px' }}
          />
        </div>
        {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
        <div className="actions">
          <Link href="/" className="btn btn-ghost">
            Annuler
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
