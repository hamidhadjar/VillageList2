import { NextRequest, NextResponse } from 'next/server';
import { getTokenSafe } from '@/lib/auth-token';
import { getAllEvents, createEvent } from '@/lib/events-db';
import { logEditHistory } from '@/lib/edit-history-db';
import type { EventInput } from '@/lib/event-types';

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
  const token = await getTokenSafe(request);
  if (!token || !EDIT_ROLES.includes(token.role as string)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as EventInput;
    const description = body.description?.trim() ?? '';
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((u): u is string => typeof u === 'string').map((u) => u.trim()).filter(Boolean)
      : undefined;
    const now = new Date().toISOString();
    const editorEmail = (token.email as string) ?? '';
    const event = await createEvent({
      title: body.title?.trim() || undefined,
      date: body.date?.trim() || undefined,
      place: body.place?.trim() || undefined,
      eventLat: body.eventLat != null ? Number(body.eventLat) : undefined,
      eventLng: body.eventLng != null ? Number(body.eventLng) : undefined,
      description: description || 'Sans description',
      imageUrls: imageUrls?.length ? imageUrls : undefined,
      lastEditedAt: now,
      lastEditedBy: editorEmail,
    });
    logEditHistory({
      userEmail: editorEmail,
      userRole: (token.role as string) ?? undefined,
      action: 'create',
      entityType: 'event',
      entityId: event.id,
      entityLabel: event.title?.trim() || undefined,
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
