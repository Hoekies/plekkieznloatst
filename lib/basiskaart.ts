import type * as Leaflet from "leaflet";

// Basiskaart met vectortegels van OpenFreeMap (OpenStreetMap-gegevens, gratis, zonder sleutel):
// scherp op elk zoomniveau. Licht in de kleuren van de gewone OpenStreetMap-kaart (huizen, gras,
// bos en water herkenbaar), donker in een paarse nachttint, of een luchtfoto (PDOK, Nederland).
// Gaat de vectorkaart niet (geen WebGL, of de dienst reageert niet), dan valt hij terug op de
// gewone OpenStreetMap-plaatjes.
export type KaartStijl = "licht" | "donker" | "luchtfoto";

// Alle kleurstellingen op dezelfde uitgebreide stijl (met gras, bos, huizen en paden)
const STIJL_URL = "https://tiles.openfreemap.org/styles/liberty";
const STIJL_KEY = "pr_kaart_stijl";
// Luchtfoto van PDOK (Nederlandse overheid, gratis, zonder sleutel), hoge resolutie
const LUCHTFOTO_URL = "https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg";

export function bewaardeStijl(): KaartStijl {
  try {
    const s = localStorage.getItem(STIJL_KEY);
    return s === "donker" || s === "luchtfoto" ? s : "licht";
  } catch { return "licht"; }
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

type Filter = unknown[] | null | undefined;
type GlKaart = {
  on: (e: string, f: () => void) => void;
  isStyleLoaded: () => boolean;
  getStyle: () => { layers?: { id: string; type: string }[] };
  getLayer: (id: string) => unknown;
  getFilter: (id: string) => Filter;
  setFilter: (id: string, f: Filter) => void;
  addLayer: (laag: object, voor?: string) => void;
  setPaintProperty: (laag: string, eigenschap: string, waarde: unknown) => void;
  setLayoutProperty: (laag: string, eigenschap: string, waarde: unknown) => void;
  setLayerZoomRange: (laag: string, min: number, max: number) => void;
};

// Kleuren per stijl. Licht: zoals de gewone OpenStreetMap-kaart (die in de route-editor).
type Palet = {
  land: string; wonen: string; gras: string; park: string; bos: string; sport: string; school: string; begraaf: string;
  water: string; huis: string; huisRand: string; weg: string; wegRand: string; grootWeg: string; pad: string;
  tekst: string; tekstRand: string;
};
const PALET: Record<"licht" | "donker", Palet> = {
  licht: {
    // Zoals OpenStreetMap, maar rustiger: geen rood, oranje of geel in de ondergrond, zodat de
    // teamkleuren (rood, geel, groen…) er duidelijk uitspringen
    land: "#F3F1ED", wonen: "#E6E4E1", gras: "#DCEDCC", park: "#D6F0D6", bos: "#C2DDB6", sport: "#CDE6DC", school: "#EEEDE2", begraaf: "#C8DACB",
    water: "#B9DBE6", huis: "#E0DAD4", huisRand: "#CBC1B8", weg: "#FFFFFF", wegRand: "#C3BCB4", grootWeg: "#FFFFFF", pad: "#A39A92",
    tekst: "#3A3631", tekstRand: "#FFFFFF",
  },
  donker: {
    land: "#1E1933", wonen: "#262040", gras: "#23402C", park: "#22452F", bos: "#1C3826", sport: "#21443F", school: "#2E2A44", begraaf: "#253A2E",
    water: "#1E3D5C", huis: "#3A3258", huisRand: "#4C4370", weg: "#5B5380", wegRand: "#2A2445", grootWeg: "#7A6A9E", pad: "#E58A63",
    tekst: "#ECE7F8", tekstRand: "#1E1933",
  },
};

// Plekken die op de kaart blijven (OpenMapTiles-klassen), als herkenningspunt:
// parkeren, kerken, horeca, speeltuinen, scholen, monumenten/musea en wat verder handig is
const POI_KLASSEN = [
  "parking", "place_of_worship", "cafe", "bar", "beer", "restaurant", "playground",
  "school", "college", "kindergarten",
  "monument", "memorial", "castle", "museum", "attraction",
  "town_hall", "library", "toilets", "pitch", "stadium", "swimming", "sports_centre",
];

// Eenmalig na het laden van de stijl: wat zichtbaar is (los van de kleuren)
function richtIn(kaart: GlKaart) {
  const alle = kaart.getStyle().layers ?? [];
  const verberg = (laag: string) => { try { kaart.setLayoutProperty(laag, "visibility", "none"); } catch { /* overslaan */ } };
  for (const l of alle) {
    // Van alle plekken alleen handige herkenningspunten: parkeren, kerken, cafés/kroegen en restaurants
    if (/^poi_r/.test(l.id)) {
      const isParkeren = ["==", ["get", "class"], "parking"];
      try { kaart.setFilter(l.id, ["all", kaart.getFilter(l.id) ?? true, ["in", ["get", "class"], ["literal", POI_KLASSEN]]]); } catch { verberg(l.id); }
      // Alleen icoontjes, geen namen; parkeren iets zachter
      try {
        kaart.setPaintProperty(l.id, "icon-opacity", ["case", isParkeren, 0.55, 1]);
        kaart.setLayoutProperty(l.id, "icon-size", ["case", isParkeren, 0.8, 1]);
        kaart.setLayoutProperty(l.id, "text-field", "");
      } catch { /* overslaan */ }
      continue;
    }
    if (l.id === "poi_transit" || /one_way/.test(l.id) || /shield/.test(l.id) || l.id === "building-3d" || l.id === "natural_earth") verberg(l.id);
    // Paden: privé (tuinpaden, erven) weglaten, alleen waar je mag lopen
    if (/path_pedestrian/.test(l.id)) {
      try { kaart.setFilter(l.id, ["all", kaart.getFilter(l.id) ?? true, ["!=", ["coalesce", ["get", "access"], ""], "no"]]); } catch { /* overslaan */ }
    }
  }
  // De platte huizen stoppen in deze stijl bij zoom 14 (daarboven 3D): op elk zoomniveau tonen
  try { kaart.setLayerZoomRange("building", 13, 24); } catch { /* overslaan */ }
  // Huisnummers bij ver inzoomen
  if (!kaart.getLayer("pr-huisnummers")) {
    try {
      kaart.addLayer({
        id: "pr-huisnummers", type: "symbol", source: "openmaptiles", "source-layer": "housenumber", minzoom: 17,
        layout: { "text-field": ["get", "housenumber"], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-allow-overlap": false },
        paint: { "text-color": "#6B5E54", "text-halo-color": "#FFFFFF", "text-halo-width": 1 },
      });
    } catch { /* overslaan */ }
  }
}

// Kleuren van de gekozen stijl
function kleurIn(kaart: GlKaart, stijl: "licht" | "donker") {
  const alle = kaart.getStyle().layers ?? [];
  const lagen = new Set(alle.map((l) => l.id));
  const p = PALET[stijl];
  const zet = (laag: string, eigenschap: string, waarde: unknown) => {
    if (!lagen.has(laag)) return;
    try { kaart.setPaintProperty(laag, eigenschap, waarde); } catch { /* overslaan */ }
  };

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
    if (l.type !== "symbol" || l.id === "pr-huisnummers") continue;
    zet(l.id, "text-color", p.tekst);
    zet(l.id, "text-halo-color", p.tekstRand);
    zet(l.id, "text-halo-width", 1.5);
  }
  zet("pr-huisnummers", "text-color", stijl === "licht" ? "#6B5E54" : "#B9B0D6");
  zet("pr-huisnummers", "text-halo-color", p.tekstRand);
}

// Voor kaarten die direct met MapLibre werken (zoals de replay): bibliotheek laden met de
// eigen worker, en stijl, inrichting en kleuren toepassen
export const VECTOR_STIJL_URL = STIJL_URL;
export async function laadMaplibre() {
  if (!document.querySelector("#maplibre-css")) {
    const link = document.createElement("link");
    link.id = "maplibre-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.css";
    document.head.appendChild(link);
  }
  const maplibre = await import("maplibre-gl");
  maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker-6.15.0.mjs");
  return maplibre;
}
export function webglMogelijk(): boolean {
  const proef = document.createElement("canvas");
  return !!(proef.getContext("webgl2") || proef.getContext("webgl"));
}
type GlMetBronnen = GlKaart & {
  getSource: (id: string) => unknown;
  addSource: (id: string, bron: object) => void;
  removeLayer: (id: string) => void;
};
// Na het laden van de stijl: inrichten (eenmalig per stijl) en de gekozen stijl toepassen
export function pasStijlToe(kaart: unknown, stijl: KaartStijl, ookInrichten: boolean) {
  const gl = kaart as GlMetBronnen;
  if (ookInrichten) richtIn(gl);
  if (stijl !== "luchtfoto") kleurIn(gl, stijl);
  // Luchtfoto als laag onder de namen
  const heeft = !!gl.getLayer("pr-luchtfoto");
  if (stijl === "luchtfoto" && !heeft) {
    if (!gl.getSource("pr-pdok")) gl.addSource("pr-pdok", { type: "raster", tiles: [LUCHTFOTO_URL], tileSize: 256, maxzoom: 19, attribution: "Luchtfoto © PDOK" });
    const eersteNaam = (gl.getStyle().layers ?? []).find((l) => l.type === "symbol")?.id;
    gl.addLayer({ id: "pr-luchtfoto", type: "raster", source: "pr-pdok" }, eersteNaam);
  } else if (stijl !== "luchtfoto" && heeft) {
    gl.removeLayer("pr-luchtfoto");
  }
}

export async function voegBasiskaartToe(Lin: typeof Leaflet, map: Leaflet.Map, stijl: KaartStijl): Promise<Basiskaart> {
  // Werkt met zowel import("leaflet") als import("leaflet").default
  const L = ((Lin as unknown as { default?: typeof Leaflet }).default ?? Lin) as typeof Leaflet;
  // Luchtfoto: een laag bovenop de basiskaart, aan of uit
  let luchtfoto: Leaflet.TileLayer | null = null;
  const zetLuchtfoto = (aan: boolean) => {
    try {
      if (aan && !luchtfoto) luchtfoto = L.tileLayer(LUCHTFOTO_URL, { maxZoom: 21, maxNativeZoom: 19, zIndex: 5, attribution: "Luchtfoto © PDOK" }).addTo(map);
      if (!aan && luchtfoto) { luchtfoto.remove(); luchtfoto = null; }
    } catch { /* kaart is intussen weg */ }
  };

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
    // Zodra de stijl er is: inrichten en de kleuren van de gekozen stijl. Wisselen = opnieuw inkleuren.
    let huidig = stijl;
    const gl = laag.getMaplibreMap() as GlKaart;
    gl.on("style.load", () => { richtIn(gl); kleurIn(gl, huidig === "donker" ? "donker" : "licht"); });
    zetLuchtfoto(stijl === "luchtfoto");
    return {
      vector: true,
      zetStijl: (s) => {
        huidig = s;
        zetLuchtfoto(s === "luchtfoto");
        if (s !== "luchtfoto" && gl.isStyleLoaded()) kleurIn(gl, s);
      },
    };
  } catch {
    osmPlaatjes(L, map);
    zetLuchtfoto(stijl === "luchtfoto");
    // Zonder vectorkaart: alleen luchtfoto aan of uit
    return { vector: false, zetStijl: (s) => zetLuchtfoto(s === "luchtfoto") };
  }
}
