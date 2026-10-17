// Kleine service worker: maakt PointRush installeerbaar als app (Android: "App installeren").
// Hij bewaart niets: alles komt altijd vers van het internet. Alleen als er geen verbinding is,
// krijgt een geopende pagina een nette melding in plaats van de foutpagina van de browser.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const OFFLINE = `<!doctype html><html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>PointRush</title>
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
gap:12px;padding:24px;text-align:center;background:#1c0c45;color:#fff;font-family:system-ui,sans-serif}
button{margin-top:8px;padding:12px 22px;border:0;border-radius:12px;background:#FF8A00;color:#fff;font-weight:800;font-size:1rem}</style>
</head><body><div style="font-size:3rem">📡</div><h1 style="margin:0;font-size:1.4rem">Geen internet</h1>
<p style="margin:0;opacity:.8">PointRush heeft verbinding nodig. Controleer je mobiele data of wifi.</p>
<button onclick="location.reload()">Opnieuw proberen</button></body></html>`;

self.addEventListener("fetch", (event) => {
  // Alleen het openen van pagina's; al het andere gaat zoals altijd rechtstreeks naar het netwerk
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
  );
});
