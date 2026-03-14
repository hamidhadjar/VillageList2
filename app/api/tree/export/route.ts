import { NextRequest, NextResponse } from 'next/server';
import { getAllBiographies } from '@/lib/db';
import type { Biography } from '@/lib/types';
import { getImageUrls, normalizeImageUrl } from '@/lib/types';
import { Document, Paragraph, TextRun, Packer, ImageRun } from 'docx';
import { jsPDF } from 'jspdf';
import sharp from 'sharp';

const toId = (x: string | number | undefined | null): string => (x == null ? '' : String(x).trim());

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
    const outBuffer =
      format === 'png'
        ? await sharp(buffer).png().toBuffer()
        : await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
    return { buffer: outBuffer, width, height, format };
  } catch {
    return null;
  }
}

async function fetchFirstImage(bio: Biography, origin: string): Promise<ImageData | null> {
  const urls = getImageUrls(bio).map((u) => normalizeImageUrl(u)).filter(Boolean);
  if (urls.length === 0) return null;
  return fetchImageData(urls[0], origin);
}

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

// --- PDF: tree view with photos and connector lines ---
const CARD_W = 28;
const CARD_H = 42;
const IMG_SIZE = 22;
const CONN_V = 10;
const CONN_H_GAP = 8;
const CARD_GAP = 6;
const MARGIN = 18;
const LINE_COLOR = [160, 160, 160] as [number, number, number];

function drawConnector(
  doc: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  doc.setDrawColor(...LINE_COLOR);
  doc.setLineWidth(0.4);
  doc.line(x1, y1, x2, y2);
}

function drawCard(
  doc: jsPDF,
  x: number,
  y: number,
  bio: Biography,
  img: ImageData | null,
  pageHeight: number
): boolean {
  if (y + CARD_H > pageHeight - MARGIN) return false;
  if (img) {
    const scale = Math.min(IMG_SIZE / img.width, IMG_SIZE / img.height, 1);
    const w = img.width * scale;
    const h = img.height * scale;
    const cx = x + IMG_SIZE / 2;
    const imgX = cx - w / 2;
    const imgY = y;
    const base64 = img.buffer.toString('base64');
    const dataUrl = `data:image/${img.format};base64,${base64}`;
    try {
      doc.addImage(dataUrl, img.format.toUpperCase() as 'JPEG' | 'PNG', imgX, imgY, w, h);
    } catch {
      // skip
    }
  } else {
    doc.setFillColor(230, 230, 230);
    doc.rect(x, y, IMG_SIZE, IMG_SIZE, 'F');
  }
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const nameY = y + IMG_SIZE + 2;
  const nameLines = doc.splitTextToSize(bio.name, CARD_W - 2);
  for (let i = 0; i < Math.min(2, nameLines.length); i++) {
    doc.text(nameLines[i], x + 1, nameY + i * 3.5);
  }
  if (bio.deathDate) {
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(bio.deathDate.trim().slice(0, 12), x + 1, nameY + 7);
  }
  return true;
}

interface TreeLayout {
  width: number;
  height: number;
  cards: { x: number; y: number; bio: Biography }[];
  lines: { x1: number; y1: number; x2: number; y2: number }[];
}

