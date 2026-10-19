# Portafolio profesional — Addán Isaí Cruz Cruz

Sitio estático con el CV y cuatro demos interactivas de proyectos. Todas las demos
usan **datos ficticios** y **no se conectan a bases de datos ni a sistemas reales**.

Incluye contenido bilingüe ES/EN, tema claro/oscuro, CV web imprimible y una
sección breve sobre prácticas de trabajo con **SDD (Spec-Driven Development)**,
sin presentarlo como una metodología obligatoria para todos los proyectos.

## Ver en local

Desde la carpeta del proyecto:

```powershell
python -m http.server 8080
```

Abrir <http://localhost:8080>.

## Estructura

```
index.html                     Portafolio y CV resumido
cv.html                        CV completo imprimible
404.html                       Página no encontrada
robots.txt / sitemap.xml       Indexación
proyectos/
  documentador.html            Demo de validación documental
  costos-casetas.html          Demo de automatización de costos de casetas
  liquidaciones.html           Demo de resúmenes de liquidación
  monitor-operativo.html       Demo de monitoreo operativo
assets/
  css/                         Estilos compartidos y de demos
  js/                          Lógica, i18n y datos ficticios
  img/                         Portadas, iconos y marcas
  fonts/                       IBM Plex Sans/Mono (OFL)
  cv/                          CV en PDF
```

## Reglas

Este repositorio se rige por [`AGENTS.md`](AGENTS.md): sin bases de datos, sin
credenciales, sin datos internos y con datos ficticios en todas las demos.

## Pruebas locales realizadas

- Navegación y enlaces internos sin referencias faltantes.
- Revisión de las 7 páginas sin errores de JavaScript en consola.
- Demos probadas en escritorio y móvil: filtros, roles, visor, repartos,
  reembarques, cálculo de casetas, revisión, ejecución simulada, PDF, envío
  simulado y monitoreo en vivo.
- Impresión del CV y del resumen de liquidación a PDF.
- Auditoría de contenido sensible: sin credenciales, IPs, rutas UNC, dominios
  corporativos ni archivos operativos.

## Publicación en GitHub Pages

1. Crear un repositorio público llamado `portafolio`.
2. Desde esta carpeta:

```powershell
git init
git add .
git commit -m "Portafolio profesional con demos ficticias"
git branch -M main
git remote add origin https://github.com/Isacondobled/portafolio.git
git push -u origin main
```

3. En GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / root**.
4. URL: <https://isacondobled.github.io/portafolio/>

El sitio usa rutas relativas para funcionar en la subcarpeta del repositorio.
`404.html` incluye una base dinámica para resolver sus recursos tanto en local
como en GitHub Pages.

> Si se usa el repositorio `Isacondobled.github.io`, la URL será
> <https://isacondobled.github.io/>.
