import { VECTOR_STIJL_URL } from "@/lib/basiskaart";

// 🗺️ Kaart van het speelgebied alvast ophalen, zodat de service worker (public/sw.js) hem bewaart.
// Valt het bereik later weg (bos, weiland), dan staat de kaart er nog. Eén keer per route per toestel.
const MARGE_GRADEN = 0.004; // ± 400 m rond de punten
const MAX_TEGELS = 200;

function tegel(lat: number, lng: number, z: number): [number, number] {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return [x, y];
}

export async function bewaarKaartGebied(sleutel: string, plekken: { latitude: number; longitude: number }[]) {
  if (!plekken.length || typeof caches === "undefined" || !navigator.serviceWorker?.controller) return;
  const opslagSleutel = `pr_kaart_bewaard_${sleutel}`;
  try { if (localStorage.getItem(opslagSleutel)) return; } catch { /* geen opslag */ }
  try {
    const stijl = await (await fetch(VECTOR_STIJL_URL)).json();
    const bron = stijl?.sources?.openmaptiles;
    const tegelJson = bron?.url ? await (await fetch(bron.url)).json() : bron;
    const sjabloon: string | undefined = tegelJson?.tiles?.[0];
    if (!sjabloon) return;
    const maxZoom = Math.min(14, tegelJson.maxzoom ?? 14);
    const lats = plekken.map((p) => p.latitude), lngs = plekken.map((p) => p.longitude);
    const [noord, zuid] = [Math.max(...lats) + MARGE_GRADEN, Math.min(...lats) - MARGE_GRADEN];
    const [oost, west] = [Math.max(...lngs) + MARGE_GRADEN, Math.min(...lngs) - MARGE_GRADEN];
    const urls: string[] = [];
    for (let z = 10; z <= maxZoom; z++) {
      const [x1, y1] = tegel(noord, west, z), [x2, y2] = tegel(zuid, oost, z);
      for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) {
        urls.push(sjabloon.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y)));
      }
    }
    // Te groot gebied: dan niet (het zou te veel data kosten)
    if (urls.length > MAX_TEGELS) return;
    // Een paar tegelijk; mislukte tegels zijn niet erg
    for (let i = 0; i < urls.length; i += 4) {
      await Promise.all(urls.slice(i, i + 4).map((u) => fetch(u).catch(() => null)));
    }
    try { localStorage.setItem(opslagSleutel, String(Date.now())); } catch { /* geen opslag */ }
  } catch { /* geen verbinding: volgende keer opnieuw */ }
}