function layoutTree(
  roots: Biography[],
  brothersMap: Map<string, Biography[]>,
  childrenMap: Map<string, Biography[]>,
  startX: number,
  startY: number
): TreeLayout {
  const cards: { x: number; y: number; bio: Biography }[] = [];
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  let maxWidth = 0;
  let currentY = startY;

  function addRootRow(bios: Biography[]): void {
    const n = bios.length;
    const rowW = n * CARD_W + (n - 1) * CARD_GAP;
    let x = startX + Math.max(0, (maxWidth - rowW) / 2);
    if (maxWidth === 0) maxWidth = rowW;
    for (const bio of bios) {
      cards.push({ x, y: currentY, bio });
      x += CARD_W + CARD_GAP;
    }
    currentY += CARD_H + CONN_V;
  }

  function addChildRow(parentCenterX: number, children: Biography[]): number[] {
    const n = children.length;
    const rowW = n * CARD_W + (n - 1) * CARD_GAP;
    const rowLeft = parentCenterX - rowW / 2;
    const fromY = currentY - CONN_V;
    const toY = currentY;
    const lineY = fromY + CONN_V / 2;
    const centers: number[] = [];
    lines.push({ x1: parentCenterX, y1: fromY, x2: parentCenterX, y2: lineY });
    if (n === 1) {
      lines.push({ x1: parentCenterX, y1: lineY, x2: parentCenterX, y2: toY });
      cards.push({ x: parentCenterX - CARD_W / 2, y: currentY, bio: children[0] });
      centers.push(parentCenterX);
    } else {
      const firstCenter = rowLeft + CARD_W / 2;
      const lastCenter = rowLeft + rowW - CARD_W / 2;
      lines.push({ x1: parentCenterX, y1: lineY, x2: firstCenter, y2: lineY });
      lines.push({ x1: firstCenter, y1: lineY, x2: lastCenter, y2: lineY });
      for (let i = 0; i < n; i++) {
        const cx = rowLeft + i * (CARD_W + CARD_GAP) + CARD_W / 2;
        lines.push({ x1: cx, y1: lineY, x2: cx, y2: toY });
        cards.push({ x: rowLeft + i * (CARD_W + CARD_GAP), y: currentY, bio: children[i] });
        centers.push(cx);
      }
    }
    currentY += CARD_H + CONN_V;
    maxWidth = Math.max(maxWidth, rowW);
    return centers;
  }

  function recurse(bio: Biography, parentCenterX: number): void {
    const children = childrenMap.get(toId(bio.id)) ?? [];
    if (children.length > 0) {
      const childCenters = addChildRow(parentCenterX, children);
      for (let i = 0; i < children.length; i++) {
        recurse(children[i], childCenters[i]);
      }
    }
  }

  for (const r of roots) {
    const brothers = brothersMap.get(toId(r.id)) ?? [];
    const rowBios = [r, ...brothers];
    const n = rowBios.length;
    const rowW = n * CARD_W + (n - 1) * CARD_GAP;
    const rowCenterX = startX + rowW / 2;
    addRootRow(rowBios);
    const children = childrenMap.get(toId(r.id)) ?? [];
    if (children.length > 0) {
      const childCenters = addChildRow(rowCenterX, children);
      for (let i = 0; i < children.length; i++) {
        recurse(children[i], childCenters[i]);
      }
    }
  }

  return {
    width: maxWidth,
    height: currentY - startY,
    cards,
    lines,
  };
}

