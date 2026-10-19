# AGENTS.md — Portafolio profesional

## Objetivo

Sitio web estático de presentación profesional para reclutadores. Muestra el CV y
demos interactivas de proyectos. No es un sistema real ni ejecuta procesos.

## Reglas innegociables

1. **Solo presentación.** Las demos son simulaciones con datos ficticios.
2. **Prohibido leer, escribir, conectarse o consultar cualquier base de datos**
   (SQL Server, PostgreSQL, MySQL, MongoDB, etc.). Sin `pyodbc`, SQLAlchemy, ODBC,
   cadenas de conexión, IPs, servidores ni rutas UNC.
3. **Prohibido incluir credenciales**: contraseñas, usuarios, tokens, API keys,
   SMTP, correos corporativos, certificados, `.env`, `config.json` o capturas que
   los muestren.
4. **Prohibido exponer datos internos de la empresa**: clientes, operadores,
   unidades, rutas, montos, folios, referencias, direcciones, logs o reportes.
5. **Todos los datos de las demos son inventados**, plausibles y no reidentificables.
   Nombres genéricos: "Cliente Demo", "Operador Demo", "Unidad T-101".
6. **No copiar código, consultas, configuraciones ni datos de los proyectos
   originales.** Para contexto funcional solo se permite leer `README.md`,
   `AGENTS.md`, especificaciones y maquetas HTML. Nunca archivos de configuración,
   consultas, logs, Excel/CSV/PDF operativos ni bases de datos.
7. **El sitio es 100% estático**: HTML, CSS y JavaScript. Sin backend, sin
   `fetch`/XHR/WebSocket hacia APIs de datos, sin analytics ni cookies de terceros.
8. **No usar logos, marcas, colores corporativos ni capturas de sistemas reales.**
   La identidad visual es propia del portafolio.
9. **El CV en PDF se incluye con autorización del autor.** Puede contener sus datos
   de contacto y experiencia laboral. No agregar información interna de empleadores.
   El nombre del empleador solo puede aparecer en la sección de experiencia del CV;
   las demos usan contexto genérico ("empresa de transporte").
10. **Cada demo debe mostrar el aviso:**
    "Demo de portafolio · Datos ficticios · Sin conexión a bases de datos".
11. **Cada demo debe incluir un botón para reiniciar el estado** y no debe guardar
    datos reales. El estado puede vivir en memoria o en `localStorage`.
12. **Si una petición choca con estas reglas, detenerse y preguntar.** No improvisar
    ni inventar métricas, empresas o resultados presentados como reales.

## Archivos prohibidos en el repositorio

- `config.json`, `.env`, `database.py`, `consultas.py`, `correo.py`, `db.py`
- `logs/`, `respaldo/`, `salida/`, `pdf/`, `revision/`, `.venv/`, `__pycache__/`
- `*.bak`, `*.xlsx`, `*.csv`, `*.docx`, `*.sql`, `*.rar`, `*.zip`
- PDFs operativos o reportes reales
- Única excepción: el PDF del CV del autor, en `assets/cv/`

## Estructura permitida

- `index.html`, `cv.html`
- `proyectos/*.html`
- `assets/css`, `assets/js`, `assets/img`, `assets/fonts`, `assets/cv`
- Datos ficticios centralizados en `assets/js/mock-data.js`

## Checklist antes de publicar

- [ ] Buscar y revisar: `password`, `secret`, `token`, `api_key`, `smtp`,
      `pyodbc`, `sqlalchemy`, `ODBC`, `Driver=`, `Server=`, `Database=`, IPs,
      rutas UNC y dominios corporativos.
- [ ] Confirmar que no existe ningún `config.json`, `.env`, log o reporte real.
- [ ] Confirmar que las demos no hacen peticiones de red.
- [ ] Revisar que nombres, IDs, montos y fechas sean ficticios.
- [ ] Verificar que las capturas/portadas provengan de las demos ficticias.
- [ ] Probar ES/EN, tema claro/oscuro, móvil/escritorio y enlaces.
- [ ] Revisar consola del navegador sin errores.
- [ ] Confirmar que el repositorio público no expone nada interno.

## Publicación

- Repositorio público en GitHub Pages.
- Todas las rutas deben ser relativas para funcionar en subcarpeta.
- No publicar hasta completar el checklist.
