import { NextRequest, NextResponse } from 'next/server';
import { getAllBiographies } from '@/lib/db';
import { getAllEvents } from '@/lib/events-db';
import type { Biography } from '@/lib/types';
import type { Event } from '@/lib/event-types';

const MAX_CONTEXT_CHARS = 14_000;
const RESERVED_FOR_EVENTS = 2_500;

/** Resolve relation IDs to names using the bios list. */
function resolveRelations(bios: Biography[]): {
  nameById: Map<string, string>;
  getFather: (b: Biography) => string | null;
  getBrothers: (b: Biography) => string[];
  getSpouse: (b: Biography) => string | null;
  getSons: (b: Biography) => string[];
} {
  const nameById = new Map<string, string>();
  for (const b of bios) {
    if (b.id && (b.name?.trim() || '')) nameById.set(b.id, b.name.trim());
  }
  return {
    nameById,
    getFather: (b) => (b.fatherId ? nameById.get(b.fatherId) ?? null : null),
    getBrothers: (b) => (b.brotherIds ?? []).map((id) => nameById.get(id)).filter((n): n is string => !!n),
    getSpouse: (b) => (b.spouseId ? nameById.get(b.spouseId) ?? null : null),
    getSons: (b) => (b.sonIds ?? []).map((id) => nameById.get(id)).filter((n): n is string => !!n),
  };
}

/** Build a rich context for the LLM: locations summary, bios (name, places, dates, family relations) + events, capped in size. */
function buildContextSummary(bios: Biography[], events: Event[]): string {
  const parts: string[] = [];
  parts.push(`Nombre total de biographies : ${bios.length}.`);

  // Explicit locations summary: where people were born, where they died, where events took place
  const birthPlaces = Array.from(new Set(bios.map((b) => b.birthPlace?.trim()).filter(Boolean) as string[])).slice(0, 50);
  const deathPlaces = Array.from(new Set(bios.map((b) => b.deathPlace?.trim()).filter(Boolean) as string[])).slice(0, 50);
  const eventPlaces = Array.from(new Set(events.map((e) => e.place?.trim()).filter(Boolean) as string[])).slice(0, 50);
  const locationLines: string[] = [];
  if (birthPlaces.length) locationLines.push(`Lieux de naissance : ${birthPlaces.join(', ')}.`);
  if (deathPlaces.length) locationLines.push(`Lieux de décès : ${deathPlaces.join(', ')}.`);
  if (eventPlaces.length) locationLines.push(`Lieux des événements : ${eventPlaces.join(', ')}.`);
  if (locationLines.length) parts.push('\n' + locationLines.join('\n'));

  const rel = resolveRelations(bios);
  const maxBiosChars = MAX_CONTEXT_CHARS - RESERVED_FOR_EVENTS;
  const bioLines: string[] = [];
  let len = 0;
  const header = 'Biographies (nom | lieu/date naissance | lieu/date décès | père, frères, conjoint, fils):\n';
  len += header.length;
  for (const b of bios) {
    const name = b.name?.trim() || 'Sans nom';
    const birth = [b.birthPlace, b.birthDate].filter(Boolean).join(' ') || '?';
    const death = [b.deathPlace, b.deathDate].filter(Boolean).join(' ') || '?';
    const father = rel.getFather(b);
    const brothers = rel.getBrothers(b);
    const spouse = rel.getSpouse(b);
    const sons = rel.getSons(b);
    const relations: string[] = [];
    if (father) relations.push(`père: ${father}`);
    if (brothers.length) relations.push(`frères: ${brothers.join(', ')}`);
    if (spouse) relations.push(`conjoint: ${spouse}`);
    if (sons.length) relations.push(`fils: ${sons.join(', ')}`);
    const relStr = relations.length ? ` | ${relations.join(' ; ')}` : '';
    const line = `- ${name} | né à ${birth} | décédé à ${death}${relStr}\n`;
    if (len + line.length > maxBiosChars) break;
    bioLines.push(line.trim());
    len += line.length;
  }
  parts.push(header + bioLines.join('\n') + (bioLines.length < bios.length ? '\n… (liste tronquée)' : ''));

  if (events.length > 0) {
    const maxDescLen = 180;
    const eventLines = events.slice(0, 50).map((e) => {
      const t = e.title?.trim() || 'Événement';
      const d = e.date ? ` ${e.date}` : '';
      const p = e.place ? ` à ${e.place}` : '';
      const desc = (e.description?.trim() || '').slice(0, maxDescLen);
      const descSuffix = (e.description?.trim().length ?? 0) > maxDescLen ? '…' : '';
      const descStr = desc ? ` | ${desc}${descSuffix}` : '';
      return `- ${t}${d}${p}${descStr}`;
    });
    parts.push('\nÉvénements (titre, date, lieu, description):\n' + eventLines.join('\n'));
  }

  return parts.join('\n');
}

/** Call Groq (Llama) to answer the question using biography and events context. */
async function askGroq(question: string, contextSummary: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) {
    return 'Configurez GROQ_API_KEY dans .env pour utiliser le chat. (https://console.groq.com)';
  }

  const systemPrompt = `Tu es un assistant qui répond aux questions sur les biographies et les événements d'un village. Les données incluent : des listes de lieux (lieux de naissance, lieux de décès, lieux des événements) ; pour chaque personne (nom, lieu et date de naissance, lieu et date de décès, liens familiaux : père, frères, conjoint, fils) ; pour chaque événement (titre, date, lieu, description). Tu peux répondre aux questions "où", "qui est né à", "qui est mort à", "où a eu lieu l'événement X". Réponds en français, de façon claire et factuelle en t'appuyant uniquement sur les données fournies. Si la réponse n'est pas dans les données, dis-le poliment.

Données disponibles :
${contextSummary}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      max_tokens: 512,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Groq API error:', res.status, err);
    return 'Désolé, une erreur est survenue (Groq). Réessayez ou vérifiez votre clé API.';
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content || 'Désolé, je n\'ai pas pu générer une réponse.';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = typeof body?.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return NextResponse.json({
        answer: 'Posez une question sur les biographies du village.',
      });
    }

    const [bios, events] = await Promise.all([getAllBiographies(), getAllEvents()]);
    const contextSummary = buildContextSummary(bios, events);
    const answer = await askGroq(question, contextSummary);
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lors de la recherche.', answer: '' }, { status: 500 });
  }
}
