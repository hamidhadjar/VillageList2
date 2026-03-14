export interface Biography {
  id: string;
  name: string;
  birthDate?: string;
  /** Place name where the person was born (e.g. city, village). */
  birthPlace?: string;
  deathDate?: string;
  title?: string;
  summary: string;
  fullBio: string;
  imageUrl?: string;
  /** Multiple image URLs. Use getImageUrls() to read (handles legacy imageUrl). */
  imageUrls?: string[];
  /** ID of the father's biography. */
  fatherId?: string;
  /** IDs of sons' biographies. */
  sonIds?: string[];
  /** IDs of brothers' biographies. */
  brotherIds?: string[];
  /** ID of the spouse's biography (husband or wife). */
  spouseId?: string;
  /** Place name where the person died (e.g. city, hospital). */
  deathPlace?: string;
  /** GPS latitude where the person died (for map). */
  deathLat?: number;
  /** GPS longitude where the person died (for map). */
  deathLng?: number;
  createdAt: string;
  updatedAt: string;
  lastEditedAt?: string;
  lastEditedBy?: string;
}

/** Resolved relation for display (id + name). */
export interface BiographyRelation {
  id: string;
  name: string;
}

export type BiographyInput = Omit<Biography, 'id' | 'createdAt' | 'updatedAt'>;

/** Ensures path URLs have exactly one leading slash so they resolve correctly from any page. */
export function normalizeImageUrl(url: string): string {
  let u = url.replace(/^\uFEFF/, '').trim();
  if (!u) return u;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  while (u.startsWith('//')) u = u.slice(1);
  return u.startsWith('/') ? u : '/' + u;
}

/** Returns all image URLs for a biography, normalized (leading slash for paths). */
export function getImageUrls(bio: Biography): string[] {
  let urls: string[] = [];
  if (bio.imageUrls != null && Array.isArray(bio.imageUrls)) {
    urls = bio.imageUrls
      .filter((u): u is string => typeof u === 'string')
      .map((u) => normalizeImageUrl(u.trim()))
      .filter((u) => u.length > 0);
  }
  if (urls.length === 0 && typeof bio.imageUrl === 'string') {
    const one = normalizeImageUrl(bio.imageUrl.trim());
    if (one.length > 0) urls = [one];
  }
  return urls;
}
