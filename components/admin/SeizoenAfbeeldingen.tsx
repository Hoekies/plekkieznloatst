"use client";

import { useEffect, useRef, useState } from "react";
import { OPSLAG } from "@/lib/huisstijl";
import { toonMelding } from "@/components/admin/Melding";
import { THEMAS, huidigThema, periodeTekst, type SeizoenSoort } from "@/lib/seizoenen";
import { knipLogoUit } from "@/lib/logo-uitknippen";
import { verklein } from "@/components/admin/editor/HuisstijlInstellingen";
import Icoon from "@/components/admin/Icoon";

const SOORTEN: { soort: SeizoenSoort; label: string; uitleg: string }[] = [
  { soort: "achtergrond", label: "🖼️ Achtergrond", uitleg: "Achtergrond van het welkomstscherm (staand, 9:16)." },
  { soort: "logo", label: "🔲 Logo", uitleg: "Spellogo, vierkant: inlogscherm, welkomstscherm, oorkonde, uitslag, beamer." },
  { soort: "logo_breed", label: "▭ Logo breed", uitleg: "Spellogo, breed: bovenbalk, rapport, voorproefje, inlogkaartje, beamer." },
];

// 🗓️ Afbeeldingen per seizoen en feestdag, voor alle routes: achtergrond van het welkomstscherm en het
// spellogo (vierkant en breed), op alfabet of door het jaar heen. Upload ze nu al; de app kiest op datum (feestdag gaat voor seizoen).
// Een eigen welkomstfoto van een route gaat altijd voor de seizoensachtergrond. Eigen pagina: /admin/seizoenen.
export default function SeizoenAfbeeldingen() {
  const [paden, setPaden] = useState<Record<SeizoenSoort, Record<string, string>> | null>(null);
  const [logosKlaar, setLogosKlaar] = useState(true);
  const [soort, setSoort] = useState<SeizoenSoort>("achtergrond");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const kiesRef = useRef<HTMLInputElement>(null);
  const voorThema = useRef<string | null>(null);
  // Volgorde van de thema's: op alfabet of door het jaar heen (onthouden op dit toestel)
  const [volgorde, setVolgorde] = useState<"alfabet" | "periode">("alfabet");
  useEffect(() => { try { if (localStorage.getItem("pr_seizoen_volgorde") === "periode") setVolgorde("periode"); } catch { /* geen opslag */ } }, []);
  function kiesVolgorde(v: "alfabet" | "periode") {
    setVolgorde(v);
    try { localStorage.setItem("pr_seizoen_volgorde", v); } catch { /* geen opslag */ }
  }

  async function laad() {
    const res = await fetch("/api/admin/achtergronden").catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setFout(d.fout ?? "Laden lukte niet"); setPaden({ achtergrond: {}, logo: {}, logo_breed: {} }); return; }
    setPaden(d.paden);
    setLogosKlaar(d.logosKlaar !== false);
    setVast(d.vast ?? null);
  }
  useEffect(() => { laad(); }, []);

  // 📌 Eén thema overal vastzetten (achtergrond, beide logo's en de finish), wat de datum ook is; null = weer op datum
  const [vast, setVast] = useState<string | null>(null);
  async function zetVast(sleutel: string | null) {
    const oud = vast;
    setVast(sleutel);
    const res = await fetch("/api/admin/achtergronden", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vast: sleutel }) }).catch(() => null);
    const r = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setVast(oud); toonMelding(r.fout ?? "Opslaan lukte niet", "fout"); return; }
    const t = THEMAS.find((x) => x.sleutel === sleutel);
    toonMelding(t ? `${t.emoji} ${t.naam} staat nu overal vast (binnen 5 minuten op alle telefoons)` : "Weer automatisch op datum");
  }

  // Achtergrond als jpg; logo eerst uitknippen (achtergrond doorzichtig, lege randen eraf), dan als webp
  async function upload(thema: string, bestand: File | undefined) {
    if (!bestand) return;
    setBezig(thema);
    try {
      const logo = soort !== "achtergrond";
      const bron = logo ? (await knipLogoUit(bestand)) ?? bestand : bestand;
      const klein = await verklein(bron, soort === "achtergrond" ? 1600 : soort === "logo" ? 600 : 900, logo);
      if (!klein) { toonMelding("Dit bestand kan niet als afbeelding worden geopend", "fout"); return; }
      const form = new FormData();
      form.append("bestand", new File([klein], logo ? "logo.webp" : "achtergrond.jpg", { type: klein.type }));
      form.append("bucket", "route-afbeeldingen");
      const up = await fetch("/api/admin/upload", { method: "POST", body: form }).catch(() => null);
      const data = up ? await up.json().catch(() => ({})) : {};
      if (!up?.ok) { toonMelding(data.fout ?? "Uploaden lukte niet", "fout"); return; }
      const res = await fetch("/api/admin/achtergronden", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thema, soort, pad: data.pad }) }).catch(() => null);
      const r = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok) { toonMelding(r.fout ?? "Opslaan lukte niet", "fout"); return; }
      setPaden((p) => p && { ...p, [soort]: { ...p[soort], [thema]: data.pad } });
    } finally {
      setBezig(null);
    }
  }
  async function weg(thema: string) {
    const res = await fetch("/api/admin/achtergronden", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thema, soort }) }).catch(() => null);
    if (res?.ok) setPaden((p) => { if (!p) return p; const n = { ...p[soort] }; delete n[thema]; return { ...p, [soort]: n }; });
  }

  const nu = new Date();
  const huidig = paden?.[soort] ?? {};
  const vastThema = THEMAS.find((t) => t.sleutel === vast) ?? null;
  // Vast: altijd dat thema (zonder afbeelding van deze soort: de gewone); anders op datum
  const actief = vastThema ? (huidig[vastThema.sleutel] ? vastThema : null) : paden ? huidigThema(nu, new Set(Object.keys(huidig))) : null;
  const info = SOORTEN.find((s) => s.soort === soort)!;
  const logo = soort !== "achtergrond";
  // Door het jaar heen: op begindatum dit jaar (januari → december)
  const begin = (t: (typeof THEMAS)[number]) => { const [van] = t.periode(nu.getFullYear()); return van.getMonth() * 100 + van.getDate(); };
  const themas = [...THEMAS].sort((a, b) => volgorde === "periode" ? begin(a) - begin(b) : a.naam.localeCompare(b.naam, "nl"));

  return (
    <div className="form-group seizoen">
      <span className="inst-uitleg">
        Voor <strong>alle routes</strong>. Upload ze nu al; de app wisselt vanzelf naar de feestdag of het seizoen van dat moment.
        {soort === "achtergrond" && " Een route met een eigen welkomstfoto houdt die foto."}
      </span>
      {fout && <span className="inst-uitleg" style={{ color: "#FCA5A5" }}>⚠️ {fout}</span>}
      {paden && (
        <>
          <div className="seizoen-soorten">
            {SOORTEN.map((s) => (
              <button key={s.soort} type="button" className={`rl-knop${soort === s.soort ? " rl-knop--cyan" : ""}`} onClick={() => setSoort(s.soort)} aria-pressed={soort === s.soort}>
                {s.label} <span className="seizoen-telling">{Object.keys(paden[s.soort] ?? {}).length}</span>
              </button>
            ))}
            <span className="seizoen-volgorde" role="radiogroup" aria-label="Volgorde">
              <button type="button" role="radio" className={`rl-knop${volgorde === "alfabet" ? " rl-knop--cyan" : ""}`} aria-checked={volgorde === "alfabet"} onClick={() => kiesVolgorde("alfabet")}><Icoon naam="tekst" /> Alfabet</button>
              <button type="button" role="radio" className={`rl-knop${volgorde === "periode" ? " rl-knop--cyan" : ""}`} aria-checked={volgorde === "periode"} onClick={() => kiesVolgorde("periode")}><Icoon naam="kalender" /> Periode</button>
            </span>
          </div>
          <div className="seizoen-vast">
            {vastThema ? (
              <>
                <span>📌 Vast: <strong>{vastThema.emoji} {vastThema.naam}</strong>, overal (ook de finish), wat de datum ook is.</span>
                <button type="button" className="rl-knop" onClick={() => zetVast(null)}>↺ Weer automatisch</button>
              </>
            ) : (
              <span>Automatisch op datum. Tik op 📌 bij een thema om dat overal vast te zetten.</span>
            )}
          </div>
          <span className="inst-uitleg">
            {info.uitleg}{actief ? <> Nu: <strong>{actief.emoji} {actief.naam}</strong>.</> : logo ? " Nu: het gewone logo." : vastThema ? " Nu: de gewone achtergrond." : null}
          </span>
          {logo && !logosKlaar ? (
            <span className="inst-uitleg" style={{ color: "#FCA5A5" }}>⚠️ Draai eerst migratie 020 (seizoenslogo&apos;s) in Supabase.</span>
          ) : (
            <div className={`seizoen-raster${logo ? " seizoen-raster--logo" : ""}`}>
              {themas.map((t) => {
                const pad = huidig[t.sleutel];
                const isNu = actief?.sleutel === t.sleutel;
                return (
                  <div key={t.sleutel} className={`seizoen-vak${isNu ? " seizoen-vak--nu" : ""}`}>
                    <button type="button" className="seizoen-beeld" disabled={!!bezig}
                      onClick={() => { voorThema.current = t.sleutel; kiesRef.current?.click(); }}
                      title={pad ? "Andere afbeelding kiezen" : "Afbeelding kiezen"}
                      style={pad ? { backgroundImage: `url(${OPSLAG + pad})` } : undefined}>
                      {bezig === t.sleutel ? <Icoon naam="laden" /> : pad ? "" : "+"}
                    </button>
                    <span className="seizoen-naam">{t.emoji} {t.naam}{isNu && <span className="seizoen-nu">{vast ? "vast" : "nu"}</span>}</span>
                    <span className="seizoen-periode">{periodeTekst(t, nu.getFullYear())}</span>
                    <button type="button" className="seizoen-pin" aria-pressed={vast === t.sleutel}
                      onClick={() => zetVast(vast === t.sleutel ? null : t.sleutel)}
                      title={vast === t.sleutel ? "Vastgezet: tik om weer automatisch op datum te wisselen" : `${t.naam} overal vastzetten`}
                      aria-label={vast === t.sleutel ? `${t.naam} losmaken` : `${t.naam} vastzetten`}>📌</button>
                    {pad && <button type="button" className="seizoen-weg" onClick={() => weg(t.sleutel)} title="Weghalen" aria-label={`${info.label} ${t.naam} weghalen`}>✕</button>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      <input ref={kiesRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
        onChange={(e) => { if (voorThema.current) upload(voorThema.current, e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
