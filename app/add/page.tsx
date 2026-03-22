'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { normalizeImageUrl } from '@/lib/types';
import type { Biography } from '@/lib/types';
import { parseDateForInput } from '@/lib/date-input';
import { SearchablePersonMultiSelect } from '@/app/components/SearchablePersonMultiSelect';
import { MapPickerModal } from '@/app/components/MapPickerModal';
import { ChahidToggleField } from '@/app/components/ChahidToggleField';

export default function AddPage() {
  const router = useRouter();
  const [allBiographies, setAllBiographies] = useState<Biography[]>([]);
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
  const [birthPlace, setBirthPlace] = useState('');
  const [deathPlace, setDeathPlace] = useState('');
  const [deathLat, setDeathLat] = useState('');
  const [deathLng, setDeathLng] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [fatherId, setFatherId] = useState('');
  const [spouseId, setSpouseId] = useState('');
  const [sonIds, setSonIds] = useState<string[]>([]);
  const [brotherIds, setBrotherIds] = useState<string[]>([]);
  const [chahid, setChahid] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/biographies')
      .then((res) => res.ok ? res.json() : [])
      .then(setAllBiographies)
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const removeImageAt = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const imageUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          cache: 'no-store',
          headers: { 'X-Upload-Index': String(i) },
        });
        const data = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          setError((data as { error?: string }).error || 'Échec du téléchargement d\'une image.');
          setSaving(false);
          return;
        }
        const url = typeof (data as { url?: string }).url === 'string' ? (data as { url: string }).url.trim() : '';
        if (!url) {
          setError('Une image n\'a pas pu être enregistrée (réponse invalide).');
          setSaving(false);
          return;
        }
        imageUrls.push(normalizeImageUrl(url));
      }
      if (imageUrls.length !== imageFiles.length) {
        setError(`${imageUrls.length}/${imageFiles.length} images enregistrées. Réessayez.`);
        setSaving(false);
        return;
      }
      const res = await fetch('/api/biographies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          title: form.title.trim() || undefined,
          birthDate: form.birthDate.trim() || undefined,
          birthPlace: birthPlace.trim() || undefined,
          deathDate: form.deathDate.trim() || undefined,
          summary: form.summary.trim(),
          fullBio: form.fullBio.trim(),
          imageUrls: imageUrls.length ? imageUrls : undefined,
          fatherId: fatherId.trim() || undefined,
          spouseId: spouseId.trim() || undefined,
          sonIds: sonIds.length ? sonIds : undefined,
          brotherIds: brotherIds.length ? brotherIds : undefined,
          deathPlace: deathPlace.trim() || undefined,
          deathLat: deathLat.trim() ? parseFloat(deathLat) : undefined,
          deathLng: deathLng.trim() ? parseFloat(deathLng) : undefined,
          chahid,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Impossible d\'ajouter la biographie.');
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

  return (
    <div className="container">
      <div className="page-header">
        <h1>Ajouter une biographie</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="picture">Photos (plusieurs possibles)</label>
          <input
            id="picture"
            name="picture"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={handleImageChange}
          />
          <p className="meta" style={{ marginTop: '0.25rem' }}>
            Sélectionnez plusieurs fichiers ou ajoutez des photos en plusieurs fois. Cliquez sur « Retirer » pour enlever une photo avant enregistrement.
          </p>
          {imagePreviews.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
              {imagePreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={src} alt={`Aperçu ${i + 1}`} className="image-preview" style={{ maxHeight: '120px', display: 'block' }} />
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.8rem', minWidth: 'auto', zIndex: 1 }}
                    onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); removeImageAt(i); }}
                    aria-label="Retirer cette photo"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
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
        <div className="form-grid-2">
          <div className="form-group">
            <label htmlFor="birthDate">Date de naissance</label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              value={parseDateForInput(form.birthDate)}
              onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label htmlFor="deathDate">Date de décès</label>
            <input
              id="deathDate"
              name="deathDate"
              type="date"
              value={parseDateForInput(form.deathDate)}
              onChange={(e) => setForm((p) => ({ ...p, deathDate: e.target.value }))}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="birthPlace">Lieu de naissance</label>
          <input
            id="birthPlace"
            name="birthPlace"
            type="text"
            value={birthPlace}
            onChange={(e) => setBirthPlace(e.target.value)}
            placeholder="ex. Alger, Tizi Ouzou"
          />
        </div>
        <div className="form-group">
          <label htmlFor="deathPlace">Lieu de décès</label>
          <input
            id="deathPlace"
            name="deathPlace"
            type="text"
            value={deathPlace}
            onChange={(e) => setDeathPlace(e.target.value)}
            placeholder="ex. Alger, Hôpital Mustapha"
          />
        </div>
        <div className="form-group">
          <span className="meta" style={{ display: 'block', marginBottom: '0.35rem' }}>Lieu de décès (GPS)</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowMapPicker(true)}
          >
            Choisir sur la carte
          </button>
        </div>
        <MapPickerModal
          open={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          lat={deathLat}
          lng={deathLng}
          onSelect={(lat, lng) => {
            setDeathLat(String(lat));
            setDeathLng(String(lng));
          }}
        />
        <div className="form-group">
          <ChahidToggleField id="add-chahid" checked={chahid} onChange={setChahid} />
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
        <div className="form-group">
          <label htmlFor="fatherId">Père</label>
          <select
            id="fatherId"
            value={fatherId}
            onChange={(e) => setFatherId(e.target.value)}
            className="sort-select"
          >
            <option value="">— Aucun —</option>
            {allBiographies.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="spouseId">Conjoint(e)</label>
          <select
            id="spouseId"
            value={spouseId}
            onChange={(e) => setSpouseId(e.target.value)}
            className="sort-select"
          >
            <option value="">— Aucun —</option>
            {allBiographies.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <SearchablePersonMultiSelect
          id="sonIds"
          label="Fils (plusieurs possibles)"
          options={allBiographies.map((b) => ({ id: b.id, name: b.name }))}
          value={sonIds}
          onChange={setSonIds}
          searchPlaceholder="Rechercher un fils…"
        />
        <SearchablePersonMultiSelect
          id="brotherIds"
          label="Frères (plusieurs possibles)"
          options={allBiographies.map((b) => ({ id: b.id, name: b.name }))}
          value={brotherIds}
          onChange={setBrotherIds}
          searchPlaceholder="Rechercher un frère…"
        />
        {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
        <div className="actions">
          <Link href="/" className="btn btn-ghost">
            Annuler
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Ajouter la biographie'}
          </button>
        </div>
      </form>
    </div>
  );
}
