"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { TeamAntwoorden, AntwoordRij } from "@/lib/admin-antwoorden";
import LeegScherm from "@/components/admin/LeegScherm";

// Foto's staan in een afgeschermde opslag: een tijdelijke link via de admin-API (onthouden per pad)
const linkCache = new Map<string, string>();
export function useFotoUrl(pad: string | null) {
  const [src, setSrc] = useState<string | null>(pad ? linkCache.get(pad) ?? null : null);
  useEffect(() => {
    if (!pad || linkCache.has(pad)) { setSrc(pad ? linkCache.get(pad) ?? null : null); return; }
    let weg = false;
    fetch(`/api/admin/foto/sign?pad=${encodeURIComponent(pad)}`).then((r) => r.json())
      .then((d) => { if (d.url) linkCache.set(pad, d.url); if (!weg) setSrc(d.url ?? null); }).catch(() => {});
    return () => { weg = true; };
  }, [pad]);
  return src;
}

type Foto = AntwoordRij & { team: string; icon: string | null };
export type FotoKeuren = (fotoId: string, voortgangId: string, status: "goedgekeurd" | "afgekeurd", punten: number, opmerking: string) => Promise<void>;

// 📸 Alle ingestuurde foto's als raster; tik voor groot, met ✓/✗, punten en een opmerking voor het team.
// Pijltjes (← →) bladeren, Esc sluit.
export default function FotoGalerij({ teams, onKeur, bezig }: { teams: TeamAntwoorden[]; onKeur: FotoKeuren; bezig: string | null }) {
  const fotos: Foto[] = teams.flatMap((t) => t.rijen.filter((r) => r.foto_pad).map((r) => ({ ...r, team: t.naam, icon: t.icon })))
    // Eerst wat nog gekeurd moet worden
    .sort((a, b) => Number(b.foto_status === "wacht") - Number(a.foto_status === "wacht") || a.punt_volgorde - b.punt_volgorde);
  const [open, setOpen] = useState<number | null>(null);
  if (!fotos.length) return <LeegScherm icoon="📸">Nog geen foto&apos;s ingestuurd.</LeegScherm>;
  return (
    <>
      <div className="foto-raster">
        {fotos.map((f, i) => (
          <button key={f.voortgang_id} type="button" className={`foto-tegel foto-tegel--${f.foto_status}`} onClick={() => setOpen(i)} title={`${f.team} · ${f.punt_naam}`}>
            <FotoBeeld pad={f.foto_pad!} />
            <span className="foto-tegel-label">{f.icon ?? "👫"} {f.team}</span>
            <span className="foto-tegel-status">{f.foto_status === "wacht" ? "⏳" : f.foto_status === "goedgekeurd" ? "✓" : "✗"}</span>
          </button>
        ))}
      </div>
      {open !== null && fotos[open] && (
        <FotoGroot foto={fotos[open]} nr={open + 1} totaal={fotos.length} bezig={bezig === fotos[open].voortgang_id}
          onVorige={() => setOpen((o) => (o! - 1 + fotos.length) % fotos.length)}
          onVolgende={() => setOpen((o) => (o! + 1) % fotos.length)}
          onSluit={() => setOpen(null)} onKeur={onKeur} />
      )}
    </>
  );
}

function FotoBeeld({ pad, groot = false }: { pad: string; groot?: boolean }) {
  const src = useFotoUrl(pad);
  if (!src) return <span className="foto-laden">📸</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Ingestuurde foto" className={groot ? "foto-groot-beeld" : undefined} loading="lazy" />;
}

function FotoGroot({ foto: f, nr, totaal, bezig, onVorige, onVolgende, onSluit, onKeur }: {
  foto: Foto; nr: number; totaal: number; bezig: boolean;
  onVorige: () => void; onVolgende: () => void; onSluit: () => void; onKeur: FotoKeuren;
}) {
  const [punten, setPunten] = useState(f.max_punten);
  const [opmerking, setOpmerking] = useState("");
  useEffect(() => { setPunten(f.max_punten); setOpmerking(""); }, [f.voortgang_id, f.max_punten]);
  useEffect(() => {
    const toets = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "Escape") onSluit();
      if (e.key === "ArrowLeft") onVorige();
      if (e.key === "ArrowRight") onVolgende();
    };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [onSluit, onVorige, onVolgende]);
  const wacht = f.foto_status === "wacht";
  return createPortal(
    <div onClick={onSluit} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 640, maxHeight: "96vh" }}>
        <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "calc(96vh - 6px)", overflowY: "auto", padding: "14px 14px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pr-gem-label">📸 {nr} van {totaal} · {f.punt_naam}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>{f.icon ?? "👫"} {f.team}</div>
            </div>
            <button type="button" className="editor-paneel-sluit" onClick={onSluit} title="Sluiten (Esc)" aria-label="Sluiten">✕</button>
          </div>
          {f.vraag_tekst && <div style={{ fontSize: "0.84rem", color: "var(--text)" }}>{f.vraag_tekst}</div>}
          <div className="foto-groot">
            <button type="button" className="foto-pijl foto-pijl--links" onClick={onVorige} aria-label="Vorige foto">‹</button>
            <FotoBeeld pad={f.foto_pad!} groot />
            <button type="button" className="foto-pijl foto-pijl--rechts" onClick={onVolgende} aria-label="Volgende foto">›</button>
          </div>
          {wacht ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                <span style={{ fontSize: "0.86rem", color: "var(--text)" }}>Punten</span>
                <input type="number" min={0} max={f.max_punten} className="form-input" style={{ width: 90, textAlign: "center", fontWeight: 800 }}
                  value={punten} onChange={(e) => setPunten(Number(e.target.value))} />
                <span style={{ fontSize: "0.86rem", color: "var(--muted)" }}>/ {f.max_punten}</span>
              </div>
              <input className="form-input" value={opmerking} maxLength={110} onChange={(e) => setOpmerking(e.target.value)}
                placeholder="💬 Opmerking voor het team (mag leeg)" />
              <div className="keur-knoppen">
                <button type="button" className="rl-knop rl-knop--rood" disabled={bezig}
                  onClick={async () => { await onKeur(f.foto_id!, f.voortgang_id, "afgekeurd", 0, opmerking); }}>✗ Afkeuren</button>
                <button type="button" className="rl-knop rl-knop--groen" disabled={bezig}
                  onClick={async () => { await onKeur(f.foto_id!, f.voortgang_id, "goedgekeurd", punten, opmerking); }}>
                  {bezig ? "Opslaan…" : `✓ Goed (+${punten})`}
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", fontWeight: 700, color: f.foto_status === "goedgekeurd" ? "#4ADE80" : "#F87171" }}>
              {f.foto_status === "goedgekeurd" ? `✓ Goedgekeurd · ${f.punten} pt` : "✗ Afgekeurd"}
            </div>
          )}
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", textAlign: "center" }}>← → bladeren · Esc sluiten</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
