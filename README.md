# ClaudeNews

Portal de novedades de Claude para las empresas del grupo AlmaWolf (fase 1: **Sagitaz**, **Woztell**, **Finanzas** y contenido **Transversal**). Sitio estático publicado con GitHub Pages.

- **URL:** https://almawolflab.github.io/ClaudeNews/
- **Acceso:** con contraseña (pídela al equipo de AlmaWolf Lab).
- **Stack:** HTML + CSS + JavaScript (módulos ES), sin frameworks ni build.

> ⚠️ El repositorio es **público**. La contraseña es solo una barrera de cortesía: el código y los JSON se pueden leer sin pasar por ella. **No publiques nada interno o confidencial.**

## Estructura

```
ClaudeNews/
├── index.html                 # Plantilla: estructura vacía, sin textos de contenido
├── assets/
│   ├── css/
│   │   ├── tokens.css         # Tokens del sistema de diseño de AlmaWolf Lab
│   │   ├── base.css           # Reset, tipografía, botones, utilidades
│   │   └── components.css     # Gate, header, hero, filtros, tarjetas, modal…
│   ├── js/
│   │   ├── app.js             # Entrada: gate → datos → render → eventos
│   │   ├── gate.js            # Gate de contraseña (SHA-256)
│   │   ├── data.js            # Carga de data/*.json y consultas
│   │   ├── filters.js         # Filtros empresa × tipo ↔ URL
│   │   ├── render.js          # Pintado de secciones
│   │   ├── modal.js           # Modal de video (YouTube)
│   │   ├── taxonomy.js        # Empresas y tipos (= enums del schema)
│   │   ├── dom.js · icons.js · format.js
│   │   └── review-config.js   # Config del modo comentarios
│   └── img/
├── vendor/web-review-mode.js  # Modo comentarios (copiado de AlmaWolf Lab)
├── data/
│   ├── editions.json          # Textos del sitio + ediciones (periodos)
│   ├── items.json             # SOLO ítems aprobados (lo que se publica)
│   └── drafts/                # Propuestas pendientes (un JSON por ítem)
├── templates/
│   ├── item.schema.json       # JSON Schema de un ítem
│   ├── editions.schema.json   # JSON Schema de editions.json
│   └── examples/              # Un ejemplo válido por tipo
├── agents/
│   ├── explorador.md          # Prompt del explorador diario
│   ├── juez.md                # Prompt del juez (subagente independiente)
│   └── fuentes.json           # Fuentes, búsquedas por audiencia y límites
├── scripts/validate.js        # Validación (schema, duplicados, URLs, destacada, youtubeId)
└── .github/workflows/validate-pr.yml
```

## Cómo funciona la página

- **Ediciones.** `data/editions.json` define periodos (`desde`–`hasta`). Un ítem pertenece a la edición cuyo rango contiene su `fecha`. Por defecto se muestra la más reciente; si hay varias, aparece un selector.
- **Secciones** (diseño «Index»): portada · destacada + novedades · casos de uso · cronología · recursos · contacto.
  - La **destacada** es el ítem más reciente con `"featured": true`.
  - Los ítems `tipo: "caso"` van a **Cómo se podría aplicar**; el resto, a **Novedades**.
  - **Recursos** solo muestra las tarjetas con `url`.
- **Filtros** empresa × tipo combinables, reflejados en la URL (`?empresa=sagitaz&tipo=video`). Se puede compartir el enlace ya filtrado. Si no hay resultados, se muestra un estado vacío.
- **Videos** de YouTube: se abren en un modal (`youtube-nocookie.com`).
- **Proponer un caso:** activa el modo comentarios (`⌥ + C` o el botón ✍️), que envía la nota al webhook del Lab.

## Cómo añadir contenido a mano

Lo normal es que el contenido llegue solo por el explorador (ver "Pipeline"). Para añadir algo a mano:

1. Copia el ejemplo del tipo que corresponda desde `templates/examples/` a `data/drafts/AAAA-MM-DD-slug.json`.
2. Rellena los campos. Reglas:
   - `id` = nombre del archivo sin `.json` (`AAAA-MM-DD-slug`), único.
   - `empresas`: `sagitaz`, `woztell`, `finanzas`, `transversal`.
   - `tipo`: `novedad`, `video`, `docs`, `caso`, `repo` (cada uno tiene campos propios; ver el schema).
   - **No inventes URLs.** Si falta, pon `null` y avisa en el PR.
   - En `validacion.notas`, explica **por qué encaja** con la empresa asignada.
3. Ejecuta `node scripts/validate.js`.
4. Abre un PR. Al aprobarlo, el ítem pasa a `data/items.json` con `"estado": "aprobado"` (y se borra de `drafts/`).

Para abrir una edición nueva, añade una entrada a `ediciones` en `data/editions.json`.

## Pipeline de contenido

```
Explorador (diario) ──► Juez ──► PR con JSON ──► validate-pr.yml ──► merge = aprobación ──► GitHub Pages
```

1. **Explorador** (`agents/explorador.md`): rutina de Claude Code en la nube, **lunes a viernes a las 06:00 UTC** (07:00 en Madrid en invierno, 08:00 en verano). Busca en `agents/fuentes.json` novedades de las últimas 72 h que crucen Claude con los usos del grupo (Sagitaz ↔ Zoho, Woztell ↔ Meta/WhatsApp/ADS, Finanzas ↔ Zoho Books/Billing/ofimática/Cowork, Transversal ↔ plan Teams). Máximo 5 ítems al día; los lunes, como mucho 1 caso de uso (máx. 3 por edición). Si cambia de mes, crea la edición nueva. No repite nada publicado, en un PR abierto o en un PR cerrado sin merge.
2. **Juez** (`agents/juez.md`): subagente independiente que solo ve el JSON y la fuente. Aprueba o rechaza con criterios fijos; lo rechazado se lista en el PR con el motivo.
3. **PR:** rama `explorador/AAAA-MM-DD`, etiqueta `explorador`. Añade los ítems directamente a `data/items.json`. Si un día no hay nada relevante, no abre PR.
4. **Validación:** la GitHub Action ejecuta `scripts/validate.js`.
5. **Aprobación humana:** el merge del PR es la aprobación. Para quitar un ítem, bórralo en la rama antes del merge. **Cerrar sin merge = rechazado**: no se vuelve a proponer.
6. **Publicación:** Pages sirve `main` y la página lee los JSON. No hay que tocar el HTML.

Para cambiar qué busca el explorador, edita `agents/fuentes.json` o `agents/explorador.md`: la rutina los lee del repo en cada ejecución.

Criterios de relevancia completos: issue 001 en `almawolf-lab/issues/` (repo Corpus Method).

## GitHub Issues

Las **Issues de este repo son solo para desarrollo** (bugs, mejoras del sitio). Las propuestas de contenido llegan por el modo comentarios de la web o como PR.

## Desarrollo local

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Hace falta servir por HTTP (no `file://`) porque la página usa `fetch` y módulos ES.

```bash
node scripts/validate.js            # todo, incluidas URLs
node scripts/validate.js --offline  # sin red
```
