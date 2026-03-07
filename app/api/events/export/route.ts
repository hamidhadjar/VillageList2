import { NextRequest, NextResponse } from 'next/server';
import { getAllEvents } from '@/lib/events-db';
import type { Event } from '@/lib/event-types';
import { normalizeImageUrl } from '@/lib/types';
import { Document, Paragraph, TextRun, Packer, ImageRun } from 'docx';
import { jsPDF } from 'jspdf';
import sharp from 'sharp';

type ImageData = { buffer: Buffer; width: number; height: number; format: 'jpeg' | 'png' };

async function fetchImageData(url: string, origin: string): Promise<ImageData | null> {
  const absoluteUrl = url.startsWith('http') ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  try {
    const res = await fetch(absoluteUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const meta = await sharp(buffer).metadata();
    const width = meta.width ?? 100;
    const height = meta.height ?? 100;
    const format = meta.format === 'png' ? 'png' : 'jpeg';
    const outBuffer = format === 'png'
      ? await sharp(buffer).png().toBuffer()
      : await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
    return { buffer: outBuffer, width, height, format };
  } catch {
    return null;
  }
}

function getEventImageUrls(ev: Event): string[] {
  const urls = Array.isArray(ev.imageUrls) ? ev.imageUrls : ev.imageUrl ? [ev.imageUrl] : [];
  return urls.map((u) => normalizeImageUrl(String(u).trim())).filter(Boolean);
}

async function fetchImagesForEvent(ev: Event, origin: string): Promise<ImageData[]> {
  const urls = getEventImageUrls(ev);
  const results = await Promise.all(urls.map((url) => fetchImageData(url, origin)));
  return results.filter((r): r is ImageData => r !== null);
}

function filterEvents(events: Event[], dateFilter: string, placeFilter: string): Event[] {
  return events.filter((ev) => {
    const dateMatch = !dateFilter.trim() || (ev.date ?? '').toLowerCase().includes(dateFilter.trim().toLowerCase());
    const placeMatch = !placeFilter.trim() || (ev.place ?? '').toLowerCase().includes(placeFilter.trim().toLowerCase());
    return dateMatch && placeMatch;
  });
}

function addOneEventToPdf(
  doc: jsPDF,
  ev: Event,
  images: ImageData[],
  startNewPage: boolean
): void {
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomLimit = pageHeight - margin;
  const maxImageHeight = 80;
  let y = margin;
  const lineHeight = 6;

  if (startNewPage) {
    doc.addPage();
    y = margin;
  }

  function addBlock(text: string, fontSize = 11): void {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.setFontSize(fontSize);
    for (const line of lines) {
      if (y > bottomLimit) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += 2;
  }

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  const subtitle = [ev.date, ev.place].filter(Boolean).join(' — ');
  if (subtitle) addBlock(subtitle, 10);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  y += 2;

  addBlock(ev.description ?? '');

  if (images.length > 0) {
    y += 4;
    for (const img of images) {
      if (y > bottomLimit - maxImageHeight) {
        doc.addPage();
        y = margin;
      }
      const scale = Math.min(maxWidth / img.width, maxImageHeight / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      const base64 = img.buffer.toString('base64');
      const dataUrl = `data:image/${img.format};base64,${base64}`;
      try {
        doc.addImage(dataUrl, img.format.toUpperCase() as 'JPEG' | 'PNG', margin, y, w, h);
      } catch {
        // skip
      }
      y += h + 4;
    }
    y += 4;
  }
  y += 6;
}

function buildPdfAll(events: Event[], imagesPerEvent: ImageData[][]): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  for (let i = 0; i < events.length; i++) {
    addOneEventToPdf(doc, events[i], imagesPerEvent[i] ?? [], i > 0);
  }
  return Buffer.from(doc.output('arraybuffer'));
}

function paragraphsForOneEvent(ev: Event, images: ImageData[]): Paragraph[] {
  const children: Paragraph[] = [];
  const subtitle = [ev.date, ev.place].filter(Boolean).join(' — ');
  if (subtitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: subtitle, italics: true, size: 20 })],
        spacing: { after: 120 },
      })
    );
  }
  children.push(
    new Paragraph({
      children: [new TextRun({ text: ev.description ?? '', size: 22 })],
      spacing: { after: images.length > 0 ? 120 : 240 },
    })
  );
  const maxPx = 400;
  for (const img of images) {
    const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: img.buffer,
            transformation: { width: w, height: h },
            type: img.format === 'jpeg' ? 'jpg' : img.format,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }
  if (images.length > 0) {
    children.push(new Paragraph({ spacing: { after: 240 } }));
  }
  return children;
}

async function buildDocxAll(events: Event[], imagesPerEvent: ImageData[][]): Promise<Buffer> {
  const allChildren: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: 'Événements', bold: true, size: 28 })],
      spacing: { after: 400 },
    }),
  ];
  for (let i = 0; i < events.length; i++) {
    if (i > 0) {
      allChildren.push(new Paragraph({ children: [new TextRun({ text: '—————————————————————', size: 18 })], spacing: { after: 400 } }));
    }
    allChildren.push(...paragraphsForOneEvent(events[i], imagesPerEvent[i] ?? []));
  }
  const doc = new Document({
    sections: [{ properties: {}, children: allChildren }],
  });
  return Packer.toBuffer(doc);
}

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format')?.toLowerCase();
  const dateFilter = request.nextUrl.searchParams.get('date') ?? '';
  const placeFilter = request.nextUrl.searchParams.get('place') ?? '';

  if (!format || (format !== 'pdf' && format !== 'docx')) {
    return NextResponse.json(
      { error: 'Format requis : format=pdf ou format=docx' },
      { status: 400 }
    );
  }

  const allEvents = await getAllEvents();
  const events = filterEvents(allEvents, dateFilter, placeFilter);

  if (events.length === 0) {
    return NextResponse.json(
      { error: 'Aucun événement à exporter (vérifiez les filtres).' },
      { status: 400 }
    );
  }

  const origin = request.nextUrl.origin;
  const imagesPerEvent: ImageData[][] = [];
  for (const ev of events) {
    try {
      imagesPerEvent.push(await fetchImagesForEvent(ev, origin));
    } catch {
      imagesPerEvent.push([]);
    }
  }

  const filename = format === 'pdf' ? 'evenements.pdf' : 'evenements.docx';
  const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  try {
    if (format === 'pdf') {
      const buffer = buildPdfAll(events, imagesPerEvent);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }
    const buffer = await buildDocxAll(events, imagesPerEvent);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    console.error('Events export error:', e);
    return NextResponse.json(
      { error: 'Erreur lors de l’export' },
      { status: 500 }
    );
  }
}
