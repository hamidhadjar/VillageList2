import { NextRequest, NextResponse } from 'next/server';
import { getBiographyById } from '@/lib/db';
import type { Biography } from '@/lib/types';
import { getImageUrls, normalizeImageUrl } from '@/lib/types';
import { Document, Paragraph, TextRun, Packer, ImageRun } from 'docx';
import { jsPDF } from 'jspdf';
import sharp from 'sharp';

function safeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'biographie';
}

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

async function fetchAllImages(bio: Biography, origin: string): Promise<ImageData[]> {
  const urls = getImageUrls(bio).map((u) => normalizeImageUrl(u)).filter(Boolean);
  const results = await Promise.all(urls.map((url) => fetchImageData(url, origin)));
  return results.filter((r): r is ImageData => r !== null);
}

function buildPdf(bio: Biography, images: ImageData[]): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomLimit = pageHeight - margin;
  const maxImageWidth = maxWidth;
  const maxImageHeight = 80;
  let y = margin;
  const lineHeight = 6;

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

  function addLabel(label: string, value: string): void {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    addBlock(`${label} ${value}`);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
  }

  // Titre du document
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  addBlock('Biographie', 14);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  y += 4;

  // Nom
  addLabel('Nom :', bio.name);
  if (bio.title) addLabel('Titre :', bio.title);
  if (bio.birthDate) addLabel('Date de naissance :', bio.birthDate);
  if (bio.deathDate) addLabel('Date de décès :', bio.deathDate);
  if (bio.chahid !== false) addLabel('Chahid :', 'Oui');
  y += 2;

  // Photos
  if (images.length > 0) {
    addBlock('Photos', 11);
    y += 2;
    for (const img of images) {
      if (y > bottomLimit - maxImageHeight) {
        doc.addPage();
        y = margin;
      }
      const scale = Math.min(maxImageWidth / img.width, maxImageHeight / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      const base64 = img.buffer.toString('base64');
      const dataUrl = `data:image/${img.format};base64,${base64}`;
      try {
        doc.addImage(dataUrl, img.format.toUpperCase() as 'JPEG' | 'PNG', margin, y, w, h);
      } catch {
        // skip image if jsPDF fails
      }
      y += h + 4;
    }
    y += 4;
  }

  // Résumé
  addLabel('Résumé :', '');
  addBlock(bio.summary);
  y += 2;

  // Biographie complète
  addLabel('Biographie complète :', '');
  const paragraphs = bio.fullBio.split(/\n+/).filter((p) => p.trim());
  for (const p of paragraphs) {
    addBlock(p.trim());
  }

  return Buffer.from(doc.output('arraybuffer'));
}

async function buildDocx(bio: Biography, images: ImageData[]): Promise<Buffer> {
  const children: Paragraph[] = [];

  const label = (title: string, value: string) =>
    new Paragraph({
      children: [
        new TextRun({ text: title, bold: true, size: 20 }),
        new TextRun({ text: ` ${value}`, size: 22 }),
      ],
      spacing: { after: 120 },
    });

  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Biographie', bold: true, size: 28 })],
      spacing: { after: 240 },
    })
  );

  children.push(label('Nom :', bio.name));
  if (bio.title) children.push(label('Titre :', bio.title));
  if (bio.birthDate) children.push(label('Date de naissance :', bio.birthDate));
  if (bio.deathDate) children.push(label('Date de décès :', bio.deathDate));
  if (bio.chahid !== false) children.push(label('Chahid :', 'Oui'));

  if (images.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Photos', bold: true, size: 22 })],
        spacing: { after: 120 },
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
    children.push(
      new Paragraph({
        spacing: { after: 240 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Résumé : ', bold: true, size: 22 }),
        new TextRun({ text: bio.summary, size: 22 }),
      ],
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Biographie complète :', bold: true, size: 22 })],
      spacing: { after: 120 },
    })
  );

  const fullParagraphs = bio.fullBio.split(/\n+/).filter((p) => p.trim());
  for (const p of fullParagraphs) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: p.trim(), size: 22 })],
        spacing: { after: 120 },
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get('format')?.toLowerCase();

  if (!format || (format !== 'pdf' && format !== 'docx')) {
    return NextResponse.json(
      { error: 'Format requis : format=pdf ou format=docx' },
      { status: 400 }
    );
  }

  const bio = await getBiographyById(id);
  if (!bio) {
    return NextResponse.json({ error: 'Biographie introuvable' }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  let images: ImageData[] = [];
  try {
    images = await fetchAllImages(bio, origin);
  } catch (e) {
    console.warn('Export: could not fetch some images', e);
  }

  const baseName = safeFilename(bio.name);
  const filename = format === 'pdf' ? `${baseName}.pdf` : `${baseName}.docx`;
  const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  try {
    if (format === 'pdf') {
      const buffer = buildPdf(bio, images);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }

    const buffer = await buildDocx(bio, images);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    console.error('Export error:', e);
    return NextResponse.json(
      { error: 'Erreur lors de l’export' },
      { status: 500 }
    );
  }
}
