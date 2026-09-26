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

  Así que este Service Worker existe ÚNICAMENTE para que el navegador
  permita "Instalar app" (ícono propio, pantalla completa). Deja pasar
  TODO a la red tal cual (index.html, Firebase, las librerías de los
  CDN…), y lo único que hace es mostrar un aviso amable si el chofer se
  queda sin señal, en vez del error genérico del navegador.
*/

self.addEventListener("install", () => {
  // Activa esta versión del Service Worker de inmediato, sin esperar a
  // que se cierren las pestañas/instancias abiertas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Solo nos interesan las navegaciones (abrir o recargar la app).
  // Todo lo demás — Firebase, las fotos, los CDN de React/Tailwind/
  // Babel/xlsx — pasa de largo a la red, sin tocar nada.
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
