// Modal de video (YouTube embebido) con <dialog>: Esc, clic fuera y botón cierran.
import { $, h, mount } from './dom.js';

let dialog;
let opener = null;

export function initModal() {
  dialog = $('#video-modal');
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-action="cerrar-modal"]')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    mount($('#modal-media')); // detiene la reproducción
    opener?.focus();
    opener = null;
  });
}

export function openVideo(item, trigger = document.activeElement) {
  if (!item.youtubeId) return;
  opener = trigger;
  $('#modal-title').textContent = item.titulo;
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.youtubeId)}?autoplay=1&rel=0`;
  mount(
    $('#modal-media'),
    h('iframe', {
      src,
      title: item.titulo,
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      allowfullscreen: true,
      referrerpolicy: 'strict-origin-when-cross-origin',
    }),
  );
  $('#modal-source').href = `https://www.youtube.com/watch?v=${encodeURIComponent(item.youtubeId)}`;
  dialog.showModal();
}
