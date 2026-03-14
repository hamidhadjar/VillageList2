import { NextRequest, NextResponse } from 'next/server';
import { getAllBiographies } from '@/lib/db';
import { getAllEvents } from '@/lib/events-db';
import type { Biography } from '@/lib/types';
import type { Event } from '@/lib/event-types';

const MAX_CONTEXT_CHARS = 12_000;
const RESERVED_FOR_EVENTS = 2_500;

/** Build a rich context for the LLM: bios (name, places, dates) + events, capped in size. */
function buildContextSummary(bios: Biography[], events: Event[]): string {
  const parts: string[] = [];
  parts.push(`Nombre total de biographies : ${bios.length}.`);

  const maxBiosChars = MAX_CONTEXT_CHARS - RESERVED_FOR_EVENTS;
  const bioLines: string[] = [];
  let len = 0;
  const header = 'Biographies (nom | lieu/date naissance | lieu/date décès):\n';
  len += header.length;
  for (const b of bios) {
    const name = b.name?.trim() || 'Sans nom';
    const birth = [b.birthPlace, b.birthDate].filter(Boolean).join(' ') || '?';
    const death = [b.deathPlace, b.deathDate].filter(Boolean).join(' ') || '?';
    const line = `- ${name} | né à ${birth} | décédé à ${death}\n`;
    if (len + line.length > maxBiosChars) break;
    bioLines.push(line.trim());
    len += line.length;
  }
  parts.push(header + bioLines.join('\n') + (bioLines.length < bios.length ? '\n… (liste tronquée)' : ''));

  if (events.length > 0) {
    const eventLines = events.slice(0, 50).map((e) => {
      const t = e.title?.trim() || 'Événement';
      const d = e.date ? ` ${e.date}` : '';
      const p = e.place ? ` à ${e.place}` : '';
      return `- ${t}${d}${p}`;
    });
    parts.push('\nÉvénements:\n' + eventLines.join('\n'));
  }

  return parts.join('\n');
}

/** Call Groq (Llama) to answer the question using biography and events context. */
async function askGroq(question: string, contextSummary: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey?.trim()) {
    return 'Configurez GROQ_API_KEY dans .env pour utiliser le chat. (https://console.groq.com)';
  }

  const systemPrompt = `Tu es un assistant qui répond aux questions sur les biographies et les événements d'un village. Réponds en français, de façon claire et factuelle en t'appuyant uniquement sur les données fournies ci-dessous. Si la réponse n'est pas dans les données, dis-le poliment.

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
