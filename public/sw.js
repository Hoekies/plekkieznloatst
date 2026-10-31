// Kleine service worker: maakt PointRush installeerbaar als app (Android: "App installeren").
// Pagina's komen altijd vers van het internet; zonder verbinding krijgt een geopende pagina een nette
// melding in plaats van de foutpagina van de browser. Alleen kaarttegels worden bewaard, zodat de kaart
// ook werkt waar het bereik wegvalt (bos, weiland).
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

// Pushmelding voor de beheerder (nieuwe foto, hulpvraag), ook als de app dicht is
self.addEventListener("push", (event) => {
  let bericht = { titel: "PointRush", tekst: "", url: "/admin", tag: undefined, hulp: undefined };
  try { bericht = { ...bericht, ...event.data.json() }; } catch { /* lege of onleesbare melding */ }
  event.waitUntil(self.registration.showNotification(bericht.titel, {
    body: bericht.tekst,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: bericht.tag,
    renotify: !!bericht.tag,
    vibrate: [200, 100, 200],
    data: { url: bericht.url, hulp: bericht.hulp },
    // Hulpvraag: meteen het punt vrijgeven of het team bellen (Android; iPhone toont alleen de melding)
    actions: bericht.hulp ? [
      { action: "vrijgeven", title: "⏭️ Punt vrijgeven" },
      ...(bericht.hulp.telefoon ? [{ action: "bellen", title: "📞 Bellen" }] : []),
    ] : [],
  }));
});

// Tik op de melding: de app openen (of een open venster naar voren halen) op de juiste pagina
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/admin", self.location.origin).href;
  const hulp = event.notification.data?.hulp;
  // ⏭️ Punt vrijgeven vanuit de melding: lukt het, dan een korte bevestiging; anders het dashboard openen
  if (event.action === "vrijgeven" && hulp?.sessieId) {
    event.waitUntil((async () => {
      const res = await fetch(`/api/admin/sessies/${hulp.sessieId}/punt-vrijgeven`, { method: "POST", credentials: "include" }).catch(() => null);
      if (res?.ok) await self.registration.showNotification("✓ Punt vrijgegeven", { body: "Het team kan verder.", icon: "/icon-192.png", badge: "/icon-192.png", tag: "vrijgegeven" });
      else await self.clients.openWindow(url);
    })());
    return;
  }
  // 📞 Bellen: de telefoon-app opent met het nummer van het team
  if (event.action === "bellen" && hulp?.telefoon) {
    event.waitUntil(self.clients.openWindow(`tel:${hulp.telefoon}`).catch(() => self.clients.openWindow(url)));
    return;
  }
  event.waitUntil((async () => {
    const vensters = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const venster of vensters) {
      if (new URL(venster.url).origin === self.location.origin) {
        await venster.focus();
        if ("navigate" in venster) await venster.navigate(url).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});

// Kaarttegels: eerst uit de opslag (tegels veranderen bijna nooit), anders van internet en bewaren.
// Stijl- en tegelbeschrijvingen (.json) juist eerst van internet, met de bewaarde versie als reserve.
const KAART_CACHE = "pr-kaart-v1";
const KAART_HOSTS = ["tiles.openfreemap.org", "tile.openstreetmap.org", "service.pdok.nl", "server.arcgisonline.com"];
const MAX_KAART = 4000;
let bewaard = 0;
async function kaartVerzoek(request) {
  const cache = await caches.open(KAART_CACHE);
  const tegel = /\.(pbf|mvt|png|jpe?g|webp)$/i.test(new URL(request.url).pathname) || /\/tile\/\d+\/\d+\/\d+$/.test(request.url);
  if (tegel) {
    const oud = await cache.match(request);
    if (oud) return oud;
  }
  try {
    const res = await fetch(request);
    // Ondoorzichtige antwoorden (plaatjes zonder CORS) niet: die nemen in de opslag veel te veel ruimte in
    if (res.ok && res.type !== "opaque") {
      await cache.put(request, res.clone());
      if (++bewaard % 200 === 0) ruimKaartCacheOp(cache);
    }
    return res;
  } catch (fout) {
    const oud = await cache.match(request);
    if (oud) return oud;
    throw fout;
  }
}
// Te veel tegels bewaard: de oudste weg
async function ruimKaartCacheOp(cache) {
  const sleutels = await cache.keys();
  for (const s of sleutels.slice(0, Math.max(0, sleutels.length - MAX_KAART))) await cache.delete(s);
}

self.addEventListener("fetch", (event) => {
  if (event.request.method === "GET" && KAART_HOSTS.includes(new URL(event.request.url).hostname)) {
    event.respondWith(kaartVerzoek(event.request));
    return;
  }
  // Verder alleen het openen van pagina's; al het andere gaat zoals altijd rechtstreeks naar het netwerk
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
  );
});
