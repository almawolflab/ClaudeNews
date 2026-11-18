// Punto de entrada: gate → carga de datos → render → eventos.
import { $, h, mount } from './dom.js';
import { initGate } from './gate.js';
import { initModal } from './modal.js';
import { loadData, itemsOfEdition } from './data.js';
import { readState, writeState } from './filters.js';
import { renderStatic, renderChips, renderEditionPicker, renderContent, applySectionVisibility } from './render.js';

let data = null;
let state = null;

function render() {
  const ed = data.ediciones.find((e) => e.id === state.edicion);
  const editionItems = itemsOfEdition(data.items, ed);
  const statics = renderStatic(data, ed);
  renderEditionPicker(data.ediciones, state.edicion, (id) => update({ edicion: id }));
  renderChips(state, editionItems, (dim, value) => update({ [dim]: value }));
  const visible = renderContent(state, editionItems);
  applySectionVisibility(data.sitio, { ...visible, recursos: statics.recursos });
}

function update(patch) {
  state = { ...state, ...patch };
  writeState(state, data.ediciones);
  render();
}

/** Abre el modo comentarios (vendor/web-review-mode.js). Las GitHub Issues son solo para desarrollo. */
function proponer() {
  if (window.WebReview) window.WebReview.setMode('comment');
  else console.warn('ClaudeNews: el modo comentarios no está disponible.');
}

function bindEvents() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.action === 'proponer') proponer();
    if (el.dataset.action === 'limpiar-filtros') update({ empresa: null, tipo: null });
  });
  window.addEventListener('popstate', () => {
    state = readState(data.ediciones);
    render();
  });
}

async function start() {
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    mount($('#novedades'), h('p', { class: 'container empty-title' }, 'No se pudo cargar el contenido. Inténtalo de nuevo más tarde.'));
    return;
  }
  state = readState(data.ediciones);
  bindEvents();
  render();
}

initModal();
initGate(start);
