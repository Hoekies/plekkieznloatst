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

type GlKaart = {
  on: (e: string, f: () => void) => void;
  setStyle: (s: string) => void;
  getStyle: () => { layers?: { id: string }[] };
  setPaintProperty: (laag: string, eigenschap: string, waarde: unknown) => void;
  setLayoutProperty: (laag: string, eigenschap: string, waarde: unknown) => void;
};

// Kaart geschikt maken om het spel te volgen: wegen en vooral voetpaden goed zichtbaar, groen
// herkenbaar, minder ruis (geen winkels, parkeerplaatsen, pijltjes of 3D-gebouwen)
function maakSpelklaar(kaart: GlKaart, stijl: KaartStijl) {
  const lagen = new Set((kaart.getStyle().layers ?? []).map((l) => l.id));
  const zet = (laag: string, eigenschap: string, waarde: unknown) => {
    if (!lagen.has(laag)) return;
    try { kaart.setPaintProperty(laag, eigenschap, waarde); } catch { /* andere stijl: overslaan */ }
  };
  const verberg = (laag: string) => { try { kaart.setLayoutProperty(laag, "visibility", "none"); } catch { /* overslaan */ } };

  for (const id of lagen) {
    if (/^poi/.test(id) || /one_way/.test(id) || /shield/.test(id) || id === "building-3d") verberg(id);
  }
  if (stijl !== "licht") return;

  // Voetpaden: oranje stippellijn (stond wit op een lichte achtergrond)
  for (const id of ["road_path_pedestrian", "bridge_path_pedestrian", "tunnel_path_pedestrian"]) {
    zet(id, "line-color", "#D9661F");
    zet(id, "line-width", ["interpolate", ["exponential", 1.2], ["zoom"], 13, 1, 16, 2.2, 20, 7]);
  }
  // Wegen: wit met een duidelijke rand
  for (const id of ["road_minor_casing", "road_service_track_casing", "road_link_casing", "bridge_street_casing", "bridge_service_track_casing", "road_secondary_tertiary_casing", "road_trunk_primary_casing"]) {
    zet(id, "line-color", "#9C9488");
  }
  for (const id of ["road_minor", "road_service_track", "road_link", "bridge_street", "bridge_service_track"]) zet(id, "line-color", "#FFFFFF");
  // Groen en water herkenbaar
  zet("landcover_grass", "fill-opacity", 0.65);
  zet("landcover_grass", "fill-color", "#B9DD9C");
  zet("park", "fill-color", "#C6E5A9");
  zet("landcover_wood", "fill-color", "#A9D48C");
  zet("water", "fill-color", "#8EC3EA");
  // Gebouwen lichter, zodat wegen en spelers opvallen
  zet("building", "fill-color", "#E9E4DD");
  zet("background", "background-color", "#F4F1EC");
  // Straatnamen beter leesbaar
  for (const id of ["highway-name-minor", "highway-name-major", "highway-name-path"]) {
    zet(id, "text-color", "#2E2A26");
    zet(id, "text-halo-color", "#FFFFFF");
    zet(id, "text-halo-width", 1.6);
  }
}

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
    // Na elke (nieuwe) stijl: spelklaar maken
    let huidig = stijl;
    const gl = laag.getMaplibreMap() as unknown as GlKaart;
    gl.on("style.load", () => maakSpelklaar(gl, huidig));
    return { vector: true, zetStijl: (s) => { huidig = s; gl.setStyle(STIJLEN[s]); } };
  } catch {
    osmPlaatjes(L, map);
    return { vector: false, zetStijl: () => { /* plaatjes hebben maar één stijl */ } };
  }
}
