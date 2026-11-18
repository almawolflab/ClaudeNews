// Gate de acceso. Compara el SHA-256 de lo que escribe el usuario con un hash fijo.
// ⚠️ El repo es público: esto es una barrera de cortesía, no seguridad. Los JSON se
// pueden descargar sin pasar por aquí. Nunca escribir la contraseña en texto plano.
import { $ } from './dom.js';

const PASSWORD_SHA256 = ''; // SHA-256 (hex) de la contraseña. Ver CLAUDE.md → «Gate».
const STORAGE_KEY = 'aw_claudenews_auth';

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isAuthed() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function initGate(onUnlock) {
  const gate = $('#gate');
  const app = $('#app');
  const form = $('#gate-form');
  const input = $('#gate-pwd');
  const err = $('#gate-err');

  const unlock = () => {
    gate.hidden = true;
    app.hidden = false;
    onUnlock();
  };

  if (isAuthed()) return unlock();
  input.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!PASSWORD_SHA256) {
      err.textContent = 'Acceso no configurado.';
      return;
    }
    if ((await sha256Hex(input.value)) === PASSWORD_SHA256) {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* sin sessionStorage: se pedirá de nuevo al recargar */
      }
      unlock();
    } else {
      err.textContent = 'Contraseña incorrecta.';
      input.value = '';
      input.focus();
    }
  });
}
