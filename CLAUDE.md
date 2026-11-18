# CLAUDE.md — ClaudeNews

Guía para trabajar en este repo sin contexto previo. Léela junto con `README.md`.

## Qué es

Sitio estático (GitHub Pages) con novedades de Claude para el grupo AlmaWolf. Diseño aprobado: canvas «Index» (https://claude.ai/artifact/M3KipsA15D5gPjpph2e86C). Spec y decisiones: `almawolf-lab/issues/001-claudenews.md` en el repo Corpus Method (sección "Handoff").

## Reglas

- **Español** en código, comentarios, textos y commits.
- **Vanilla JS + CSS**, sin frameworks, sin build, **sin estilos inline** (ni en el HTML ni creados desde JS).
- **El HTML es una plantilla.** No lleva textos de contenido: todo sale de `data/editions.json` y `data/items.json`. Solo hay etiquetas de interfaz fijas (nav, filtros, gate).
- **El contenido de los JSON se inserta como texto** (`dom.h`, `textContent`). Nunca `innerHTML` con datos.
- **No inventar URLs.** Si falta una, `null` y avisar.
- **Repo público:** nada interno o confidencial en datos, código, commits ni issues.
- Las enums de `assets/js/taxonomy.js` deben coincidir con `templates/item.schema.json`.
- Antes de cerrar un cambio de datos: `node scripts/validate.js`.

## Gate

- `assets/js/gate.js` compara el **SHA-256** de lo que escribe el usuario con `PASSWORD_SHA256`.
- `sessionStorage` key: `aw_claudenews_auth`.
- **Nunca escribir la contraseña en texto plano** en ningún archivo, commit, issue o mensaje. Para cambiarla, la persona responsable calcula el hash en su terminal y solo se pega el hash:
  ```bash
  printf '%s' 'LA_CONTRASEÑA' | shasum -a 256
  ```
- Es una barrera de cortesía: los JSON son descargables sin pasar por el gate.

## Design system

Tokens en `assets/css/tokens.css` (los del Lab: `--red`, `--navy`, `--bg`, `--white`, `--gray`, `--dark`, `--border`, Inter). Rojo solo para acentos. Firma visual: polígonos con `clip-path`. Escritorio primero; en móvil basta con que no se rompa (sin scroll horizontal).

## Datos

| Archivo | Qué contiene |
|---------|--------------|
| `data/editions.json` | `sitio` (textos de secciones, recursos, contacto, pie) + `ediciones` (periodos `desde`–`hasta`, hero, responsable) |
| `data/items.json` | `actualizado` + `items` (solo `estado: "aprobado"`) |
| `data/drafts/*.json` | un ítem por archivo, `estado: "borrador"` |

Campos por tipo (ver `templates/item.schema.json`): `video` → `youtubeId`; `repo` → `repoUrl`, `licencia`; `docs` → `formato`; `caso` → `empresa`, `novedadBase`, `porQueEncaja`, `primerPaso`, `esfuerzo`, `impacto`. Opcional en cualquiera: `featured`, `puntos` (lista "Qué cambia para nosotros" de la destacada).

## Comentarios

`vendor/web-review-mode.js` (copia del Lab) con `projectName: 'claudenews-vertical'` en `assets/js/review-config.js`. Los botones "Proponer" activan el modo comentarios. Si se actualiza el script en el Lab, copiarlo de nuevo a `vendor/`.

## Pipeline

Explorador diario → PR con JSON en `data/drafts/` (o directo en `items.json`) → `validate-pr.yml` → merge de Gabriel = aprobación → Pages. Las GitHub Issues son solo para desarrollo.
