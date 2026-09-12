# 🎸 CifraViva — Visor para Vivo & Gestor de Setlists

![Version](https://img.shields.io/badge/version-1.1.3-ff3b30.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Mobile%20%7C%20Desktop-black.svg)

**CifraViva** es una aplicación web moderna e intuitiva diseñada para músicos y guitarristas en presentaciones en vivo. Permite importar, editar, transponer, visualizar diagramas de acordes de guitarra, navegar por secciones de canciones, ejecutar autoscroll ultrasuave en pantalla completa y organizar repertorios en **Setlists** personalizables.

🌐 **Demo / App Web Móvil en Vivo:** [https://blinkfredy.github.io/CifraViva/](https://blinkfredy.github.io/CifraViva/)

---

## ✨ Características Principales

* 📄 **Importación & Edición:**
  * Importación de archivos **PDF con texto seleccionable** (mediante PDF.js).
  * Editor interactivo para crear, pegar o modificar cifrados.
  * Extracción automática de metadatos (**Título** y **Artista** en las primeras 2 líneas).
  * Notación musical anglosajona (`C`, `Am`, `G/B`, `F#m7b5`, etc.) con soporte para múltiples separadores (`-`, `/`, `.`, `|`).

* 🎼 **Visor & Formato Responsivo:**
  * Alineación exacta de acordes sobre la letra mediante bloques de pares (`pair-line`), garantizando que al hacer salto de línea (wrap), los acordes permanezcan unidos solidariamente a su texto.
  * Ajustes de tamaño de fuente independientes para **Acordes** y **Letra**.
  * Vista en **2 Columnas** con ancho y espacio personalizables.

* 🎸 **Transposición, Escala & Capotraste:**
  * Detección de tonalidad original y transposición lineal en semitonos (12 notas).
  * **Asistente de Improvisación (Círculo de Quintas):** Muestra la tonalidad activa, escala relativa recomendada para improvisar (ej: *D mayor $
ightarrow$ Bm pentatónica menor*), notas tónicas y tonos vecinos.
  * **Capotraste Independiente (0 a 12):** Indicador visual de alerta (`CAPO TRASTE X`) al inicio del cifrado sin alterar la lectura armónica.

* 📊 **Diagramas de Acordes SVG & Navegación:**
  * Gráficos SVG dinámicos para cada acorde único de la canción, incluyendo acordes abiertos, menores, séptimas y generador automático de cejillas (*barre shapes*).
  * Navegación por secciones detectadas (`*Intro*`, `*Verso 1*`, `*Coro*`, `*Puente*`, `*Outro*`, etc.).

* 🎸 **Logo, Favicon & Backups con Timestamp:**
  * Nuevo `logo.svg` como icono de pestaña y acceso directo.
  * Backups JSON nombrados con datetime: `cifraviva_backup_2026-09-11_14-30-45.json`.

* ⏱️ **Modo Vivo & Pantalla Completa Mejorado:**
  * Botones reordenados: Secciones → Autoscroll → Setlist para flujo natural en vivo.
  * Indicador visual activo/inactivo en botón Secciones (§ Sec con acento rojo cuando visible).
  * Panel Secciones siempre visible con `position: fixed` durante autoscroll en fullscreen.

* 📊 **Diagramas de Acordes SVG & Navegación:**
  * Gráficos SVG dinámicos para cada acorde único de la canción, incluyendo acordes abiertos, menores, séptimas y generador automático de cejillas (*barre shapes*).
  * Navegación por secciones detectadas (`*Intro*`, `*Verso 1*`, `*Coro*`, `*Puente*`, `*Outro*`, etc.).
  * Autoscroll ultrasuave calibrado de nivel 1 (lento 🐢) a 10 (rápido 🐰).
  * **Vista Óptima para Vivo:** Modo Pantalla Completa con controles flotantes On-Screen de autoscroll y **navegación rápida por Setlist (`⏮` `⏭`)**.
  * Botón **"🛠 Ocultar Opciones"** que colapsa la barra superior y herramientas para maximizar la lectura del cifrado.

* 📚 **Persistencia Local, Setlists & Respaldos JSON:**
  * Repositorio central de cifrados en `localStorage`.
  * **Gestor de Setlists:** Agrupaciones de canciones con reordenamiento personalizado (`▲` `▼`) y gestión por selección múltiple.
  * **Protección al Editar:** Al guardar cambios, la app pregunta si deseas sobreescribir el cifrado actual o guardarlo como una nueva canción.
  * **Importación/Exportación JSON:** Permite descargar respaldos `.json` en la carpeta física `cifrados/` o importar cualquier cifrado desde el disco.

---

## 📁 Estructura del Proyecto

```text
CifraViva/
├── index.html        # Estructura principal y modales
├── style.css         # Estilos, temas oscuros y componentes responsivos
├── logo.svg        # Icono de favicon y acceso directo de la aplicación
├── app.js            # Lógica principal, parser de cifrados, render de SVG y StorageManager
├── cifrados/         # Carpeta local para almacenar archivos de cifrado en formato JSON
│   └── camino_largo.json
├── VERSION           # Declaración de versión semántica (1.0.0)
├── CHANGELOG.md      # Registro histórico de versiones
├── ARCHITECTURE.md   # Documentación técnica y guía de arquitectura para Agentes de IA
├── CONTRIBUTING.md   # Guía de contribución para colaboradores
└── README.md         # Documentación principal del proyecto
```

---

## 🏛️ Documentación Técnica & IA

Para colaboradores y agentes de IA que necesiten entender el funcionamiento interno del proyecto antes de desarrollar nuevas características, consulten:

- 🏛️ [ARCHITECTURE.md](ARCHITECTURE.md): Explicación del modelo de datos, render de pares acorde/letra, algoritmo SVG de cejillas y autoscroll subpíxel.
- 🤝 [CONTRIBUTING.md](CONTRIBUTING.md): Guía de contribución, ramas de Git y estándares de código.
- 📜 [CHANGELOG.md](CHANGELOG.md): Historial de versiones y notas del release `v1.0.0`.

---

## 🚀 Uso Rápido

1. Abre [https://blinkfredy.github.io/CifraViva/](https://blinkfredy.github.io/CifraViva/) en cualquier navegador de tu dispositivo móvil o laptop.
2. Haz clic en **"➕ Nueva Canción"** o **"📄 Importar PDF"** para cargar tu primer cifrado.
3. Ajusta el tono, capotraste y tamaño de letra deseado.
4. Haz clic en el logo **♯ CifraViva** para crear Setlists y organizar tus canciones para el concierto.
