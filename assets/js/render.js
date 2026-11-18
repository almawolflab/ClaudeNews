// Pintado de la página a partir de los datos. Todo el texto viene de data/*.json.
import { $, $$, h, icon, mount } from './dom.js';
import { ICONS } from './icons.js';
import { EMPRESAS, TIPOS, ESFUERZO, empresaLabel, tipoLabel } from './taxonomy.js';
import { fmtShort, fmtLong, fmtNumeric, fmtEditionNumber, domainOf, repoSlug } from './format.js';
import { itemUrl, youtubeThumb } from './data.js';
import { applyFilters, matches } from './filters.js';
import { openVideo } from './modal.js';

const SECTION_ORDER = ['novedades', 'impacto', 'cronologia', 'recursos'];

/* ── Piezas reutilizables ──────────────────────────────────────────────── */

const typeLabel = (it, size = 20) => h('span', { class: 'type-label' }, icon(ICONS[it.tipo], size), tipoLabel(it.tipo));

const empresaTags = (it) => h('span', { class: 'tags' }, it.empresas.map((e) => h('span', { class: 'tag' }, empresaLabel(e))));

const externalAttrs = { target: '_blank', rel: 'noopener' };

/**
 * Acción principal de un ítem como elemento del título.
 * - video con youtubeId → <button> que abre el modal
 * - con URL → <a> externo
 * - sin URL → texto plano (pendiente)
 */
function primaryAction(it, text, cls) {
  if (it.tipo === 'video' && it.youtubeId) {
    return h('button', { type: 'button', class: cls, onClick: (e) => openVideo(it, e.currentTarget) }, text);
  }
  const url = itemUrl(it);
  if (url) return h('a', { class: cls, href: url, ...externalAttrs }, text);
  return null;
}

function actionHint(it) {
  if (it.tipo === 'video') return it.youtubeId ? 'Ver video ▶' : null;
  if (!itemUrl(it)) return null;
  return it.tipo === 'repo' ? 'Ver repo →' : 'Más info →';
}

/* ── Tarjeta del feed ──────────────────────────────────────────────────── */

function card(it) {
  const url = itemUrl(it);
  const action = primaryAction(it, it.titulo, 'stretch title-action');
  const hint = actionHint(it);

  let thumb = null;
  if (it.tipo === 'video') {
    thumb = it.youtubeId
      ? h('div', { class: 'card-thumb' }, h('img', { src: youtubeThumb(it.youtubeId), alt: '', loading: 'lazy' }), h('span', { class: 'play' }, icon(ICONS.play, 24)))
      : h('div', { class: 'card-thumb card-thumb--pending' }, 'Video pendiente de enlace');
  }

  return h(
    'article',
    { class: 'card', dataset: { id: it.id, tipo: it.tipo } },
    thumb,
    h('div', { class: 'card-head' }, typeLabel(it), h('time', { class: 'date', datetime: it.fecha }, fmtShort(it.fecha))),
    h('h3', { class: 'card-title' }, action ?? it.titulo),
    it.tipo === 'repo' && it.repoUrl ? h('p', { class: 'card-repo' }, repoSlug(it.repoUrl), it.licencia ? ` · ${it.licencia}` : '') : null,
    h('p', { class: 'card-summary' }, it.resumen),
    h(
      'div',
      { class: 'card-foot' },
      empresaTags(it),
      hint
        ? h('span', { class: 'link-arrow', 'aria-hidden': 'true' }, hint)
        : h('span', { class: 'link-muted' }, 'Enlace pendiente'),
    ),
    url && it.tipo !== 'video' ? h('span', { class: 'visually-hidden' }, `Fuente: ${domainOf(url)}`) : null,
  );
}

/* ── Destacada ─────────────────────────────────────────────────────────── */

