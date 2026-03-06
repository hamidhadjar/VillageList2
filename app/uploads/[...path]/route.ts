import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.jfif': 'image/jpeg',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  if (!pathSegments?.length || pathSegments.length > 1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const filename = pathSegments[0];
  if (!filename || filename.includes('..') || path.isAbsolute(filename)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const ext = path.extname(filename).toLowerCase();
  if (!Object.keys(CONTENT_TYPES).includes(ext)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const bytes = fs.readFileSync(filePath);
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
