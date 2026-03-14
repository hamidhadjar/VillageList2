/**
 * Parse a free-form date string into YYYY-MM-DD for use in <input type="date">.
 * Handles: YYYY-MM-DD, DD/MM/YYYY, YYYY, MM/YYYY.
 */
export function parseDateForInput(value: string | undefined): string {
  const s = (value ?? '').trim();
  if (!s) return '';
  // Already ISO
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return s;
  // DD/MM/YYYY or D/M/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const day = d!.padStart(2, '0');
    const month = m!.padStart(2, '0');
    return `${y}-${month}-${day}`;
  }
  // MM/YYYY or M/YYYY
  const my = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (my) {
    const [, m, y] = my;
    return `${y}-${m!.padStart(2, '0')}-01`;
  }
  // YYYY only
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  return '';
}

/** Normalize to [yyyy, mm, dd] (month 1–12) or null if unparseable. */
function parseToParts(value: string | undefined): [number, number, number] | null {
  const s = (value ?? '').trim();
  if (!s) return null;
  // YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return [parseInt(y!, 10), parseInt(m!, 10), parseInt(d!, 10)];
  }
  // DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return [parseInt(y!, 10), parseInt(m!, 10), parseInt(d!, 10)];
  }
  // MM/YYYY
  const my = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (my) {
    const [, m, y] = my;
    return [parseInt(y!, 10), parseInt(m!, 10), 1];
  }
  // YYYY only
  if (/^\d{4}$/.test(s)) return [parseInt(s, 10), 1, 1];
  return null;
}

/**
 * Format a date string for display as day/month/year (DD/MM/YYYY).
 * Falls back to the original string if it can't be parsed.
 */
export function formatDateDisplay(value: string | undefined): string {
  const s = (value ?? '').trim();
  if (!s) return '';
  const parts = parseToParts(s);
  if (!parts) return s;
  const [y, m, d] = parts;
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd}/${mm}/${y}`;
}
