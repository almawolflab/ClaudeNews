// Carga y consultas sobre data/editions.json y data/items.json.

async function getJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No se pudo cargar ${path} (${res.status})`);
  return res.json();
}

export async function loadData() {
  const [editions, itemsFile] = await Promise.all([getJSON('data/editions.json'), getJSON('data/items.json')]);
  const ediciones = [...editions.ediciones].sort((a, b) => b.desde.localeCompare(a.desde)); // más reciente primero
  const items = itemsFile.items
    .filter((it) => it.estado === 'aprobado')
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.id.localeCompare(b.id));
  return { sitio: editions.sitio, ediciones, items, actualizado: itemsFile.actualizado };
}

/** Ítems cuya fecha cae dentro de la edición (hasta inclusive; null = abierta). */
export const itemsOfEdition = (items, ed) =>
  items.filter((it) => it.fecha >= ed.desde && (!ed.hasta || it.fecha <= ed.hasta));

/** URL principal de un ítem (o null si aún no la tiene). */
export function itemUrl(it) {
  if (it.tipo === 'repo' && it.repoUrl) return it.repoUrl;
  return it.fuente?.url ?? null;
}

export const youtubeThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
