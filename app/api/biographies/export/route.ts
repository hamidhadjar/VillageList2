import { NextRequest, NextResponse } from 'next/server';
import { getAllBiographies } from '@/lib/db';
import type { Biography } from '@/lib/types';
import { getImageUrls, normalizeImageUrl } from '@/lib/types';
import { Document, Paragraph, TextRun, Packer, ImageRun } from 'docx';
import { jsPDF } from 'jspdf';
import sharp from 'sharp';

type SortOption = 'name-asc' | 'name-desc' | 'death-asc' | 'death-desc' | 'updated-desc' | 'updated-asc';

function parseDeathDate(dateStr: string | undefined): string {
  if (!dateStr || !dateStr.trim()) return '';
  const s = dateStr.trim();
  const ddmmyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyy) return `${ddmmyy[3]}${ddmmyy[2].padStart(2, '0')}${ddmmyy[1].padStart(2, '0')}`;
  const mmyy = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyy) return `${mmyy[2]}${mmyy[1].padStart(2, '0')}00`;
  const yy = s.match(/^(\d{4})$/);
  if (yy) return `${yy[1]}0000`;
  return s;
}

function filterAndSortBiographies(
  bios: Biography[],
  sort: SortOption,
  nameFilter: string,
  birthFilter: string,
  deathFilter: string
): Biography[] {
  const filtered = bios.filter((bio) => {
    const nameMatch = !nameFilter.trim() || bio.name.toLowerCase().includes(nameFilter.trim().toLowerCase());
    const birthMatch = !birthFilter.trim() || (bio.birthDate ?? '').toLowerCase().includes(birthFilter.trim().toLowerCase());
    const deathMatch = !deathFilter.trim() || (bio.deathDate ?? '').toLowerCase().includes(deathFilter.trim().toLowerCase());
    return nameMatch && birthMatch && deathMatch;
  });
  const list = [...filtered];
  const updatedAt = (bio: Biography) => bio.lastEditedAt || bio.updatedAt || '';
  if (sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  else if (sort === 'name-desc') list.sort((a, b) => b.name.localeCompare(a.name, 'fr'));
  else if (sort === 'death-asc') list.sort((a, b) => parseDeathDate(a.deathDate).localeCompare(parseDeathDate(b.deathDate)));
  else if (sort === 'death-desc') list.sort((a, b) => parseDeathDate(b.deathDate).localeCompare(parseDeathDate(a.deathDate)));
  else if (sort === 'updated-desc') list.sort((a, b) => updatedAt(b).localeCompare(updatedAt(a)));
  else if (sort === 'updated-asc') list.sort((a, b) => updatedAt(a).localeCompare(updatedAt(b)));
  return list;
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

async function fetchAllImagesForBio(bio: Biography, origin: string): Promise<ImageData[]> {
  const urls = getImageUrls(bio).map((u) => normalizeImageUrl(u)).filter(Boolean);
  const results = await Promise.all(urls.map((url) => fetchImageData(url, origin)));
  return results.filter((r): r is ImageData => r !== null);
}

function addOneBioToPdf(
  doc: jsPDF,
  bio: Biography,
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

  function addLabel(label: string, value: string): void {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    addBlock(`${label} ${value}`);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
  }

  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  addBlock('Biographie', 14);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  y += 4;

  addLabel('Nom :', bio.name);
  if (bio.title) addLabel('Titre :', bio.title);
  if (bio.birthDate) addLabel('Date de naissance :', bio.birthDate);
  if (bio.deathDate) addLabel('Date de décès :', bio.deathDate);
  y += 2;

  if (images.length > 0) {
    addBlock('Photos', 11);
    y += 2;
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

  addLabel('Résumé :', '');
  addBlock(bio.summary);
  y += 2;

  addLabel('Biographie complète :', '');
  const paragraphs = bio.fullBio.split(/\n+/).filter((p) => p.trim());
  for (const p of paragraphs) {
    addBlock(p.trim());
  }
}

function buildPdfAll(bios: Biography[], imagesPerBio: ImageData[][]): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  for (let i = 0; i < bios.length; i++) {
    addOneBioToPdf(doc, bios[i], imagesPerBio[i] ?? [], i > 0);
  }
  return Buffer.from(doc.output('arraybuffer'));
}

function paragraphsForOneBio(bio: Biography, images: ImageData[]): Paragraph[] {
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
    children.push(new Paragraph({ spacing: { after: 240 } }));
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
  return children;
}

async function buildDocxAll(bios: Biography[], imagesPerBio: ImageData[][]): Promise<Buffer> {
  const allChildren: Paragraph[] = [];
  for (let i = 0; i < bios.length; i++) {
    if (i > 0) {
      allChildren.push(new Paragraph({ children: [new TextRun({ text: '—————————————————————', size: 18 })], spacing: { after: 400 } }));
    }
    allChildren.push(...paragraphsForOneBio(bios[i], imagesPerBio[i] ?? []));
  }

  const doc = new Document({
    sections: [{ properties: {}, children: allChildren }],
  });
  return Packer.toBuffer(doc);
}

const VALID_SORT: SortOption[] = ['name-asc', 'name-desc', 'death-asc', 'death-desc', 'updated-desc', 'updated-asc'];

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format')?.toLowerCase();
  const sort = (request.nextUrl.searchParams.get('sort') ?? 'name-asc') as SortOption;
  const name = request.nextUrl.searchParams.get('name') ?? '';
  const birthDate = request.nextUrl.searchParams.get('birthDate') ?? '';
  const deathDate = request.nextUrl.searchParams.get('deathDate') ?? '';

  if (!format || (format !== 'pdf' && format !== 'docx')) {
    return NextResponse.json(
      { error: 'Format requis : format=pdf ou format=docx' },
      { status: 400 }
    );
  }
  if (!VALID_SORT.includes(sort)) {
    return NextResponse.json({ error: 'Tri invalide' }, { status: 400 });
  }

  const allBios = await getAllBiographies();
  const bios = filterAndSortBiographies(allBios, sort, name, birthDate, deathDate);

  if (bios.length === 0) {
    return NextResponse.json(
      { error: 'Aucune biographie à exporter (vérifiez les filtres).' },
      { status: 400 }
    );
  }

  const origin = request.nextUrl.origin;
  const imagesPerBio: ImageData[][] = [];
  for (const bio of bios) {
    try {
      imagesPerBio.push(await fetchAllImagesForBio(bio, origin));
    } catch {
      imagesPerBio.push([]);
    }
  }

  const filename = format === 'pdf' ? 'biographies.pdf' : 'biographies.docx';
  const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  try {
    if (format === 'pdf') {
      const buffer = buildPdfAll(bios, imagesPerBio);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }
    const buffer = await buildDocxAll(bios, imagesPerBio);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    console.error('Export all error:', e);
    return NextResponse.json(
      { error: 'Erreur lors de l’export' },
      { status: 500 }
    );
  }
}
