#!/usr/bin/env node
/**
 * Validación de contenido de ClaudeNews (sin dependencias, Node ≥ 18).
 *
 *   node scripts/validate.js            # schema + duplicados + URLs
 *   node scripts/validate.js --offline  # sin comprobar URLs
 *
 * Comprueba:
 *   - data/editions.json contra templates/editions.schema.json
 *   - data/items.json (cada ítem) y data/drafts/*.json contra templates/item.schema.json
 *   - templates/examples/*.json contra el schema (sin red)
 *   - ids duplicados entre items.json y drafts/
 *   - que items.json solo tenga ítems "aprobado"
 *   - que cada ítem aprobado caiga en alguna edición
 *   - que las URLs respondan (status < 400)
 *
 * Sale con código 1 si hay errores. Los avisos (URLs pendientes, etc.) no fallan.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const OFFLINE = process.argv.includes('--offline');
const errors = [];
const warnings = [];

const rel = (p) => path.relative(ROOT, p);
const readJSON = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    errors.push(`${rel(p)}: JSON inválido (${e.message})`);
    return undefined;
  }
};

/* ── Validador mínimo de JSON Schema ─────────────────────────────────────────
 * Cubre el subconjunto que usan nuestros schemas: type, enum, const, required,
 * properties, additionalProperties:false, items, minItems, maxItems,
 * uniqueItems, minLength, maxLength, pattern, format (date, uri), minimum,
 * $ref local (#/$defs/…), allOf e if/then/else.
 */
function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}

function typeMatches(v, t) {
  const actual = typeOf(v);
  if (t === 'number') return actual === 'number' || actual === 'integer';
  return actual === t;
}

const FORMATS = {
  date: (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')),
  uri: (s) => {
    try {
      const u = new URL(s);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  },
};

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`$ref no soportado: ${ref}`);
  return ref.slice(2).split('/').reduce((o, k) => o[k], root);
}

function validate(schema, value, root = schema, at = '') {
  const out = [];
  const err = (msg) => out.push(`${at || '(raíz)'}: ${msg}`);

  if (schema.$ref) return validate(resolveRef(root, schema.$ref), value, root, at);

  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((t) => typeMatches(value, t))) {
      err(`tipo ${typeOf(value)}, se esperaba ${types.join(' | ')}`);
      return out;
    }
  }
  if (schema.const !== undefined && value !== schema.const) err(`debe ser ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) err(`"${value}" no está en [${schema.enum.join(', ')}]`);

  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) err(`mínimo ${schema.minLength} caracteres`);
    if (schema.maxLength != null && value.length > schema.maxLength) err(`máximo ${schema.maxLength} caracteres`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) err(`no cumple el patrón ${schema.pattern}`);
    if (schema.format && FORMATS[schema.format] && !FORMATS[schema.format](value)) err(`formato ${schema.format} inválido`);
  }
  if (typeof value === 'number' && schema.minimum != null && value < schema.minimum) err(`mínimo ${schema.minimum}`);

  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) err(`mínimo ${schema.minItems} elementos`);
    if (schema.maxItems != null && value.length > schema.maxItems) err(`máximo ${schema.maxItems} elementos`);
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) err('elementos repetidos');
    if (schema.items) value.forEach((v, i) => out.push(...validate(schema.items, v, root, `${at}[${i}]`)));
  }

  if (typeOf(value) === 'object') {
    for (const k of schema.required || []) if (!(k in value)) err(`falta "${k}"`);
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(value)) {
      if (props[k]) out.push(...validate(props[k], v, root, at ? `${at}.${k}` : k));
      else if (schema.additionalProperties === false) err(`propiedad no permitida "${k}"`);
    }
  }

  for (const sub of schema.allOf || []) out.push(...validate(sub, value, root, at));
  if (schema.if) {
    const branch = validate(schema.if, value, root, at).length === 0 ? schema.then : schema.else;
    if (branch) out.push(...validate(branch, value, root, at));
  }
  return out;
}

/* ── Carga ──────────────────────────────────────────────────────────────── */
const itemSchema = readJSON(path.join(ROOT, 'templates/item.schema.json'));
const editionsSchema = readJSON(path.join(ROOT, 'templates/editions.schema.json'));
const editionsPath = path.join(ROOT, 'data/editions.json');
const itemsPath = path.join(ROOT, 'data/items.json');
const editions = readJSON(editionsPath);
const itemsFile = readJSON(itemsPath);

const listJSON = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(dir, f))
    : [];

const report = (file, problems) => problems.forEach((p) => errors.push(`${file} → ${p}`));
const urls = []; // { url, where }

/* ── editions.json ──────────────────────────────────────────────────────── */
if (editions && editionsSchema) {
  report(rel(editionsPath), validate(editionsSchema, editions));
  const ids = new Set();
  for (const ed of editions.ediciones || []) {
    if (ids.has(ed.id)) errors.push(`${rel(editionsPath)} → edición duplicada "${ed.id}"`);
    ids.add(ed.id);
    if (ed.hasta && ed.desde > ed.hasta) errors.push(`${rel(editionsPath)} → edición "${ed.id}": desde > hasta`);
  }
  for (const r of editions.sitio?.recursos || []) {
    if (r.url) urls.push({ url: r.url, where: `recurso ${r.id}` });
    else warnings.push(`recurso "${r.id}" sin url: no se muestra`);
  }
}

/* ── items.json + drafts ────────────────────────────────────────────────── */
const seen = new Map(); // id → archivo
function checkItem(item, where, { network = true } = {}) {
  if (!itemSchema) return;
  report(where, validate(itemSchema, item));
  if (item && item.id) {
    if (seen.has(item.id)) errors.push(`${where} → id duplicado "${item.id}" (ya en ${seen.get(item.id)})`);
    else seen.set(item.id, where);
  }
  if (!network || !item) return;
  const label = `${where} (${item.id})`;
  if (item.fuente?.url) urls.push({ url: item.fuente.url, where: label });
  else warnings.push(`${label}: fuente.url pendiente (null)`);
  if (item.tipo === 'repo') {
    if (item.repoUrl) urls.push({ url: item.repoUrl, where: label });
    else warnings.push(`${label}: repoUrl pendiente (null)`);
  }
  if (item.tipo === 'video') {
    if (item.youtubeId) urls.push({ url: `https://www.youtube.com/watch?v=${item.youtubeId}`, where: label });
    else warnings.push(`${label}: youtubeId pendiente (null)`);
  }
}

