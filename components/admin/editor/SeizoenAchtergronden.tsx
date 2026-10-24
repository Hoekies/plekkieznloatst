"use client";

import { useEffect, useRef, useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import { THEMAS, huidigThema, periodeTekst } from "@/lib/seizoenen";
import { verklein } from "./HuisstijlInstellingen";

const OPSLAG = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/route-afbeeldingen/`;

// 🗓️ Achtergronden per seizoen en feestdag, voor alle routes. Upload ze nu al; de app kiest op datum welke
// het welkomstscherm krijgt (feestdag gaat voor seizoen). Een eigen welkomstfoto van de route gaat altijd voor.
export default function SeizoenAchtergronden({ eigenFoto }: { eigenFoto: boolean }) {
  const [paden, setPaden] = useState<Record<string, string> | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const kiesRef = useRef<HTMLInputElement>(null);
  const voorThema = useRef<string | null>(null);

  async function laad() {
    const res = await fetch("/api/admin/achtergronden").catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setFout(d.fout ?? "Laden lukte niet"); setPaden({}); return; }
    setPaden(d.achtergronden ?? {});
  }
  useEffect(() => { laad(); }, []);

  async function upload(thema: string, bestand: File | undefined) {
    if (!bestand) return;
    setBezig(thema);
    try {
      const klein = await verklein(bestand, 1600, false);
      if (!klein) { toonMelding("Dit bestand kan niet als afbeelding worden geopend", "fout"); return; }
      const form = new FormData();
      form.append("bestand", new File([klein], "achtergrond.jpg", { type: klein.type }));
      form.append("bucket", "route-afbeeldingen");
      const up = await fetch("/api/admin/upload", { method: "POST", body: form }).catch(() => null);
      const data = up ? await up.json().catch(() => ({})) : {};
      if (!up?.ok) { toonMelding(data.fout ?? "Uploaden lukte niet", "fout"); return; }
      const res = await fetch("/api/admin/achtergronden", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thema, pad: data.pad }) }).catch(() => null);
      const r = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok) { toonMelding(r.fout ?? "Opslaan lukte niet", "fout"); return; }
      setPaden((p) => ({ ...(p ?? {}), [thema]: data.pad }));
    } finally {
      setBezig(null);
    }
  }
  async function weg(thema: string) {
    const res = await fetch("/api/admin/achtergronden", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thema }) }).catch(() => null);
    if (res?.ok) setPaden((p) => { const n = { ...(p ?? {}) }; delete n[thema]; return n; });
  }

  const nu = new Date();
  const actief = paden ? huidigThema(nu, new Set(Object.keys(paden))) : null;
  const aantal = paden ? Object.keys(paden).length : 0;

  return (
    <div className="form-group seizoen">
      <button type="button" className="seizoen-kop" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="form-label" style={{ margin: 0 }}>🗓️ Achtergronden per seizoen en feestdag</span>
        <span className="seizoen-telling">{aantal}/{THEMAS.length} {open ? "▾" : "▸"}</span>
      </button>
      <span className="inst-uitleg">
        Voor <strong>alle routes</strong>. Upload ze nu al; het welkomstscherm krijgt vanzelf de achtergrond van de feestdag of het seizoen van dat moment.
        {actief ? <> Nu: <strong>{actief.emoji} {actief.naam}</strong>.</> : null}
        {eigenFoto && " Deze route heeft een eigen welkomstfoto; die gaat voor."}
      </span>
      {fout && <span className="inst-uitleg" style={{ color: "#FCA5A5" }}>⚠️ {fout}</span>}
      {open && paden && (
        <div className="seizoen-raster">
          {THEMAS.map((t) => {
            const pad = paden[t.sleutel];
            const isNu = actief?.sleutel === t.sleutel;
            return (
              <div key={t.sleutel} className={`seizoen-vak${isNu ? " seizoen-vak--nu" : ""}`}>
                <button type="button" className="seizoen-beeld" disabled={!!bezig}
                  onClick={() => { voorThema.current = t.sleutel; kiesRef.current?.click(); }}
                  title={pad ? "Andere achtergrond kiezen" : "Achtergrond kiezen"}
                  style={pad ? { backgroundImage: `url(${OPSLAG + pad})` } : undefined}>
                  {bezig === t.sleutel ? "⏳" : pad ? "" : "+"}
                </button>
                <span className="seizoen-naam">{t.emoji} {t.naam}{isNu && <span className="seizoen-nu">nu</span>}</span>
                <span className="seizoen-periode">{periodeTekst(t, nu.getFullYear())}</span>
                {pad && <button type="button" className="seizoen-weg" onClick={() => weg(t.sleutel)} title="Weghalen" aria-label={`Achtergrond ${t.naam} weghalen`}>✕</button>}
              </div>
            );
          })}
        </div>
      )}
      <input ref={kiesRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
        onChange={(e) => { if (voorThema.current) upload(voorThema.current, e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
