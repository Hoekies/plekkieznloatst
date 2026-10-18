"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toonMelding } from "@/components/admin/Melding";
import { leesPunten, coordsUitLink, type ImportPunt } from "@/lib/punten-import";

// "📥 Importeren": punten uit een GPX/KML-bestand, of een lijst met coördinaten en Google Maps-links.
// Ze komen vóór de finish, met de standaard punten en straal van de route.
export default function PuntenImporteren({ routeId, punten, straal, onKlaar }: {
  routeId: string; punten: number; straal: number; onKlaar: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tekst, setTekst] = useState("");
  const [gevonden, setGevonden] = useState<ImportPunt[]>([]);
  const [nietHerkend, setNietHerkend] = useState<string[]>([]);
  const [bezig, setBezig] = useState<"lezen" | "opslaan" | null>(null);

  useEffect(() => {
    if (!open) return;
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [open]);

  async function lees(invoer: string) {
    setBezig("lezen");
    const r = leesPunten(invoer);
    const fout = [...r.nietHerkend];
    const extra: ImportPunt[] = [];
    // Korte links van de Google Maps-app: de server pakt ze uit
    for (const kort of r.korteLinks) {
      const res = await fetch(`/api/admin/maps-link?url=${encodeURIComponent(kort)}`).catch(() => null);
      const lang = res?.ok ? (await res.json()).url as string : null;
      const c = lang ? coordsUitLink(lang) : null;
      if (c) extra.push(c); else fout.push(kort);
    }
    setGevonden([...r.punten, ...extra]);
    setNietHerkend(fout);
    setBezig(null);
  }

  async function bestand(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const inhoud = await f.text();
    setTekst("");
    lees(inhoud);
  }

  async function toevoegen() {
    setBezig("opslaan");
    const res = await fetch(`/api/admin/routes/${routeId}/punten/meerdere`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ punten: gevonden, points: punten, radius_meters: straal }),
    });
    const data = await res.json().catch(() => ({}));
    setBezig(null);
    if (!res.ok) { toonMelding(data.fout ?? "Importeren mislukt", "fout"); return; }
    toonMelding(`${data.aantal} punten toegevoegd`, "ok");
    setOpen(false); setTekst(""); setGevonden([]); setNietHerkend([]);
    onKlaar();
  }

  return (
    <>
      <button type="button" className="rl-knop" onClick={() => setOpen(true)}
        data-tip="Punten importeren (GPX, KML, lijst of Google Maps-links)" data-tip-pos="onder" aria-label="Punten importeren">
        📥
      </button>
      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2600, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 520, maxHeight: "88vh", display: "flex" }}>
            <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "16px 16px 14px", minHeight: 0, flex: 1, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>📥 Punten importeren</div>
                <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} aria-label="Sluiten">✕</button>
              </div>
              <label className="rl-knop" style={{ justifyContent: "center", cursor: "pointer" }}>
                📂 GPX- of KML-bestand kiezen
                <input type="file" accept=".gpx,.kml,.txt,.csv,application/gpx+xml,application/vnd.google-earth.kml+xml" onChange={bestand} style={{ display: "none" }} />
              </label>
              <div style={{ fontSize: "0.76rem", color: "var(--muted)", textAlign: "center" }}>of plak hieronder: één punt per regel</div>
              <textarea className="form-input" rows={5} value={tekst} onChange={(e) => setTekst(e.target.value)}
                placeholder={"52.2215, 6.8937 Kerk\nhttps://maps.app.goo.gl/…\nhttps://www.google.com/maps/place/…"}
                style={{ fontFamily: "monospace", fontSize: "0.8rem", resize: "vertical" }} />
              <button type="button" className="rl-knop rl-knop--cyan" disabled={!tekst.trim() || bezig !== null} onClick={() => lees(tekst)}>
                {bezig === "lezen" ? "Bezig…" : "🔍 Lezen"}
              </button>

              {(gevonden.length > 0 || nietHerkend.length > 0) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {gevonden.map((p, i) => (
                    <div key={i} className="import-regel">
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <strong style={{ color: "#fff" }}>{p.naam || `Punt ${i + 1}`}</strong>
                        <span style={{ color: "var(--muted)" }}> · {p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span>
                      </span>
                      <button type="button" className="editor-paneel-sluit" aria-label="Weglaten" onClick={() => setGevonden((g) => g.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                  {nietHerkend.map((r, i) => (
                    <div key={`f${i}`} className="import-regel" style={{ color: "#FCA5A5" }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>⚠️ Niet herkend: {r}</span>
                    </div>
                  ))}
                </div>
              )}

              {gevonden.length > 0 && (
                <button type="button" className="rl-knop rl-knop--groen" style={{ height: 44, fontWeight: 800 }} disabled={bezig !== null} onClick={toevoegen}>
                  {bezig === "opslaan" ? "Bezig…" : `+ ${gevonden.length} punt${gevonden.length === 1 ? "" : "en"} toevoegen`}
                </button>
              )}
              <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Komen vóór de finish, met {punten} punten en {straal} m straal. Vragen voeg je daarna toe.</div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