function featured(it) {
  const actionText = it.tipo === 'video' ? 'Ver el video' : 'Leer la novedad completa';
  const action = primaryAction(it, [actionText, icon(ICONS.arrow, 16)], 'link-arrow featured-action title-action');

  const media = h('div', { class: 'featured-media' });
  if (it.tipo === 'video' && it.youtubeId) {
    media.append(
      h('img', { src: youtubeThumb(it.youtubeId), alt: '' }),
      h('button', { type: 'button', class: 'play', 'aria-label': `Reproducir video: ${it.titulo}`, onClick: (e) => openVideo(it, e.currentTarget) }, icon(ICONS.play, 28)),
    );
  }

  return h(
    'article',
    { class: 'featured', dataset: { id: it.id } },
    h(
      'div',
      { class: 'featured-body' },
      h(
        'div',
        { class: 'featured-kicker' },
        h('span', { class: 'badge' }, 'Destacado'),
        h('span', null, `${tipoLabel(it.tipo)} · ${fmtLong(it.fecha)}`),
        empresaTags(it),
      ),
      h('h3', { class: 'featured-title' }, it.titulo),
      h('p', { class: 'featured-summary' }, it.resumen),
      it.puntos?.length
        ? h('div', { class: 'featured-points' }, h('p', { class: 'featured-points-title' }, 'Qué cambia para nosotros'), h('ul', { class: 'bullets' }, it.puntos.map((p) => h('li', null, p))))
        : null,
      action ?? h('span', { class: 'link-muted' }, 'Enlace pendiente'),
    ),
    media,
  );
}

/* ── Caso de uso ───────────────────────────────────────────────────────── */

function caso(it) {
  const fact = (dt, dd) => h('div', null, h('dt', null, dt), h('dd', null, dd));
  const url = itemUrl(it);
  return h(
    'article',
    { class: 'caso', dataset: { id: it.id } },
    h('div', { class: 'caso-head' }, h('span', { class: 'caso-badge' }, icon(ICONS.sparkle, 12), 'Sugerido por Claude'), h('span', { class: 'caso-area' }, empresaLabel(it.empresa))),
    h('h3', { class: 'caso-title' }, it.titulo),
    h('p', { class: 'caso-summary' }, it.resumen),
    h('dl', { class: 'caso-facts' }, fact('Novedad en la que se basa', it.novedadBase), fact('Por qué encaja en AlmaWolf', it.porQueEncaja), fact('Primer paso', it.primerPaso)),
    h(
      'div',
      { class: 'caso-foot tags' },
      h('span', { class: 'tag tag--outline' }, `Esfuerzo: ${ESFUERZO[it.esfuerzo] ?? it.esfuerzo}`),
      h('span', { class: 'tag tag--outline' }, `Impacto: ${it.impacto}`),
      url ? h('a', { class: 'link-arrow', href: url, ...externalAttrs }, 'Fuente →') : null,
    ),
  );
}

/* ── Cronología ────────────────────────────────────────────────────────── */

function timelineRow(it) {
  const action = primaryAction(it, 'Ver →', 'link-arrow');
  return h(
    'li',
    { dataset: { id: it.id } },
    h('time', { class: 'timeline-date', datetime: it.fecha }, fmtShort(it.fecha)),
    h('span', { class: 'timeline-title' }, it.titulo),
    h('span', { class: 'timeline-meta' }, `${tipoLabel(it.tipo)} · ${it.empresas.map(empresaLabel).join(', ')}`),
    action ?? h('span', { class: 'link-muted' }, 'Pendiente'),
  );
}

/* ── Partes fijas de la edición ────────────────────────────────────────── */

export function renderStatic({ sitio, actualizado }, ed) {
  $$('[data-bind="marca"]').forEach((el) => (el.textContent = sitio.marca));
  $$('[data-bind="nombre"]').forEach((el) => (el.textContent = sitio.nombre));
  document.title = `${sitio.nombre} · ${ed.periodo} — ${sitio.marca}`;

  $('#hero-eyebrow').textContent = `${ed.hero.antetitulo} · ${ed.periodo}`;
  $('#hero-title').textContent = ed.hero.titulo;
  $('#hero-title-strong').textContent = ed.hero.tituloDestacado;
  $('#hero-intro').textContent = ed.hero.intro;

  const meta = (label, value) => h('div', null, h('dt', { class: 'meta-label' }, label), h('dd', { class: 'meta-value' }, value));
  mount(
    $('#hero-meta'),
    meta('Edición', fmtEditionNumber(ed.numero)),
    meta('Publicado', fmtNumeric(ed.publicado)),
    ed.responsable ? meta('Responsable', ed.responsable) : null,
  );

  for (const key of SECTION_ORDER) {
    const s = sitio.secciones[key];
    const title = $(`[data-section-title="${key}"]`);
    const intro = $(`[data-section-intro="${key}"]`);
    if (title) title.textContent = s.titulo;
    if (intro) {
      intro.textContent = s.intro ?? '';
      intro.hidden = !s.intro;
    }
  }

  const recursos = sitio.recursos.filter((r) => r.url);
  mount(
    $('#recursos-grid'),
    recursos.map((r) =>
      h(
        'a',
        { class: 'recurso', href: r.url, ...externalAttrs },
        icon(ICONS[r.icono], 24),
        h('span', { class: 'recurso-title' }, r.titulo),
        h('span', { class: 'recurso-text' }, r.texto ?? ''),
        h('span', { class: 'recurso-cta' }, `${r.cta} →`),
      ),
    ),
  );

  $('#contacto-title').textContent = sitio.contacto.titulo;
  $('#contacto-text').textContent = sitio.contacto.texto;
  $('#contacto-cta').textContent = sitio.contacto.cta;

  const year = ed.publicado.slice(0, 4);
  $('#footer-left').textContent = `© ${year} ${sitio.pie}`;
  mount(
    $('#footer-right'),
    `Actualizado: ${fmtNumeric(actualizado)}`,
    ed.proxima ? ` · Próxima edición: ${fmtNumeric(ed.proxima)}` : '',
    sitio.repo ? [' · ', h('a', { href: sitio.repo, ...externalAttrs }, 'Repositorio')] : '',
  );

  return { recursos: recursos.length > 0 };
}

