import type * as Leaflet from "leaflet";

// Basiskaart met vectortegels van OpenFreeMap (OpenStreetMap-gegevens, gratis, zonder sleutel):
// scherp op elk zoomniveau. Licht in de kleuren van de gewone OpenStreetMap-kaart (huizen, gras,
// bos en water herkenbaar), donker in een paarse nachttint. Gaat het niet (geen WebGL, of de
// dienst reageert niet), dan valt de kaart terug op de gewone OpenStreetMap-plaatjes.
export type KaartStijl = "licht" | "donker";

// Beide kleurstellingen op dezelfde uitgebreide stijl (met gras, bos, huizen en paden)
const STIJL_URL = "https://tiles.openfreemap.org/styles/liberty";
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
  isStyleLoaded: () => boolean;
  getStyle: () => { layers?: { id: string; type: string }[] };
  setPaintProperty: (laag: string, eigenschap: string, waarde: unknown) => void;
  setLayoutProperty: (laag: string, eigenschap: string, waarde: unknown) => void;
};

// Kleuren per stijl. Licht: zoals de gewone OpenStreetMap-kaart (die in de route-editor).
const PALET: Record<KaartStijl, {
  land: string; wonen: string; gras: string; park: string; bos: string; sport: string; school: string; begraaf: string;
  water: string; huis: string; huisRand: string; weg: string; wegRand: string; grootWeg: string; pad: string;
  tekst: string; tekstRand: string;
}> = {
  licht: {
    land: "#F2EFE9", wonen: "#E0DFDF", gras: "#CDEBB0", park: "#C8FACC", bos: "#ADD19E", sport: "#AAE0CB", school: "#F0F0D8", begraaf: "#AACBAF",
    water: "#AAD3DF", huis: "#D9D0C9", huisRand: "#BFB1A6", weg: "#FFFFFF", wegRand: "#B4ABA1", grootWeg: "#FCD6A4", pad: "#FA8072",
    tekst: "#333333", tekstRand: "#FFFFFF",
  },
  donker: {
    land: "#1E1933", wonen: "#262040", gras: "#23402C", park: "#22452F", bos: "#1C3826", sport: "#21443F", school: "#2E2A44", begraaf: "#253A2E",
    water: "#1E3D5C", huis: "#3A3258", huisRand: "#4C4370", weg: "#5B5380", wegRand: "#2A2445", grootWeg: "#7A6A9E", pad: "#E58A63",
    tekst: "#ECE7F8", tekstRand: "#1E1933",
  },
};

// Kaart geschikt maken om het spel te volgen: herkenbare huizen, groen en paden, en minder ruis
// (geen winkels, parkeerplaatsen, pijltjes, wegnummers of 3D-gebouwen)
function maakSpelklaar(kaart: GlKaart, stijl: KaartStijl) {
  const alle = kaart.getStyle().layers ?? [];
  const lagen = new Set(alle.map((l) => l.id));
  const p = PALET[stijl];
  const zet = (laag: string, eigenschap: string, waarde: unknown) => {
    if (!lagen.has(laag)) return;
    try { kaart.setPaintProperty(laag, eigenschap, waarde); } catch { /* overslaan */ }
  };
  const verberg = (laag: string) => { try { kaart.setLayoutProperty(laag, "visibility", "none"); } catch { /* overslaan */ } };

  for (const id of lagen) {
    if (/^poi/.test(id) || /one_way/.test(id) || /shield/.test(id) || id === "building-3d" || id === "natural_earth") verberg(id);
  }

  zet("background", "background-color", p.land);
  zet("landuse_residential", "fill-color", p.wonen);
  zet("landuse_residential", "fill-opacity", 0.7);
  zet("landcover_grass", "fill-color", p.gras);
  zet("landcover_grass", "fill-opacity", 1);
  zet("park", "fill-color", p.park);
  zet("park", "fill-opacity", 0.9);
  zet("park_outline", "line-opacity", 0);
  zet("landcover_wood", "fill-color", p.bos);
  zet("landcover_wood", "fill-opacity", 1);
  zet("landcover_wetland", "fill-color", p.gras);
  zet("landuse_pitch", "fill-color", p.sport);
  zet("landuse_track", "fill-color", p.sport);
  zet("landuse_school", "fill-color", p.school);
  zet("landuse_hospital", "fill-color", p.school);
  zet("landuse_cemetery", "fill-color", p.begraaf);
  zet("water", "fill-color", p.water);
  for (const id of ["waterway_river", "waterway_other", "waterway_tunnel"]) zet(id, "line-color", p.water);
  // Huizen: gevuld met een duidelijke rand, zoals op OpenStreetMap
  zet("building", "fill-color", p.huis);
  zet("building", "fill-outline-color", p.huisRand);

  for (const l of alle) {
    if (l.type !== "line" || !/^(road|bridge|tunnel)_/.test(l.id) || /rail/.test(l.id)) continue;
    if (/path_pedestrian/.test(l.id)) {
      // Voetpaden: dunne stippellijn (zalmroze, zoals op OpenStreetMap)
      if (/casing/.test(l.id)) { zet(l.id, "line-opacity", 0); continue; }
      zet(l.id, "line-color", p.pad);
      zet(l.id, "line-width", ["interpolate", ["exponential", 1.2], ["zoom"], 13, 0.6, 16, 1.4, 20, 4]);
      continue;
    }
    if (/casing/.test(l.id)) { zet(l.id, "line-color", p.wegRand); continue; }
    zet(l.id, "line-color", /secondary|tertiary|trunk|primary|motorway/.test(l.id) ? p.grootWeg : p.weg);
  }
  zet("road_area_pattern", "fill-opacity", 0);

  for (const l of alle) {
    if (l.type !== "symbol") continue;
    zet(l.id, "text-color", p.tekst);
    zet(l.id, "text-halo-color", p.tekstRand);
    zet(l.id, "text-halo-width", 1.5);
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
    const laag = (L as unknown as { maplibreGL: (o: object) => Leaflet.Layer & { getMaplibreMap: () => unknown } })
      .maplibreGL({ style: STIJL_URL, attributionControl: false });
    laag.addTo(map);
    // Zodra de stijl er is: kleuren van de gekozen stijl. Wisselen = alleen opnieuw inkleuren.
    let huidig = stijl;
    const gl = laag.getMaplibreMap() as GlKaart;
    gl.on("style.load", () => maakSpelklaar(gl, huidig));
    return {
      vector: true,
      zetStijl: (s) => { huidig = s; if (gl.isStyleLoaded()) maakSpelklaar(gl, s); },
    };
  } catch {
    osmPlaatjes(L, map);
    return { vector: false, zetStijl: () => { /* plaatjes hebben maar één stijl */ } };
  }
}
