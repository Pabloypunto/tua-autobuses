# TUA · Próximos autobuses (PWA)

Primera versión funcional de la interfaz.

## Qué incluye
- Selección de las 16 líneas y sus sentidos.
- Catálogo inicial de paradas con identificadores comprobados.
- Consulta del endpoint público `https://www.tua.es/rest/estimaciones/{id}`.
- Actualización automática cada 20 segundos.
- Diseño adaptable a móvil y escritorio.
- Manifest, iconos y service worker para instalación como PWA.

## Importante: catálogo parcial
Los recorridos A, B y C están incorporados completos a partir de la información recopilada. De D, E, F, G, H, J, L, O y Búho se incluyen paradas ya identificadas, pero sus catálogos están incompletos. K, M, U y V están pendientes de incorporar. El archivo `data/stops.json` es el catálogo editable.

## Cómo probar
La PWA necesita servirse desde `localhost` o HTTPS (no basta con abrir `index.html` con doble clic).

Con Python instalado:
```bash
python -m http.server 8000
```
Después abre `http://localhost:8000` desde la carpeta del proyecto.

## Publicación
Sube el contenido de esta carpeta a un hosting estático con HTTPS (por ejemplo, un alojamiento web propio, Netlify, Vercel o GitHub Pages). Al entrar desde un navegador compatible aparecerá la opción de instalar.

## Conexión en tiempo real / CORS
La aplicación intenta consultar directamente el endpoint de TUA. Si el navegador bloquea la petición por CORS, la interfaz mostrará el error. En ese caso hay que desplegar un pequeño proxy/backend HTTPS y cambiar `API_BASE` en `app.js` por la URL de ese servicio. No se incluye una clave API porque el endpoint probado no la solicitó en la consulta pública.

## Estructura
- `index.html`: pantalla principal
- `styles.css`: estilos
- `app.js`: lógica de selección y consulta
- `data/stops.json`: catálogo de líneas, sentidos y paradas
- `manifest.webmanifest`: configuración PWA
- `sw.js`: caché de la aplicación
- `icons/`: iconos de instalación
