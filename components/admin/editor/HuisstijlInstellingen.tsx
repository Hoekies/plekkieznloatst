"use client";

import { useRef, useState } from "react";
import { OPSLAG } from "@/lib/huisstijl";
import type { Route } from "@/types/database";
import { toonMelding } from "@/components/admin/Melding";
import { GELUID_SETS, speelVoorbeeld, type GeluidSet } from "@/lib/sounds";
import { knipLogoUit } from "@/lib/logo-uitknippen";

// Voorbeeldkleuren; met 🎨 kies je elke andere kleur
const KLEUREN = ["#FF8A00", "#E11D48", "#2563EB", "#16A34A", "#7C3AED", "#0891B2"];

type Velden = { huisstijl_kleur?: string | null; huisstijl_logo_pad?: string | null; welkom_foto_pad?: string | null; geluid_set?: string };

// Foto verkleinen in de browser (de opslag neemt max 500 KB): logo's als webp (doorzichtig blijft doorzichtig), foto's als jpg
export async function verklein(bestand: Blob, maxZijde: number, logo: boolean): Promise<Blob | null> {
  const beeld = await createImageBitmap(bestand).catch(() => null);
  if (!beeld) return null;
  const schaal = Math.min(1, maxZijde / Math.max(beeld.width, beeld.height));
  const doek = document.createElement("canvas");
  doek.width = Math.round(beeld.width * schaal); doek.height = Math.round(beeld.height * schaal);
  doek.getContext("2d")?.drawImage(beeld, 0, 0, doek.width, doek.height);
  return new Promise((r) => doek.toBlob(r, logo ? "image/webp" : "image/jpeg", logo ? 0.9 : 0.8));
}

