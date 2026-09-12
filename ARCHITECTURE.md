# 🏛️ Arquitectura del Sistema — CifraViva

> **Guía para Desarrolladores Humanos y Agentes de IA**
> Este documento detalla la estructura técnica, modelo de datos, flujo de ejecución y directrices para extender **CifraViva** en futuras versiones sin romper la compatibilidad armónica ni el formato responsivo.

---

## 1. Visión General & Filosofía de Diseño

**CifraViva** es una aplicación Web Frontend de cliente puro (sin dependencias de backend/servidor) construida en **HTML5, CSS3 vanilla y JavaScript (ES6+)**. 

### Principios Fundamentales:
1. **Cero Dependencias Pesadas:** Todo el núcleo de transposición, render de SVG, autoscroll y gestión de setlists funciona nativamente en JavaScript. Únicamente se incluye [PDF.js](https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js) vía CDN para extraer texto de PDFs.
2. **Sincronización Armónica Rígida:** Los acordes y la letra se representan como fragmentos vinculados (`pair-line` y `segment`), lo que evita que un acorde se desplace de su letra al cambiar el tamaño de pantalla o aumentar el tamaño de fuente.
3. **Persistencia por Referencias:** Los cifrados residen en un repositorio central (`cifraviva_songs_v1`). Las setlists (`cifraviva_setlists_v1`) solo almacenan listas de IDs (`songIds`), garantizando que cualquier edición en un cifrado se propague a todas las setlists.

---

## 2. Estructura de Archivos & Módulos

```text
CifraViva/
├── index.html        # Estructura DOM, modales y plantilla de controles
├── style.css         # Variables CSS, diseño Grid/Flexbox y temas responsivos
├── app.js            # Módulos de lógica, transposición, SVG render y StorageManager
├── cifrados/         # Directorio físico para guardar/leer respaldos en JSON
│   └── camino_largo.json
├── VERSION           # Declaración de versión semántica (1.0.0)
├── CHANGELOG.md      # Registro histórico de versiones y features
├── ARCHITECTURE.md   # Este documento (guía técnica para colaboradores y agentes de IA)
└── CONTRIBUTING.md   # Guía de contribución con Git y estándares de código
```

---

## 3. Modelo de Datos & Persistencia (`StorageManager`)

La persistencia se gestiona en `localStorage` mediante el objeto global `StorageManager` en `app.js`.

### 3.1. Estructura del Objeto Cifrado (`Song`)
```json
{
  "id": "song_1788215000000",
  "title": "Camino Largo",
  "artist": "CifraViva Ensemble",
  "content": "Camino Largo
CifraViva Ensemble

*Intro*
C - G/B . Am - F",
  "settings": {
    "keyIdx": 7,
    "transposeSemitones": 0,
    "capoFret": 0,
    "speed": 3,
    "chordSize": 15,
    "lyricSize": 15,
    "twoColumns": false,
    "colLeft": 50,
    "colGap": 24,
    "showDiagrams": true,
    "showSections": true
  },
  "updatedAt": 1788215000000
}
```

### 3.2. Estructura del Objeto Setlist (`Setlist`)
```json
{
  "id": "setlist_1788215100000",
  "name": "Concierto Acústico",
  "songIds": [
    "song_1788215000000"
  ]
}
```

---

## 4. Núcleos Técnicos (Core Engines)

### A. Engine de Alineación Acorde/Letra (`createPairElement`)
- `parseRawText(text)` analiza cada línea. Si la densidad de acordes supera la heurística (`density >= 0.5`), se clasifica como `type: 'chord'`.
- Si una línea `chord` va seguida de una línea `lyric`, `renderSheet()` las combina en un contenedor `.pair-line` compuesto por múltiplos de `.segment`. Cada `.segment` contiene el acorde `<span class="chord">` y la letra `<span class="lyric">` alineados verticalmente en columna flex.

### B. Engine de Transposición & Círculo de Quintas
- Matriz cromática: `['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']`.
- `transposeChord(chordStr, semitones)` separa `root`, `desc` y `bass` (ej: `F#m7/C#`), calcula `(rootIndex + semitones) % 12` y reconstruye el acorde.
- `updateScaleBox()` detecta si el tono es mayor o menor y calcula la relativa pentatónica para improvisar y los vecinos de 4ª y 5ª del círculo de quintas.

### C. Engine de Diagramas de Acordes SVG (`svgDiagram`)
- Mapeo predefinido en `CHORD_SHAPES`.
- Fallback dinámico `generateBarreShape(chordStr)` para acordes con cejilla no mapeados explícitamente.
- Genera cadenas SVG vectoriales con cuerdas, trastes, cejillas (`barres`), notas tónicas y marcadores de cejilla relativa.

### D. Engine de Autoscroll Ultrasuave (`autoscrollStep`)
- Utiliza `requestAnimationFrame` y acumulación subpíxel (`scrollAccum += pxPerMs * dt`) para evitar brincos en velocidades lentas (nivel 1 ≈ 7px/s a nivel 10 ≈ 70px/s).
- Determina automáticamente el contenedor scrolleable según esté en pantalla normal (`.sheet-area`) o en pantalla completa (`#viewer`).

---

## 🤖 Guía para Agentes de IA (AI Guidelines)

Al implementar nuevas funcionalidades en este proyecto, cualquier agente de IA debe cumplir las siguientes reglas:

1. **Preservar los Contratos de Datos:** No modificar la clave `cifraviva_songs_v1` o `cifraviva_setlists_v1` sin mantener retrocompatibilidad con la versión 1.0.0.
2. **Sincronización de UI:** Cuando se modifique un cifrado o su tono/capo/fuente, invocar siempre `updateSetlistNavUI()` y `renderLogoDropdown()`.
3. **Protección de Edición:** Mantener la confirmación obligatoria al intentar guardar cambios en una canción existente (preguntar si sobreescribir o crear nuevo ID).
4. **Prueba de Sintaxis Obligatoria:** Ejecutar siempre `node -c app.js` después de cualquier modificación en el código JavaScript.

---

## 5. Características v1.1.3

### A. Logo y Favicon
- `logo.svg` en raíz del proyecto. SVG simple con degradado rojo/naranja (`#ff3b30` → `#ff6b35`) sobre fondo oscuro.
- Referenciado en `index.html` como `<link rel="icon">` y `<link rel="apple-touch-icon">`.

### B. Reorden de Controles en Pantalla Completa
- Orden: **Secciones (§ Sec)** → **Autoscroll (▶⏸⤒)** → **Setlist (⏮⏭)**.
- El botón Secciones tiene clase CSS `fs-sections-btn` que recibe la clase `active` cuando las secciones están visibles en fullscreen.

### C. Fix: Panel Secciones Siempre Visible en Fullscreen
- `.fs-sections-panel` usa `position: fixed` cuando `#viewer` está en `:fullscreen` o `.is-fullscreen`.
- Esto evita que el panel se oculte con el autoscroll — siempre permanece anclado en la esquina superior derecha.
- La clase `.hidden` controla la visibilidad via `transform: translateX(100%)` sin afectar el `position`.

### D. Backups JSON con Datetime
- `exportBackupJSON()` genera nombres como `cifraviva_backup_2026-09-11_14-30-45.json`.
- El timestamp se construye con `Date` local y formato `YYYY-MM-DD_HH-MM-SS`.

### E. Indicador Visual Activo/Inactivo
- Botón `#fsSectionsToggle` con clase `active` cuando `fsSectionsVisible === true`.
- Estilo `.fs-sections-btn.active` aplica fondo `var(--accent)` y texto blanco.
- También se sincroniza desde el switch `#toggleSections` del toolbar.
