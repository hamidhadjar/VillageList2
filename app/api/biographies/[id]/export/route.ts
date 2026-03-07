import { NextRequest, NextResponse } from 'next/server';
import { getBiographyById } from '@/lib/db';
import type { Biography } from '@/lib/types';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import { jsPDF } from 'jspdf';

function safeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'biographie';
}

function buildPdf(bio: Biography): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomLimit = pageHeight - margin;
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

  doc.setFontSize(18);
  addBlock(bio.name, 18);
  doc.setFontSize(11);

  if (bio.title) addBlock(bio.title);
  if (bio.birthDate || bio.deathDate) {
    addBlock([bio.birthDate, bio.deathDate].filter(Boolean).join(' — '));
  }

  addBlock(bio.summary);
  const paragraphs = bio.fullBio.split(/\n+/).filter((p) => p.trim());
  for (const p of paragraphs) {
    addBlock(p.trim());
  }

  return Buffer.from(doc.output('arraybuffer'));
}

function buildDocx(bio: Biography): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: bio.name, bold: true, size: 32 })],
      spacing: { after: 200 },
    })
  );

  if (bio.title) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: bio.title, italics: true, size: 22 })],
        spacing: { after: 120 },
      })
    );
  }

  if (bio.birthDate || bio.deathDate) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: [bio.birthDate, bio.deathDate].filter(Boolean).join(' — '),
            size: 22,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: bio.summary, bold: true, size: 24 })],
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

  const baseName = safeFilename(bio.name);
  const filename = format === 'pdf' ? `${baseName}.pdf` : `${baseName}.docx`;
  const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  try {
    if (format === 'pdf') {
      const buffer = buildPdf(bio);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }

    const buffer = await buildDocx(bio);
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
