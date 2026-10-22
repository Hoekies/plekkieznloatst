"use client";

import { useRef, useState } from "react";
import type { Route } from "@/types/database";
import { toonMelding } from "@/components/admin/Melding";
import { GELUID_SETS, speelVoorbeeld, type GeluidSet } from "@/lib/sounds";

const OPSLAG = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/route-afbeeldingen/`;
// Voorbeeldkleuren; met 🎨 kies je elke andere kleur
const KLEUREN = ["#FF8A00", "#E11D48", "#2563EB", "#16A34A", "#7C3AED", "#0891B2"];

type Velden = { huisstijl_kleur?: string | null; huisstijl_logo_pad?: string | null; welkom_foto_pad?: string | null; geluid_set?: string };

// Foto verkleinen in de browser (de opslag neemt max 500 KB): logo's als webp (doorzichtig blijft doorzichtig), foto's als jpg
async function verklein(bestand: File, maxZijde: number, logo: boolean): Promise<Blob | null> {
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
  const [bezig, setBezig] = useState<"logo" | "foto" | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const kleur = route.huisstijl_kleur ?? null;
  const set = (route.geluid_set ?? "klassiek") as GeluidSet;

  async function upload(soort: "logo" | "foto", bestand: File | undefined) {
    if (!bestand) return;
    setBezig(soort);
    try {
      const klein = await verklein(bestand, soort === "logo" ? 600 : 1600, soort === "logo");
      if (!klein) { toonMelding("Dit bestand kan niet als afbeelding worden geopend", "fout"); return; }
      const form = new FormData();
      form.append("bestand", new File([klein], soort === "logo" ? "logo.webp" : "foto.jpg", { type: klein.type }));
      form.append("bucket", "route-afbeeldingen");
      const res = await fetch("/api/admin/upload", { method: "POST", body: form }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok) { toonMelding(data.fout ?? "Uploaden lukte niet", "fout"); return; }
      await onOpslaan(soort === "logo" ? { huisstijl_logo_pad: data.pad } : { welkom_foto_pad: data.pad });
    } finally {
      setBezig(null);
    }
  }

  return (
    <div className="form-group huisstijl">
      <label className="form-label">🎨 Huisstijl voor de spelers</label>
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
        {route.huisstijl_logo_pad && <button type="button" className="rl-knop rl-knop--rood rl-knop--icoon" onClick={() => onOpslaan({ huisstijl_logo_pad: null })} title="Logo weghalen" aria-label="Logo weghalen">✕</button>}
        <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { upload("logo", e.target.files?.[0]); e.target.value = ""; }} />
      </div>
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
      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
        Bijvoorbeeld voor een bedrijfsuitje: de kleur en het logo van het bedrijf in de spelersapp, en een eigen foto op het welkomstscherm. Leeg = de gewone PointRush-stijl.
      </span>
    </div>
  );
}
