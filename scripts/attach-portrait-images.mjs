/**
 * Copy portrait images from assets to public/uploads and set imageUrl on matching biographies.
 * Run from project root: node scripts/attach-portrait-images.mjs
 *
 * Requires: assets folder at ../.cursor/projects/c-Users-hadja-Documents-GitHub-villageList2/assets/
 * or set ASSETS_ROOT env to the folder containing the image files.
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const dataDir = join(projectRoot, 'data');
const uploadsDir = join(projectRoot, 'public', 'uploads');

// Name pattern (from filename) -> biography name in DB
const mapping = JSON.parse(readFileSync(join(dataDir, 'image-to-biography-mapping.json'), 'utf-8'));

const assetsRoot = process.env.ASSETS_ROOT || join(process.env.USERPROFILE || process.env.HOME || '', '.cursor', 'projects', 'c-Users-hadja-Documents-GitHub-villageList2', 'assets');

import { readdirSync } from 'fs';

/** Extract pattern from filename: ..._images_Pattern-uuid.png -> Pattern (uuid is 8-4-4-4-12 hex) */
function patternFromFilename(name) {
  const i = name.indexOf('_images_');
  if (i === -1) return null;
  const after = name.slice(i + 8);
  const uuidMatch = after.match(/-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i);
  if (uuidMatch) return after.slice(0, -uuidMatch[0].length);
  return after.replace(/\.png$/, '');
}


const biographiesPath = join(dataDir, 'biographies.json');
let biographies = JSON.parse(readFileSync(biographiesPath, 'utf-8'));
const nameToBio = new Map(biographies.map(b => [b.name.trim().toLowerCase(), b]));

if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

let attached = 0;
const mapArr = mapping;

let files;
try {
  files = readdirSync(assetsRoot);
} catch (e) {
  console.error('Assets folder not found at', assetsRoot);
  console.error('Set ASSETS_ROOT to the folder containing the portrait images.');
  process.exit(1);
}

const patternToBio = new Map(mapArr.map(([pat, name]) => [pat, name]));
// Add lowercase variants for patterns with Md- / md- / EL- etc.
for (const [pat, name] of mapArr) {
  const lower = pat.toLowerCase();
  if (!patternToBio.has(lower)) patternToBio.set(lower, name);
}

for (const filename of files) {
  if (!filename.endsWith('.png')) continue;
  const filePattern = patternFromFilename(filename);
  if (!filePattern) continue;
  const key = filePattern.replace(/\.png$/, '');
  const bioName = patternToBio.get(key) || patternToBio.get(key.replace(/__/g, '_')) || patternToBio.get(key.toLowerCase());
  if (!bioName) continue;
  const bio = nameToBio.get(bioName.trim().toLowerCase());
  if (!bio) {
    console.warn('Biography not found:', bioName);
    continue;
  }
  const srcPath = join(assetsRoot, filename);
  const destPath = join(uploadsDir, `${bio.id}.png`);
  try {
    copyFileSync(srcPath, destPath);
    const url = `/uploads/${bio.id}.png`;
    const idx = biographies.findIndex(b => b.id === bio.id);
    if (idx >= 0) {
      biographies[idx].imageUrl = url;
      biographies[idx].updatedAt = new Date().toISOString();
      attached++;
      console.log('Attached:', bioName);
    }
  } catch (err) {
    console.error('Error', filePattern, err.message);
  }
}

writeFileSync(biographiesPath, JSON.stringify(biographies, null, 2), 'utf-8');
console.log('\nDone. Attached', attached, 'pictures to biographies.');
