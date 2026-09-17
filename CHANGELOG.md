# Changelog — CifraViva

Todas las modificaciones notables de este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.5] - 2026-09-17

### 🐛 Corregido
- **Error silencioso en Resetear App:** Las variables `sectionPanel` y `diagramPanel` no existían en el scope del handler de reset, causando `ReferenceError` que impedía mostrar el toast de confirmación y completaba la limpieza. Ahora usan `document.getElementById('sectionsPanel')` y `document.getElementById('diagramPanel')` directamente.
- **Backup Gt/Vc no invocables:** `importBackupGuitarrista` y `importBackupVocalista` no eran accesibles desde el `onclick` del HTML. Se agregó asignación explícita a `window` y query parameter cache-busting en `app.js`.

---

## [1.2.4] - 2026-09-17

### ✨ Añadido
- **Botón de Importación Automática de Backup Guitarrista:**
  - Nuevo botón 📥 **Backup Gt** junto a "Cargar Ejemplo" y "Backup Vc".
  - Importa automáticamente `cifrados/backup_guitarrista_concierto.json` mediante `fetch`.
  - Función `importBackupGuitarrista()` — mismo comportamiento que `importBackupVocalista()`.
  - Botón ocultable con "🛠 Ocultar opciones".

---

## [1.2.3] - 2026-09-17

### ✨ Añadido
- **Botón de Importación Automática de Backup Vocalista:**
  - Nuevo botón 📥 **Backup Vc** en la toolbar, junto a "Cargar Ejemplo".
  - Importa automáticamente `cifrados/backup_vocalista_concierto.json` mediante `fetch`.
  - Función `importBackupVocalista()` que hace merge de `songs` y `setlists` en `localStorage`.
  - Botón ocultable con "🛠 Ocultar opciones" al colapsar la toolbar.
  - Toast de confirmación de éxito o error en cada intento.

---

## [1.2.2] - 2026-09-17

### ✨ Añadido & Mejorado
- **Botones Rápidos en Cabecera del Editor Flotante:**
  - Se agregaron los iconos de acción rápida `✕` (Cancelar) y `💾` (Guardar) en la cabecera superior del modal de edición (`.modal-head`).
  - Permite guardar o cancelar ediciones inmediatamente en celulares y pantallas compactas sin necesidad de desplazarse hasta el fondo del modal.
- **Notificaciones Toast Reubicadas en la Parte Superior:**
  - Los mensajes emergentes informativos (ej: *Cargado: "Amor Prohibido"*, *Copia JSON descargada*, etc.) ahora se presentan centrados en el margen superior (`top`).
  - Evita interferir o superponerse con la barra flotante de controles (`#fullscreenControls`) en modo pantalla completa.

---

## [1.2.1] - 2026-09-16

### 🛠️ Corregido & Mejorado (Móviles & PWA)
- **Posicionamiento del Botón Salir en Pantalla Completa:**
  - Se reubicó `#btnExitFullscreen` respetando los safe areas superiores (`calc(env(safe-area-inset-top) + 14px)`), evitando que quede superpuesto sobre el indicador de batería, notch o Dynamic Island en iPhone/iPad.
  - Mayor contraste, blur de fondo y área táctil optimizada para pulsar fácilmente en vivo.
- **Diseño Responsivo Fluido sin Scroll Horizontal:**
  - Las líneas de letra y texto extenso ahora aplican `white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;` adaptándose al 100% del ancho de la pantalla móvil.
  - Se eliminó el scroll horizontal no deseado, incluso cuando el usuario incrementa el tamaño de la letra al máximo.
- **Centrado Perfecto de la Botonera Flotante en Pantalla Completa:**
  - Se corrigió la alineación horizontal de la barra flotante de controles usando `left: 50%; transform: translateX(-50%)` con `max-width: calc(100vw - 24px)`, resolviendo el problema donde los botones del setlist (`⏮` `⏭`) quedaban desfasados o cortados a la derecha de la pantalla.
- **Controles Flotantes Compactos de Solo Iconos:**
  - Se eliminaron las etiquetas de texto redundantes en la barra flotante de pantalla completa (`§`, `▶`/`⏸`, `⤒`, `⏮`, `⏭`), ahorrando espacio visual en pantallas de teléfonos y facilitando el uso a una mano.
- **Normalización de Tabulaciones y Márgenes para iPhone 8 Plus / Pantallas Compactas:**
  - Se normalizaron caracteres de tabulación (`\t`) y se forzó `overflow-x: hidden; width: 100%; box-sizing: border-box;` en todos los contenedores y líneas del visor, erradicando el scroll horizontal en dispositivos con pantallas más angostas.

---

## [1.2.0] - 2026-09-14

### 🛠️ Corregido
- **Fijación del Panel de Secciones en Pantalla Completa:**
  - El visor de secciones en modo pantalla completa ahora utiliza posicionamiento fijo (`position: fixed`) con capa superior (`z-index: 98`), asegurando que permanezca visible y accesible en todo momento durante el scroll manual o autoscroll sin desplazarse fuera de la pantalla.
- **Sincronización Automática de Layout al Cargar Canción:**
  - Se re-sincronizan las columnas del layout y paneles de diagramas/secciones automáticamente tras renderizar cualquier cifrado, evitando desalineaciones iniciales.

