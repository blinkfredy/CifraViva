# 🤝 Guía de Contribución — CifraViva

¡Gracias por tu interés en contribuir a **CifraViva**! Este proyecto es de código abierto y está diseñado para ser sencillo de extender.

---

## 📋 Estándares de Código & Commits

### Mensajes de Commit Convencionales
Por favor utiliza el formato estándar para los mensajes de commit:

- `feat: ...` para nuevas funcionalidades (ej. `feat: agregar afinación de guitarra en toolbar`).
- `fix: ...` para corrección de errores (ej. `fix: corregir wrap de acordes en móviles`).
- `docs: ...` para cambios en documentación (`README.md`, `ARCHITECTURE.md`).
- `style: ...` para cambios de diseño CSS o formato sin alterar lógica.
- `refactor: ...` para mejoras de código internas sin cambiar comportamiento externo.

---

## 🌿 Flujo de Trabajo con Git

1. Crea una rama para tu característica o corrección:
   ```bash
   git checkout -b feature/nombre-de-tu-feature
   ```
2. Realiza cambios pequeños e independientes.
3. Verifica la sintaxis de JavaScript antes de commitear:
   ```bash
   node -c app.js
   ```
4. Realiza el commit y envía un Pull Request hacia la rama `main`.

---

## 🧪 Pruebas Manuales Recomendadas

Antes de enviar un Pull Request, asegúrate de verificar:
- Importación de PDF seleccionables.
- Transposición y cálculo de escala relativa en la tonalidad.
- Autoscroll y navegación de setlist en modo pantalla completa.
- Guardar, sobreescribir y exportar/importar JSON.
