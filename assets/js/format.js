// Formato de fechas en español. Las fechas de los JSON son AAAA-MM-DD (sin zona horaria).

const toDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const short = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
const long = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

/** "11 nov" */
export const fmtShort = (iso) => short.format(toDate(iso)).replace('.', '');
/** "11 nov 2026" */
export const fmtLong = (iso) => long.format(toDate(iso)).replace('.', '');
/** "18/11/2026" */
export const fmtNumeric = (iso) => iso.split('-').reverse().join('/');
/** "Nº 01" */
export const fmtEditionNumber = (n) => `Nº ${String(n).padStart(2, '0')}`;

/** Dominio legible de una URL: "youtube.com" */
export function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** "owner/repo" a partir de https://github.com/owner/repo */
export function repoSlug(url) {
  try {
    return new URL(url).pathname.replace(/^\/|\/$/g, '');
  } catch {
    return '';
  }
}
