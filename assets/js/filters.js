// Estado de filtros (empresa × tipo + edición) sincronizado con la URL.
import { isEmpresa, isTipo } from './taxonomy.js';

/** Lee ?empresa=&tipo=&edicion= ignorando valores desconocidos. */
export function readState(ediciones) {
  const p = new URLSearchParams(location.search);
  const empresa = p.get('empresa');
  const tipo = p.get('tipo');
  const edicion = p.get('edicion');
  return {
    empresa: isEmpresa(empresa) ? empresa : null,
    tipo: isTipo(tipo) ? tipo : null,
    edicion: ediciones.some((e) => e.id === edicion) ? edicion : ediciones[0].id,
  };
}

/** Escribe el estado en la URL sin recargar (los valores por defecto no se escriben). */
export function writeState(state, ediciones) {
  const p = new URLSearchParams(location.search);
  const set = (k, v) => (v ? p.set(k, v) : p.delete(k));
  set('empresa', state.empresa);
  set('tipo', state.tipo);
  set('edicion', state.edicion === ediciones[0].id ? null : state.edicion);
  const qs = p.toString();
  const url = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
  if (url !== `${location.pathname}${location.search}${location.hash}`) history.pushState(null, '', url);
}

/**
 * Filtro de empresa: Sagitaz, Woztell y Finanzas ven lo suyo más lo Transversal
 * (lo que vale para todo el grupo). El filtro "transversal" muestra solo lo común.
 */
const matchesEmpresa = (it, empresa) =>
  !empresa ||
  it.empresas.includes(empresa) ||
  (empresa !== 'transversal' && it.empresas.includes('transversal'));

export const matches = (it, { empresa, tipo }) => matchesEmpresa(it, empresa) && (!tipo || it.tipo === tipo);

export const applyFilters = (items, state) => items.filter((it) => matches(it, state));
