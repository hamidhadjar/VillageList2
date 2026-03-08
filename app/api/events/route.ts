import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAllEvents, createEvent } from '@/lib/events-db';
import type { EventInput } from '@/lib/event-types';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

const EDIT_ROLES = ['edit', 'admin'];

export async function GET(_request: NextRequest) {
  try {
    const events = await getAllEvents();
    return NextResponse.json(events);
  } catch (e) {
    return NextResponse.json({ error: 'Impossible de charger les événements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || !EDIT_ROLES.includes(token.role as string)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as EventInput;
    const description = body.description?.trim() ?? '';
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((u): u is string => typeof u === 'string').map((u) => u.trim()).filter(Boolean)
      : undefined;
    const event = await createEvent({
      title: body.title?.trim() || undefined,
      date: body.date?.trim() || undefined,
      place: body.place?.trim() || undefined,
      description: description || 'Sans description',
      imageUrls: imageUrls?.length ? imageUrls : undefined,
    });
    return NextResponse.json(event);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('read-only') || msg.includes('EROFS')) {
      return NextResponse.json(
        { error: 'Enregistrement en lecture seule. Configurez Supabase.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Impossible de créer l’événement' }, { status: 500 });
  }
}
