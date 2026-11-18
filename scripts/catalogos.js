#!/usr/bin/env node
/**
 * Catálogos oficiales de Claude sin feed de novedades (Node ≥ 18, sin dependencias).
 *
 *   node scripts/catalogos.js marketplace --desde 2026-11-15
 *       Conectores y plugins del Claude Marketplace dados de alta desde esa fecha
 *       (usa el campo addedAt que trae la propia página).
 *
 *   node scripts/catalogos.js academy
 *       Cursos y tutoriales de Claude Academy que NO están en agents/estado/catalogo.json.
 *
 *   node scripts/catalogos.js academy --guardar
 *       Igual, y además actualiza agents/estado/catalogo.json con la lista actual.
 *
 * Salida: JSON por stdout. El explorador decide qué es relevante; este script no filtra por empresa.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ESTADO = path.resolve(__dirname, '../agents/estado/catalogo.json');
const MARKETPLACE = 'https://claude.com/marketplace/connectors-plugins';
const ACADEMY = { cursos: 'https://academy.claude.com/courses', tutoriales: 'https://academy.claude.com/tutorials' };

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (ClaudeNews explorador)' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};

async function marketplace() {
  const desde = arg('--desde');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde || '')) throw new Error('Falta --desde AAAA-MM-DD');
  const html = (await get(MARKETPLACE)).replace(/\\"/g, '"');
  const re = /"_id":"(connector|plugin)\.[^"]+","title":"([^"]+)","slug":"([^"]+)","oneLiner":"([^"]*)"[\s\S]{0,1500}?"addedAt":"(\d{4}-\d{2}-\d{2})/g;
  const porSlug = new Map();
  for (const [, tipo, titulo, slug, resumen, addedAt] of html.matchAll(re)) {
    porSlug.set(`${tipo}/${slug}`, {
      tipo: tipo === 'connector' ? 'conector' : 'plugin',
      titulo,
      resumen: resumen.replace(/\\u0026/g, '&'),
      addedAt,
      url: `https://claude.com/marketplace/${tipo}s/${slug}`,
    });
  }
  if (porSlug.size === 0) throw new Error('No se encontró ningún conector: ¿ha cambiado el formato de la página?');
  const nuevos = [...porSlug.values()].filter((x) => x.addedAt >= desde).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  return { fuente: MARKETPLACE, total: porSlug.size, desde, nuevos };
}

async function academy() {
  const actual = {};
  for (const [clave, url] of Object.entries(ACADEMY)) {
    const html = await get(url);
    const ruta = clave === 'cursos' ? 'courses' : 'tutorials';
    const slugs = [...new Set([...html.matchAll(new RegExp(`href="/${ruta}/([a-z0-9-]+)"`, 'g'))].map((m) => m[1]))].sort();
    if (slugs.length === 0) throw new Error(`${url}: sin enlaces; ¿ha cambiado el formato?`);
    actual[clave] = slugs.map((slug) => `https://academy.claude.com/${ruta}/${slug}`);
  }
  const previo = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, 'utf8')) : null;
  const nuevos = previo
    ? Object.fromEntries(Object.entries(actual).map(([k, urls]) => [k, urls.filter((u) => !(previo.academy?.[k] || []).includes(u))]))
    : { cursos: [], tutoriales: [] }; // primera vez: solo se guarda la lista
  if (process.argv.includes('--guardar')) {
    fs.mkdirSync(path.dirname(ESTADO), { recursive: true });
    const hoy = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(ESTADO, JSON.stringify({ actualizado: hoy, academy: actual }, null, 2) + '\n');
  }
  return {
    primeraVez: !previo,
    total: { cursos: actual.cursos.length, tutoriales: actual.tutoriales.length },
    nuevos,
  };
}

(async () => {
  const cmd = process.argv[2];
  const fn = { marketplace, academy }[cmd];
  if (!fn) {
    console.error('Uso: node scripts/catalogos.js marketplace --desde AAAA-MM-DD | academy [--guardar]');
    process.exit(2);
  }
  try {
    console.log(JSON.stringify(await fn(), null, 2));
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }
})();
