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
