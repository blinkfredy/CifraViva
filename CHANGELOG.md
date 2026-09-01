# Changelog — CifraViva

Todas las modificaciones notables de este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
