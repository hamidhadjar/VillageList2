import { NextRequest, NextResponse } from 'next/server';
import { getTokenSafe } from '@/lib/auth-token';
import { getEventById, updateEvent, deleteEvent } from '@/lib/events-db';
import { logEditHistory } from '@/lib/edit-history-db';

const EDIT_ROLES = ['edit', 'admin'];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (e) {
    return NextResponse.json({ error: 'Impossible de charger l’événement' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getTokenSafe(request);
  if (!token || !EDIT_ROLES.includes(token.role as string)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  const now = new Date().toISOString();
  const editorEmail = (token.email as string) ?? '';
  try {
    const body = (await request.json()) as { title?: string; date?: string; place?: string; description?: string; imageUrls?: string[]; eventLat?: number; eventLng?: number };
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((u): u is string => typeof u === 'string').map((u) => u.trim()).filter(Boolean)
      : undefined;
    const updated = await updateEvent(id, {
      title: body.title !== undefined ? (body.title?.trim() || undefined) : undefined,
      date: body.date !== undefined ? (body.date?.trim() || undefined) : undefined,
      place: body.place !== undefined ? (body.place?.trim() || undefined) : undefined,
      eventLat: body.eventLat !== undefined ? (body.eventLat != null ? Number(body.eventLat) : undefined) : undefined,
      eventLng: body.eventLng !== undefined ? (body.eventLng != null ? Number(body.eventLng) : undefined) : undefined,
      description: body.description !== undefined ? (body.description?.trim() ?? '') : undefined,
      imageUrls: imageUrls !== undefined ? (imageUrls.length ? imageUrls : []) : undefined,
      lastEditedAt: now,
      lastEditedBy: editorEmail,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    logEditHistory({
      userEmail: editorEmail,
      userRole: (token.role as string) ?? undefined,
      action: 'update',
      entityType: 'event',
      entityId: id,
      entityLabel: updated.title?.trim() || undefined,
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'Impossible de modifier l’événement' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getTokenSafe(request);
  if (!token || (token.role as string) !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const existing = await getEventById(id);
    const deleted = await deleteEvent(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    logEditHistory({
      userEmail: (token.email as string) ?? '',
      userRole: (token.role as string) ?? undefined,
      action: 'delete',
      entityType: 'event',
      entityId: id,
      entityLabel: existing?.title?.trim() || undefined,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Impossible de supprimer l’événement' }, { status: 500 });
  }
}
