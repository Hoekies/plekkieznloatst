import type * as Leaflet from "leaflet";

// Basiskaart met vectortegels van OpenFreeMap (OpenStreetMap-gegevens, gratis, zonder sleutel):
// scherp op elk zoomniveau en in een eigen stijl. Gaat het niet (geen WebGL, of de dienst
// reageert niet), dan valt de kaart terug op de gewone OpenStreetMap-plaatjes.
export type KaartStijl = "licht" | "donker";

const STIJLEN: Record<KaartStijl, string> = {
  licht: "https://tiles.openfreemap.org/styles/liberty",
  donker: "https://tiles.openfreemap.org/styles/dark",
};
const STIJL_KEY = "pr_kaart_stijl";

export function bewaardeStijl(): KaartStijl {
  try { return localStorage.getItem(STIJL_KEY) === "donker" ? "donker" : "licht"; } catch { return "licht"; }
}
export function bewaarStijl(stijl: KaartStijl) {
  try { localStorage.setItem(STIJL_KEY, stijl); } catch { /* geen opslag */ }
}

function osmPlaatjes(L: typeof Leaflet, map: Leaflet.Map) {
  try {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
  } catch { /* kaart is intussen weg (pagina verlaten) */ }
}

export type Basiskaart = { vector: boolean; zetStijl: (stijl: KaartStijl) => void };

export async function voegBasiskaartToe(L: typeof Leaflet, map: Leaflet.Map, stijl: KaartStijl): Promise<Basiskaart> {
  try {
    if (!document.querySelector("#maplibre-css")) {
      const link = document.createElement("link");
      link.id = "maplibre-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }
    // Test of WebGL er is: anders werkt de vectorkaart niet
    const proef = document.createElement("canvas");
    if (!(proef.getContext("webgl2") || proef.getContext("webgl"))) throw new Error("geen WebGL");
    // Het rekenhulpje (web worker) van de kaart staat als los bestand op de eigen site: bij het
    // bundelen raakt het pad kwijt dat MapLibre zelf zou gebruiken. Versie moet gelijk zijn aan
    // maplibre-gl in package.json (kopie van node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs).
    const maplibre = await import("maplibre-gl");
    maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker-6.15.0.mjs");
    await import("@maplibre/maplibre-gl-leaflet");
    const laag = (L as unknown as { maplibreGL: (o: object) => Leaflet.Layer & { getMaplibreMap: () => { setStyle: (s: string) => void } } })
      .maplibreGL({ style: STIJLEN[stijl], attributionControl: false });
    laag.addTo(map);
    return { vector: true, zetStijl: (s) => laag.getMaplibreMap().setStyle(STIJLEN[s]) };
  } catch {
    osmPlaatjes(L, map);
    return { vector: false, zetStijl: () => { /* plaatjes hebben maar één stijl */ } };
  }
}
