/*
  sw.js — MEDICOM Logística

  IMPORTANTE — por qué este Service Worker NO guarda en caché la app:
  tu index.html ya se actualiza seguido (lo hemos editado varias veces
  esta semana) y tiene su propio mecanismo para forzar siempre la
  versión más reciente (el redirect con "?v=" al principio del
  archivo). Un Service Worker típico de tutorial guarda el HTML/JS en
  caché para que la app cargue "offline" — pero eso significa que,
  después de cada actualización que subas a GitHub, los choferes con la
  app ya instalada seguirían viendo la versión VIEJA hasta que el
  Service Worker decida refrescarse solo (puede tardar). Para una app
  de producción que cambia seguido, eso es peor que no tener Service
  Worker.

  Así que este Service Worker deja pasar TODO a la red tal cual
  (index.html, Firebase, las fotos…) — con UNA excepción: las
  librerías externas (React, Babel, Tailwind, XLSX, Firebase SDK) están
  fijadas a una versión exacta en su URL, así que esa URL JAMÁS cambia
  de contenido. Esas sí se guardan en caché la primera vez que cargan
  bien, para que una señal mala en una carga futura no las trabe (que
  es la causa más común de que la app se quede "cargando" para
  siempre). Si algún día cambias de versión alguna librería en
  index.html, automáticamente se vuelve a descargar (la URL ya es
  distinta), sin tener que tocar este archivo.
*/

const LIB_CACHE = "medicom-libs-v1";
const LIB_URLS = [
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone/babel.min.js",
  "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js",
  "https://cdn.tailwindcss.com",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js",
];

self.addEventListener("install", (event) => {
  // Activa esta versión del Service Worker de inmediato, sin esperar a
  // que se cierren las pestañas/instancias abiertas.
  self.skipWaiting();
  // Intenta guardar cada librería; si alguna falla (sin señal en este
  // momento, por ejemplo) no tira abajo la instalación del Service
  // Worker — simplemente esa no queda en caché todavía.
  event.waitUntil(
    caches.open(LIB_CACHE).then((cache) =>
      Promise.allSettled(LIB_URLS.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== LIB_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Librerías externas de versión fija: de la caché si ya están, y si
  // no, a la red (y entonces sí se guardan para la próxima).
  if (LIB_URLS.includes(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          const copy = res.clone();
          caches.open(LIB_CACHE).then((cache) => cache.put(event.request, copy));
          return res;
        });
      })
    );
    return;
  }

  // Todo lo demás (index.html, Firebase, fotos…) solo nos importa
  // cuando es la navegación principal — para poder mostrar un aviso
  // amable si no hay señal en absoluto.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      new Response(OFFLINE_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    )
  );
});

const OFFLINE_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sin conexión — MEDICOM</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#0B3D63;color:#fff;font-family:system-ui,-apple-system,sans-serif;
    text-align:center;padding:24px;box-sizing:border-box;}
  .box{max-width:320px}
  h1{font-size:20px;margin:16px 0 8px}
  p{color:#CFE6F7;font-size:14px;line-height:1.5;margin:0}
  button{margin-top:20px;padding:12px 22px;border:none;border-radius:10px;
    background:#2F86D9;color:#fff;font-weight:600;font-size:15px;}
</style>
</head>
<body>
  <div class="box">
    <h1>Sin conexión a internet</h1>
    <p>MEDICOM Logística necesita internet para cargar las rutas y guardar entregas. Revisa tu señal e intenta de nuevo.</p>
    <button onclick="location.reload()">Reintentar</button>
  </div>
</body>
</html>`;