// 🎨 Huisstijl (kleur, logo, welkomstfoto) en 🔔 geluiden voor de spelers van deze route
export default function HuisstijlInstellingen({ route, onOpslaan }: { route: Route; onOpslaan: (velden: Velden) => Promise<boolean> }) {
  const [bezig, setBezig] = useState<"logo" | "foto" | "knip" | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const kleur = route.huisstijl_kleur ?? null;
  const set = (route.geluid_set ?? "klassiek") as GeluidSet;

  // Logo: eerst uitknippen (achtergrond doorzichtig, lege randen eraf), dan verkleinen
  async function upload(soort: "logo" | "foto", bestand: Blob | undefined, alsKnip = false) {
    if (!bestand) return;
    setBezig(alsKnip ? "knip" : soort);
    try {
      const bron = soort === "logo" ? (await knipLogoUit(bestand)) ?? bestand : bestand;
      const klein = await verklein(bron, soort === "logo" ? 600 : 1600, soort === "logo");
      if (!klein) { toonMelding("Dit bestand kan niet als afbeelding worden geopend", "fout"); return; }
      const form = new FormData();
      form.append("bestand", new File([klein], soort === "logo" ? "logo.webp" : "foto.jpg", { type: klein.type }));
      form.append("bucket", "route-afbeeldingen");
      const res = await fetch("/api/admin/upload", { method: "POST", body: form }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok) { toonMelding(data.fout ?? "Uploaden lukte niet", "fout"); return; }
      await onOpslaan(soort === "logo" ? { huisstijl_logo_pad: data.pad } : { welkom_foto_pad: data.pad });
      if (alsKnip) toonMelding("Logo uitgeknipt", "ok");
    } finally {
      setBezig(null);
    }
  }
  // ✂️ Het huidige logo alsnog uitknippen (voor logo's van vóór het automatisch uitknippen)
  async function knipHuidig() {
    if (!route.huisstijl_logo_pad) return;
    const res = await fetch(OPSLAG + route.huisstijl_logo_pad).catch(() => null);
    if (!res?.ok) { toonMelding("Het logo kon niet worden opgehaald", "fout"); return; }
    await upload("logo", await res.blob(), true);
  }

  return (
    <div className="form-group huisstijl">
      <label className="form-label">🎨 Huisstijl voor de spelers</label>
      <span className="inst-uitleg">
        Laat de app eruitzien als jouw organisatie, bijvoorbeeld bij een bedrijfsuitje. Alles is optioneel; zonder keuze zien de spelers de gewone PointRush-stijl.
      </span>
      {/* Accentkleur: knoppen en accenten in de spelersapp */}
      <div className="huisstijl-rij">
        <span className="huisstijl-label">Kleur</span>
        <button type="button" className={`huisstijl-kleur huisstijl-kleur--standaard${!kleur ? " aan" : ""}`} onClick={() => onOpslaan({ huisstijl_kleur: null })} title="Gewone PointRush-kleuren">PR</button>
        {KLEUREN.map((k) => (
          <button key={k} type="button" className={`huisstijl-kleur${kleur?.toUpperCase() === k ? " aan" : ""}`} style={{ background: k }} onClick={() => onOpslaan({ huisstijl_kleur: k })} aria-label={`Kleur ${k}`} />
        ))}
        <label className={`huisstijl-kleur huisstijl-kleur--eigen${kleur && !KLEUREN.includes(kleur.toUpperCase()) ? " aan" : ""}`} title="Eigen kleur kiezen" style={kleur && !KLEUREN.includes(kleur.toUpperCase()) ? { background: kleur } : undefined}>
          🎨<input type="color" value={kleur ?? "#FF8A00"} onChange={(e) => onOpslaan({ huisstijl_kleur: e.target.value.toUpperCase() })} />
        </label>
      </div>
      {/* Logo (bovenbalk en welkomstscherm) en welkomstfoto (achtergrond van het welkomstscherm) */}
      <div className="huisstijl-rij">
        <span className="huisstijl-label">Logo</span>
        {route.huisstijl_logo_pad && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={OPSLAG + route.huisstijl_logo_pad} alt="Logo" className="huisstijl-voorbeeld huisstijl-voorbeeld--logo" />
        )}
        <button type="button" className="rl-knop" disabled={!!bezig} onClick={() => logoRef.current?.click()}>{bezig === "logo" ? "⏳ Uploaden…" : route.huisstijl_logo_pad ? "🔁 Ander logo" : "📤 Logo kiezen"}</button>
        {route.huisstijl_logo_pad && (
          <button type="button" className="rl-knop" disabled={!!bezig} onClick={knipHuidig} title="Achtergrond doorzichtig maken en de lege randen eraf halen">
            {bezig === "knip" ? "⏳ Uitknippen…" : "✂️ Uitknippen"}
          </button>
        )}
        {route.huisstijl_logo_pad && <button type="button" className="rl-knop rl-knop--rood rl-knop--icoon" onClick={() => onOpslaan({ huisstijl_logo_pad: null })} title="Logo weghalen" aria-label="Logo weghalen">✕</button>}
        <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { upload("logo", e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <span className="inst-uitleg huisstijl-uitleg">
        🏢 <strong>Logo</strong> (bijv. van het bedrijf): komt naast het PointRush-logo in de bovenbalk van de spelersapp, groot op het welkomstscherm, en op de oorkonde, de uitslag-afbeelding en het PDF-rapport. Bij het uploaden knipt de app het logo vanzelf uit: een effen achtergrond (wit of grijs) wordt doorzichtig en lege randen gaan eraf. Met <strong>✂️ Uitknippen</strong> doe je dat alsnog bij het huidige logo.
      </span>
      <div className="huisstijl-rij">
        <span className="huisstijl-label">Welkomstfoto</span>
        {route.welkom_foto_pad && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={OPSLAG + route.welkom_foto_pad} alt="Welkomstfoto" className="huisstijl-voorbeeld" />
        )}
        <button type="button" className="rl-knop" disabled={!!bezig} onClick={() => fotoRef.current?.click()}>{bezig === "foto" ? "⏳ Uploaden…" : route.welkom_foto_pad ? "🔁 Andere foto" : "📤 Foto kiezen"}</button>
        {route.welkom_foto_pad && <button type="button" className="rl-knop rl-knop--rood rl-knop--icoon" onClick={() => onOpslaan({ welkom_foto_pad: null })} title="Foto weghalen" aria-label="Foto weghalen">✕</button>}
        <input ref={fotoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { upload("foto", e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <span className="inst-uitleg huisstijl-uitleg">
        🖼️ <strong>Welkomstfoto</strong>: de achtergrond van het eerste scherm dat de spelers zien, waar ze hun teamnaam en icoon kiezen. Bijvoorbeeld een foto van de plek of van het bedrijf.
      </span>
      {/* 🔔 Geluiden bij punt bereikt, goed, fout en finish; ▶ speelt de hele set af */}
      <div className="huisstijl-rij">
        <span className="huisstijl-label">🔔 Geluiden</span>
        <div className="segment" role="radiogroup" aria-label="Geluidset" style={{ flex: "1 1 260px" }}>
          {GELUID_SETS.map((g) => (
            <button key={g.set} type="button" role="radio" aria-checked={set === g.set} className={set === g.set ? "aan" : ""}
              onClick={() => { onOpslaan({ geluid_set: g.set }); speelVoorbeeld(g.set); }}>{g.naam}</button>
          ))}
        </div>
        <button type="button" className="rl-knop rl-knop--icoon" onClick={() => speelVoorbeeld(set)} title="Luister: punt, goed, fout en finish" aria-label="Voorbeeld afspelen">▶</button>
      </div>
      <span className="inst-uitleg">
        🎨 <strong>Kleur</strong>: de kleur van de knoppen in de spelersapp. 🔔 <strong>Geluiden</strong>: wat de spelers horen bij een punt, een goed of fout antwoord en de finish.
      </span>
    </div>
  );
}