function buildPdf(
  roots: Biography[],
  childrenMap: Map<string, Biography[]>,
  map: Map<string, Biography>,
  imageMap: Map<string, ImageData | null>
): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  const brotherIdsByRoot = new Map<string, Biography[]>();
  for (const r of roots) {
    const bid = toId(r.id);
    const brotherIds = (r.brotherIds ?? []).map(toId).filter((id) => id && map.has(id));
    brotherIdsByRoot.set(bid, brotherIds.map((id) => map.get(id)!).filter(Boolean));
  }

  const tree = layoutTree(roots, brotherIdsByRoot, childrenMap, MARGIN, MARGIN + 14);
  const totalW = tree.width;
  const offsetX = centerX - totalW / 2 - MARGIN; // so layout (starts at MARGIN) is centered

  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text('Arbre généalogique', pageWidth / 2, MARGIN + 8, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  let pageTop = MARGIN + 14;
  const bottomLimit = pageHeight - MARGIN;

  for (const line of tree.lines) {
    const y1 = line.y1 + pageTop;
    const y2 = line.y2 + pageTop;
    if (y1 > bottomLimit || y2 > bottomLimit) continue;
    drawConnector(doc, line.x1 + offsetX, y1, line.x2 + offsetX, y2);
  }

  for (const card of tree.cards) {
    let y = card.y + pageTop;
    if (y + CARD_H > bottomLimit) {
      doc.addPage();
      pageTop = MARGIN - card.y;
      y = card.y + pageTop;
    }
    const img = imageMap.get(toId(card.bio.id)) ?? null;
    drawCard(doc, card.x + offsetX, y, card.bio, img, pageHeight);
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// --- DOCX: tree-like layout with photos and indent ---
async function buildDocx(
  roots: Biography[],
  childrenMap: Map<string, Biography[]>,
  map: Map<string, Biography>,
  imageMap: Map<string, ImageData | null>
): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: 'Arbre généalogique', bold: true, size: 28 })],
      spacing: { after: 300 },
    }),
  ];

  const imgSize = 48; // pt, small avatar
  function addPersonBlock(bio: Biography, indent: number): void {
    const img = imageMap.get(toId(bio.id));
    const runs: (TextRun | ImageRun)[] = [];
    if (img) {
      const scale = Math.min(imgSize / img.width, imgSize / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      runs.push(
        new ImageRun({
          data: img.buffer,
          transformation: { width: w, height: h },
          type: img.format === 'jpeg' ? 'jpg' : img.format,
        })
      );
      runs.push(new TextRun({ text: '  ', size: 22 }));
    }
    const nameDate = bio.deathDate ? `${bio.name} (${bio.deathDate})` : bio.name;
    runs.push(new TextRun({ text: nameDate, size: 22, bold: true }));
    children.push(
      new Paragraph({
        children: runs,
        indent: { left: indent * 400 },
        spacing: { after: 200 },
      })
    );
  }

  function addTree(bios: Biography[], brothers: Biography[], indent: number): void {
    for (const bio of bios) {
      addPersonBlock(bio, indent);
      const childList = childrenMap.get(toId(bio.id)) ?? [];
      if (childList.length > 0) {
        for (const child of childList) {
          addTree([child], [], indent + 1);
        }
      }
    }
    for (const b of brothers) {
      addPersonBlock(b, indent);
    }
  }

  for (const r of roots) {
    const brothers = (r.brotherIds ?? []).map((id) => map.get(toId(id))).filter((b): b is Biography => b != null);
    addPersonBlock(r, 0);
    for (const bro of brothers) {
      addPersonBlock(bro, 0);
    }
    const childList = childrenMap.get(toId(r.id)) ?? [];
    for (const child of childList) {
      addTree([child], [], 1);
    }
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

  const origin = request.nextUrl.origin;
  const imageMap = new Map<string, ImageData | null>();
  const allBiosInTree = new Set<Biography>();
  function collectBios(bios: Biography[], childrenMap: Map<string, Biography[]>) {
    for (const b of bios) {
      allBiosInTree.add(b);
      const children = childrenMap.get(toId(b.id)) ?? [];
      if (children.length > 0) collectBios(children, childrenMap);
    }
  }
  collectBios(roots, childrenMap);
  for (const r of roots) {
    const brothers = (r.brotherIds ?? []).map((id) => map.get(toId(id))).filter((b): b is Biography => b != null);
    for (const b of brothers) {
      allBiosInTree.add(b);
    }
  }
  for (const bio of Array.from(allBiosInTree)) {
    const img = await fetchFirstImage(bio, origin);
    imageMap.set(toId(bio.id), img);
  }

  const filename = format === 'pdf' ? 'arbre-genealogique.pdf' : 'arbre-genealogique.docx';
  const contentType =
    format === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  try {
    if (format === 'pdf') {
      const buffer = buildPdf(roots, childrenMap, map, imageMap);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    }
    const buffer = await buildDocx(roots, childrenMap, map, imageMap);
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
