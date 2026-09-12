# Changelog — CifraViva

Todas las modificaciones notables de este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
