import { NextRequest, NextResponse } from 'next/server';
import { getAllBiographies } from '@/lib/db';
import type { Biography } from '@/lib/types';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import { jsPDF } from 'jspdf';

const toId = (x: string | number | undefined | null): string => (x == null ? '' : String(x).trim());

function buildTreeData(biographies: Biography[]) {
  const map = new Map<string, Biography>();
  for (const b of biographies) {
    const id = toId(b.id) || String(b.id);
    if (id) map.set(id, b);
  }

  const childrenMap = new Map<string, Biography[]>();
  const safeSonIds = (b: Biography): string[] =>
    Array.isArray(b.sonIds) ? b.sonIds.map((id) => toId(id)).filter(Boolean) : [];
  for (const bio of biographies) {
    const parentId = toId(bio.id);
    if (!parentId) continue;
    const fromSonIds = safeSonIds(bio)
      .map((id) => map.get(id))
      .filter((b): b is Biography => b != null);
    const fromFatherId = biographies.filter((b) => toId(b.fatherId) === parentId);
    const seen = new Set<string>();
    const merged: Biography[] = [];
    for (const b of [...fromFatherId, ...fromSonIds]) {
      const bid = toId(b.id) || String(b.id);
      if (!bid || seen.has(bid)) continue;
      seen.add(bid);
      merged.push(b);
    }
    if (merged.length > 0) childrenMap.set(parentId, merged);
  }

  const hasRelation = (b: Biography) => {
    const id = toId(b.id);
    if (!id) return false;
    if (toId(b.fatherId) || (b.sonIds && b.sonIds.length > 0) || (b.brotherIds && b.brotherIds.length > 0))
      return true;
    return biographies.some((o) => toId(o.fatherId) === id);
  };

  const isSonOfSomeone = (b: Biography) => {
    const fatherId = toId(b.fatherId);
    if (fatherId && map.has(fatherId)) return true;
    const myId = toId(b.id) || String(b.id);
    return biographies.some((other) => (other.sonIds ?? []).map(toId).includes(myId));
  };

  let roots = biographies.filter((b) => hasRelation(b) && !isSonOfSomeone(b));
  const rootIds = new Set(roots.map((r) => toId(r.id) || String(r.id)));
  roots = roots.filter((r) => {
    const myId = toId(r.id) || String(r.id);
    const brothersInRoots = (r.brotherIds ?? []).map(toId).filter((id) => id && rootIds.has(id));
    if (brothersInRoots.length === 0) return true;
    const allIds = [myId, ...brothersInRoots].sort();
    return myId === allIds[0];
  });

  return { roots, childrenMap, map };
}

type Line = { indent: number; text: string };

function lineForBio(bio: Biography): string {
  const parts = [bio.name];
  if (bio.birthDate || bio.deathDate) {
    parts.push(` (${[bio.birthDate, bio.deathDate].filter(Boolean).join(' – ')})`);
  }
  return parts.join('');
}

function collectLines(
  bio: Biography,
  childrenMap: Map<string, Biography[]>,
  brothers: Biography[],
  indent: number,
  acc: Line[]
): void {
  const prefix = indent === 0 ? '• ' : '  '.repeat(indent) + '• ';
  let main = prefix + lineForBio(bio);
  if (brothers.length > 0) {
    main += ' — Frères : ' + brothers.map((b) => b.name).join(', ');
  }
  acc.push({ indent, text: main });
  const children = childrenMap.get(toId(bio.id)) ?? [];
  for (const child of children) {
    collectLines(child, childrenMap, [], indent + 1, acc);
  }
}

function buildTreeLines(roots: Biography[], childrenMap: Map<string, Biography[]>, map: Map<string, Biography>): Line[] {
  const lines: Line[] = [];
  for (const r of roots) {
    const brotherIds = r.brotherIds ?? [];
    const brothers = brotherIds.map((id) => map.get(toId(id))).filter((b): b is Biography => b != null);
    collectLines(r, childrenMap, brothers, 0, lines);
  }
  return lines;
}

function buildPdf(lines: Line[]): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomLimit = pageHeight - margin;
  const lineHeight = 6;
  let y = margin;

  doc.setFontSize(16);
  doc.text('Arbre généalogique', margin, y);
  y += lineHeight * 2;

  doc.setFontSize(11);
  for (const { indent, text } of lines) {
    if (y > bottomLimit) {
      doc.addPage();
      y = margin;
    }
    const indentMm = indent * 8;
    const linesSplit = doc.splitTextToSize(text, maxWidth - indentMm);
    for (const line of linesSplit) {
      if (y > bottomLimit) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin + indentMm, y);
      y += lineHeight;
    }
  }
  return Buffer.from(doc.output('arraybuffer'));
}

async function buildDocx(lines: Line[]): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: 'Arbre généalogique', bold: true, size: 28 })],
      spacing: { after: 400 },
    }),
  ];
  for (const { indent, text } of lines) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text, size: 22 })],
        indent: { left: indent * 360 },
        spacing: { after: 120 },
      })
    );
  }
  const doc = new Document({
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(doc);
}

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format')?.toLowerCase();
  if (!format || (format !== 'pdf' && format !== 'docx')) {
    return NextResponse.json(
      { error: 'Format requis : format=pdf ou format=docx' },
      { status: 400 }
    );
  }

  const biographies = await getAllBiographies();
  const { roots, childrenMap, map } = buildTreeData(biographies);

  if (roots.length === 0) {
    return NextResponse.json(
      { error: 'Aucun lien familial dans l’arbre. Ajoutez des pères, fils ou frères.' },
      { status: 400 }
    );
  }

  const lines = buildTreeLines(roots, childrenMap, map);
  const filename = format === 'pdf' ? 'arbre-genealogique.pdf' : 'arbre-genealogique.docx';
  const contentType =
    format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  try {
    if (format === 'pdf') {
      const buffer = buildPdf(lines);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }
    const buffer = await buildDocx(lines);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    console.error('Tree export error:', e);
    return NextResponse.json({ error: 'Erreur lors de l’export' }, { status: 500 });
  }
}
