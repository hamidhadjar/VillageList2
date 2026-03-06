import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabase } from '@/lib/supabase';

const BUCKET = 'biography-images';
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/pjpeg', // JFIF
];

function getExt(name: string, type: string): string {
  const fromName = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (['.jpg', '.jpeg', '.jfif', '.png', '.gif', '.webp'].includes(fromName)) return fromName;
  if (type === 'image/jpeg' || type === 'image/pjpeg') return '.jpg';
  if (type === 'image/png') return '.png';
  if (type === 'image/gif') return '.gif';
  if (type === 'image/webp') return '.webp';
  return '.jpg';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.jfif')) {
      return NextResponse.json(
        { error: 'Type de fichier non valide. Utilisez JPEG, PNG, GIF ou WebP.' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            'Les téléversements d’images ne sont pas disponibles sur ce déploiement. Configurez Supabase (storage) pour Vercel/Netlify.',
        },
        { status: 503 }
      );
    }

    const ext = getExt(file.name, file.type);
    const filePath = `${crypto.randomUUID()}${ext}`;
    const bytes = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, bytes, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message || 'Échec du téléchargement' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (e) {
    return NextResponse.json({ error: 'Échec du téléchargement' }, { status: 500 });
  }
}
