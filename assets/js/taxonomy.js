// Enums de contenido. Deben coincidir con templates/item.schema.json.

export const EMPRESAS = [
  { id: 'sagitaz', label: 'Sagitaz' },
  { id: 'woztell', label: 'Woztell' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'transversal', label: 'Transversal' },
];

export const TIPOS = [
  { id: 'novedad', label: 'Novedad' },
  { id: 'video', label: 'Video' },
  { id: 'docs', label: 'Docs' },
  { id: 'caso', label: 'Caso' },
  { id: 'repo', label: 'Repo' },
];

export const ESFUERZO = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' };

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x.label]));
const EMPRESA_LABEL = byId(EMPRESAS);
const TIPO_LABEL = byId(TIPOS);

export const empresaLabel = (id) => EMPRESA_LABEL[id] ?? id;
export const tipoLabel = (id) => TIPO_LABEL[id] ?? id;
export const isEmpresa = (id) => id in EMPRESA_LABEL;
export const isTipo = (id) => id in TIPO_LABEL;