/* ── Filtros ───────────────────────────────────────────────────────────── */

export function renderChips(state, editionItems, onPick) {
  const chip = (dim, id, label, count) =>
    h(
      'button',
      { type: 'button', class: 'chip', 'aria-pressed': String(state[dim] === id), dataset: { dim, value: id ?? '' }, onClick: () => onPick(dim, id) },
      label,
      count != null ? h('span', { class: 'chip-count' }, count) : null,
    );

  const countEmpresa = (id) => editionItems.filter((it) => matches(it, { empresa: id, tipo: state.tipo })).length;
  const countTipo = (id) => editionItems.filter((it) => matches(it, { empresa: state.empresa, tipo: id })).length;

  mount($('#chips-empresa'), chip('empresa', null, 'Todas'), EMPRESAS.map((e) => chip('empresa', e.id, e.label, countEmpresa(e.id))));
  mount($('#chips-tipo'), chip('tipo', null, 'Todo'), TIPOS.map((t) => chip('tipo', t.id, t.label, countTipo(t.id))));
}

export function renderEditionPicker(ediciones, current, onChange) {
  const picker = $('#edition-picker');
  picker.hidden = ediciones.length < 2;
  const select = $('#edition-select');
  mount(select, ediciones.map((e) => h('option', { value: e.id, selected: e.id === current }, `${fmtEditionNumber(e.numero)} · ${e.periodo}`)));
  select.onchange = () => onChange(select.value);
}

/* ── Contenido filtrable ───────────────────────────────────────────────── */

export function renderContent(state, editionItems) {
  const filtered = applyFilters(editionItems, state);
  const casos = filtered.filter((it) => it.tipo === 'caso');
  const feed = filtered.filter((it) => it.tipo !== 'caso');
  const top = feed.find((it) => it.featured) ?? null;
  const rest = feed.filter((it) => it !== top);

  mount($('#featured'), top ? featured(top) : null);
  mount($('#grid'), rest.map(card));
  mount($('#casos'), casos.map(caso));
  mount($('#timeline'), filtered.map(timelineRow));

  const isEmpty = filtered.length === 0;
  const empty = $('#empty');
  empty.hidden = !isEmpty;
  if (isEmpty) {
    const parts = [state.empresa && empresaLabel(state.empresa), state.tipo && tipoLabel(state.tipo)].filter(Boolean);
    mount($('#empty-title'), 'Aún no hay contenido para ', h('strong', null, parts.join(' · ') || 'esta edición'), '.');
  }

  return {
    // Si solo hay casos, el bloque de novedades se oculta (los casos tienen su sección).
    novedades: isEmpty || feed.length > 0,
    impacto: casos.length > 0,
    cronologia: filtered.length > 0,
  };
}

/** Muestra/oculta secciones y enlaces, y numera las visibles (01 · Novedades…). */
export function applySectionVisibility(sitio, visible) {
  let n = 0;
  for (const key of SECTION_ORDER) {
    const show = Boolean(visible[key]);
    $(`#${key}`).hidden = !show;
    $$(`[data-for-section="${key}"]`).forEach((el) => (el.hidden = !show));
    if (show) {
      n += 1;
      $(`[data-section-eyebrow="${key}"]`).textContent = `${String(n).padStart(2, '0')} · ${sitio.secciones[key].etiqueta}`;
    }
  }
}