### ✨ Añadido & Mejorado
- **Reordenamiento Intuitivo en Pantalla Completa:**
  - Barra de controles flotantes reorganizada en orden de prioridad de uso en vivo: **1. § Secciones**, **2. Autoscroll** (Play, Pause, Top), **3. Setlist** (Anterior, Siguiente).
- **Indicador Visual de Estado para Secciones en Pantalla Completa:**
  - El botón `§ Secciones` ahora incluye retroalimentación visual clara (`#fsSectionsToggle.active`) con fondo de acento y brillo cuando el panel lateral está desplegado.
- **Nombres con Fecha y Hora Legible en Respaldos JSON:**
  - Las descargas de backups ahora generan archivos nombrados con formato estándar `cifraviva_backup_YYYY-MM-DD_HH-mm-ss.json` (ej: `cifraviva_backup_2026-09-14_21-30-00.json`) facilitando su ordenamiento y archivo en la carpeta de repertorio.
- **Identidad Gráfica, Favicon SVG y Logotipo:**
  - Creación de `favicon.svg` con el símbolo musical estilizado en gradiente cálido.
  - Integración de icono SVG de alta resolución en la cabecera principal (`.brand-logo-svg`).
- **Soporte PWA para iPadOS e iOS (Modo App Nativa):**
  - Creación de `manifest.json` y metadatos de Apple (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `viewport-fit=cover`).
  - Permite añadir CifraViva a la pantalla de inicio del iPad/iPhone para usarla como una aplicación autónoma a pantalla completa real (sin barra de direcciones ni pestañas de Safari) y sin interferencia de gestos del navegador.
- **Importación Rápida desde Menú del Logo:**
  - Se agregó el botón `📥 Importar Backup JSON` directamente en el desplegable de biblioteca y setlists.

---

## [1.1.2] - 2026-09-01

### 🛠️ Corregido
- **Detección de Secciones sin Palabras Reservadas:**
  - Se eliminó el listado de palabras reservadas (`Intro`, `Coro`, `Puente`, etc.) del motor `detectSection()`.
  - Ahora **cualquier texto encerrado entre asteriscos** es reconocido como sección navegable (ej: `*Precoro*`, `*Solo de Guitarra*`, `*Estribillo 2*`, `*Cierre*`, `*Bridge*`, etc.), independientemente del nombre usado.
  - Los separadores alternativos siguen siendo compatibles: `[sección]`, `(sección)`, `--- sección ---`.

### ✨ Añadido
- **Restablecer / Limpiar Todo (`🗑️ Restablecer / Limpiar Todo`):**
  - Nueva opción en el menú del logo que permite borrar **todos los cifrados y setlists** almacenados en `localStorage` de forma segura.
  - Incluye **doble confirmación** para evitar borrados accidentales.
  - La caché del navegador (archivos JS/CSS/HTML) **no requiere ser borrada**: la limpieza opera exclusivamente sobre las claves `cifraviva_songs_v1` y `cifraviva_setlists_v1` en `localStorage`.
  - Ideal para importar un backup limpio desde cero en cualquier dispositivo.
  - Nuevo método `StorageManager.clearAll()` encapsula la operación de limpieza.

---

## [1.0.0] - 2026-08-31

### ✨ Añadido
- **Visor Inteligente de Cifrados:**
  - Lógica de alineación en pares acorde/letra (`pair-line`) que conserva la posición armónica durante saltos de línea responsivos.
  - Parser flexible para notación anglosajona con soporte de múltiples separadores (`-`, `/`, `.`, `|`).
  - Importación de archivos PDF seleccionables vía PDF.js.
  - Editor interactivo con switch para detección de encabezado en texto pegado.

- **Transposición & Teoría Musical:**
  - Selector de tonalidad con transposición lineal circular en semitonos (12 notas).
  - Subsección de Escala basada en el Círculo de Quintas (tonalidad activa, relativa pentatónica para improvisar y tonos vecinos).
  - Control de Capotraste independiente (0 a 12) con banner de advertencia visual al inicio del cifrado.

- **Visualizaciones & SVG:**
  - Motor gráfico dinámico de diagramas SVG para acordes abiertos, menores, séptimas y cejillas (*barre shapes*).
  - Navegación interactiva bidireccional entre texto de cifrado y panel de diagramas.
  - Detección de secciones (`*Intro*`, `*Verso 1*`, `*Coro*`, `*Puente*`, `*Outro*`, etc.) con panel lateral de saltos rápidos.
  - Vista responsiva en 2 columnas con ajuste de ancho y espacio entre columnas.

- **Autoscroll & Modo Vivo:**
  - Motor de autoscroll ultrasuave con acumulación subpíxel (`requestAnimationFrame`) y selector de velocidad (1 a 10).
  - Modo Pantalla Completa para vivo con botones flotantes de autoscroll y **Navegación de Setlist (`⏮` `⏭`)**.
  - Ocultamiento colapsable de opciones superiores y herramientas para maximizar la visibilidad del cifrado.

- **Persistencia Local & Gestor de Setlists (`StorageManager`):**
  - Repositorio central de canciones y Setlists organizadas por referencias (`songIds`) en `localStorage`.
  - Reordenamiento personalizado de canciones en Setlists (`▲` `▼`).
  - Navegación rápida por Setlist en el toolbar y pantalla completa.
  - Protección de sobreescritura al editar cifrados con opción de guardar como nuevo tema.
  - Importación y exportación de respaldos en formato `.json`.