if (itemsFile) {
  const where = rel(itemsPath);
  if (!FORMATS.date(String(itemsFile.actualizado))) errors.push(`${where} → "actualizado" debe ser AAAA-MM-DD`);
  if (!Array.isArray(itemsFile.items)) errors.push(`${where} → "items" debe ser un array`);
  else {
    const eds = editions?.ediciones || [];
    itemsFile.items.forEach((item, i) => {
      const w = `${where}[${i}]`;
      checkItem(item, w);
      if (item?.estado && item.estado !== 'aprobado') errors.push(`${w} → items.json solo admite estado "aprobado" (tiene "${item.estado}")`);
      if (item?.fecha && eds.length && !eds.some((e) => item.fecha >= e.desde && (!e.hasta || item.fecha <= e.hasta)))
        warnings.push(`${w} (${item.id}): la fecha ${item.fecha} no cae en ninguna edición; no se mostrará`);
    });
  }
}

for (const f of listJSON(path.join(ROOT, 'data/drafts'))) {
  const item = readJSON(f);
  if (item === undefined) continue;
  checkItem(item, rel(f));
  if (item.estado !== 'borrador') warnings.push(`${rel(f)}: un borrador debería tener estado "borrador"`);
}

for (const f of listJSON(path.join(ROOT, 'templates/examples'))) {
  const item = readJSON(f);
  if (item === undefined || !itemSchema) continue;
  report(rel(f), validate(itemSchema, item)); // los ejemplos no cuentan para duplicados ni red
}

/* ── URLs ───────────────────────────────────────────────────────────────── */
async function checkUrl({ url, where }) {
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, { method, redirect: 'follow', signal: ctrl.signal, headers: { 'user-agent': 'ClaudeNews-validator' } });
      return res.status;
    } finally {
      clearTimeout(t);
    }
  };
  try {
    let status = await attempt('HEAD');
    if (status >= 400) status = await attempt('GET'); // hay servidores que no aceptan HEAD
    if (status >= 400) errors.push(`${where}: ${url} responde ${status}`);
  } catch (e) {
    errors.push(`${where}: ${url} no responde (${e.name === 'AbortError' ? 'timeout' : e.message})`);
  }
}

(async () => {
  if (!OFFLINE) {
    const unique = [...new Map(urls.map((u) => [u.url, u])).values()];
    for (let i = 0; i < unique.length; i += 5) await Promise.all(unique.slice(i, i + 5).map(checkUrl));
    console.log(`URLs comprobadas: ${unique.length}`);
  } else {
    console.log('URLs: omitidas (--offline)');
  }

  warnings.forEach((w) => console.log(`⚠️  ${w}`));
  errors.forEach((e) => console.error(`❌ ${e}`));
  console.log(`\n${errors.length} error(es), ${warnings.length} aviso(s).`);
  process.exit(errors.length ? 1 : 0);
})();
