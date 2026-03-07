import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getEventById, updateEvent, deleteEvent } from '@/lib/events-db';
import { getNextAuthSecret } from '@/lib/nextauth-secret';

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
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || !EDIT_ROLES.includes(token.role as string)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = (await request.json()) as { date?: string; place?: string; description?: string; imageUrls?: string[] };
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((u): u is string => typeof u === 'string').map((u) => u.trim()).filter(Boolean)
      : undefined;
    const updated = await updateEvent(id, {
      date: body.date !== undefined ? (body.date?.trim() || undefined) : undefined,
      place: body.place !== undefined ? (body.place?.trim() || undefined) : undefined,
      description: body.description !== undefined ? (body.description?.trim() ?? '') : undefined,
      imageUrls: imageUrls !== undefined ? (imageUrls.length ? imageUrls : []) : undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'Impossible de modifier l’événement' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req: request, secret: getNextAuthSecret() });
  if (!token || (token.role as string) !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const deleted = await deleteEvent(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Impossible de supprimer l’événement' }, { status: 500 });
  }
}
