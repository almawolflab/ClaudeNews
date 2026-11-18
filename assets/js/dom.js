// Utilidades DOM. El contenido de los JSON se inserta siempre como texto (nunca innerHTML).

/**
 * h('a', { class: 'x', href: '#', onClick: fn, dataset: { id: 1 } }, 'texto', otroNodo)
 * Los hijos null/false se ignoran; los strings se convierten en nodos de texto.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Sustituye el contenido de un contenedor. */
export function mount(el, ...children) {
  el.replaceChildren();
  append(el, children);
}

/** Icono SVG a partir de las constantes de icons.js (markup estático, no de datos). */
export function icon(markup, size = 20) {
  const tpl = document.createElement('template');
  tpl.innerHTML = markup.trim();
  const svg = tpl.content.firstElementChild;
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
