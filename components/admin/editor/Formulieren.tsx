"use client";

// Bewerkpanelen van de route-editor: een punt, een item, en de statuslabel bovenin.
import { useState, useEffect } from "react";
import type { RoutePunt, SpeciaalItem, SpeciaalItemType } from "@/types/database";
import { ITEM_UITLEG } from "./item-uitleg";

export function StatusPil({ status, isActief }: { status: string; isActief: boolean }) {
  if (isActief) return <span style={{ background: "var(--green-soft)", color: "var(--green)", padding: "4px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>✓ Actief</span>;
  if (status === "gepubliceerd") return <span style={{ background: "var(--cyan-soft)", color: "var(--cyan)", padding: "4px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>Gepubliceerd</span>;
  return <span style={{ background: "var(--line)", color: "var(--muted)", padding: "4px 10px", borderRadius: 99, fontSize: "0.75rem", fontWeight: 700 }}>Concept</span>;
}

// ── SpeciaalItemForm ──────────────────────────────────────────────────────────
export function SpeciaalItemForm({ item, alleenPlekzooi, onOpslaan, onVerwijder, onSluit }: {
  item: SpeciaalItem;
  alleenPlekzooi: boolean;
  onOpslaan: (u: Partial<SpeciaalItem>) => void;
  onVerwijder: () => void;
  onSluit: () => void;
}) {
  // Een klik op een type slaat meteen op; radius staat in ⚙️ Instellingen → Items
  const type = item.type;
  return (
    <div className="editor-paneel-inhoud">
      <div className="editor-paneel-kop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/items/${type}.png`} alt="" style={{ width: 22, height: 22 }} />
        <span>Item</span>
        <button onClick={onSluit} className="editor-paneel-sluit" aria-label="Sluiten">✕</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
        {(["ster", "verdubbeling", "radar", "bom", "spook", "dief", "banaan", "wissel", "vraagteken", "plekzooi"] as SpeciaalItemType[]).map((t) => {
          const gekozen = type === t;
          const uit = alleenPlekzooi && t !== "plekzooi";
          return (
            <button key={t} type="button" disabled={uit} title={ITEM_UITLEG[t] ?? t}
              onClick={() => { if (!gekozen) onOpslaan({ type: t, points_effect: t === "ster" ? 50 : 0, name: t === "plekzooi" ? "Plek zooi" : "Speciaal item" }); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "4px 2px",
                borderRadius: 8, cursor: uit ? "not-allowed" : "pointer", opacity: uit ? 0.3 : 1,
                border: `2px solid ${gekozen ? "var(--cyan)" : "rgba(255,255,255,0.12)"}`,
                background: gekozen ? "rgba(0,217,255,0.15)" : "rgba(255,255,255,0.04)",
                color: gekozen ? "#fff" : "var(--muted)", fontSize: "0.58rem", fontWeight: 700,
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/items/${t}.png`} alt="" style={{ width: 26, height: 26 }} />
              {t === "plekzooi" ? "plek zooi" : t === "verdubbeling" ? "dubbel" : t}
            </button>
          );
        })}
      </div>

      {type === "plekzooi" && (
        <div className="editor-paneel-noot">⚠️ Onzichtbaar voor spelers. Duur: ⚙️ Instellingen.</div>
      )}
      {alleenPlekzooi && type !== "plekzooi" && (
        <div className="editor-paneel-noot" style={{ color: "#F87171" }}>Sequentieel toont alleen plek zooi; dit item ziet niemand.</div>
      )}
      {item.claimed && <div className="editor-paneel-noot">✅ Dit item is al opgepakt.</div>}

      <button className="rl-knop rl-knop--rood" style={{ width: "100%" }} onClick={onVerwijder}>🗑️ Verwijderen</button>
    </div>
  );
}

// ── PuntForm ──────────────────────────────────────────────────────────────────
export function PuntForm({ punt, opslaan, fout, heeftVraag, onVraag, naamVoorstel, onOpslaan, onVerwijder, onSluit }: {
  punt: RoutePunt; opslaan: boolean; fout: string; heeftVraag: boolean; onVraag: () => void;
  naamVoorstel: string | null;
  onOpslaan: (u: Partial<RoutePunt>) => void; onVerwijder: () => void; onSluit: () => void;
}) {
  const [naam, setNaam] = useState(punt.name);
  const [beschrijving, setBeschrijving] = useState(punt.description ?? "");
  const [type, setType] = useState(punt.type);

  useEffect(() => {
    setNaam(punt.name); setBeschrijving(punt.description ?? ""); setType(punt.type);
  // Alleen resetten bij wisselen van punt, niet bij elke prop-update (anders vecht dit met lokale invoer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punt.id]);

  return (
    <div className="editor-paneel-inhoud">
      <div className="editor-paneel-kop">
        <span style={{ fontSize: "1.1rem" }}>{type === "eindpunt" ? "🏁" : type === "informatiepunt" ? "ℹ️" : "📍"}</span>
        <span>Punt</span>
        <button onClick={onSluit} className="editor-paneel-sluit" aria-label="Sluiten">✕</button>
      </div>

      {/* Vraag: het belangrijkste, dus bovenaan */}
      <div className="editor-paneel-noot" style={{ fontWeight: 600, color: heeftVraag ? "#93C5FD" : punt.type === "vraagpunt" ? "#FBBF24" : "var(--muted)" }}>
        {heeftVraag ? "❓ Aan dit punt hangt een vraag." : punt.type === "vraagpunt" ? "⚠️ Dit vraagpunt heeft nog geen vraag." : "Aan dit punt hangt geen vraag."}
      </div>
      <button type="button" onClick={onVraag} className="rl-knop rl-knop--cyan"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {heeftVraag ? "❓ Vraag bewerken →" : "➕ Vraag toevoegen →"}
      </button>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Naam</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="form-input" spellCheck lang="nl" value={naam} onChange={(e) => setNaam(e.target.value)} style={{ fontSize: "0.85rem", flex: 1, minWidth: 0 }} />
          {/* Naamvoorstel uit de vraag: alleen invullen als je erop klikt */}
          {naamVoorstel && naamVoorstel !== naam && (
            <button type="button" className="rl-knop rl-knop--icoon" onClick={() => setNaam(naamVoorstel)}
              title={`Voorstel: "${naamVoorstel}" (uit de vraag)`} aria-label="Naam voorstellen" style={{ height: 38, width: 38 }}>💡</button>
          )}
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Beschrijving</label>
        <textarea className="form-textarea" spellCheck lang="nl" value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} style={{ fontSize: "0.85rem", minHeight: 48 }} />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Type</label>
        <div style={{ display: "flex", gap: 3 }}>
          {([["vraagpunt", "❓ Vraag"], ["informatiepunt", "ℹ️ Info"], ["eindpunt", "🏁 Eind"]] as const).map(([t, label]) => (
            <button key={t} type="button" onClick={() => setType(t)}
              style={{
                flex: 1, padding: "7px 2px", borderRadius: 8, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700,
                border: `2px solid ${type === t ? "var(--cyan)" : "rgba(255,255,255,0.12)"}`,
                background: type === t ? "rgba(0,217,255,0.15)" : "rgba(255,255,255,0.04)",
                color: type === t ? "#fff" : "var(--muted)", whiteSpace: "nowrap",
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="editor-paneel-noot">Radius en punten: ⚙️ Instellingen.</div>
      {fout && <div className="melding melding-fout" style={{ fontSize: "0.78rem" }}>⚠️ {fout}</div>}
      <div style={{ display: "flex", gap: 6 }}>
        <button className="rl-knop rl-knop--cyan" style={{ flex: 1 }} disabled={opslaan}
          onClick={() => onOpslaan({ name: naam, description: beschrijving, type })}>
          {opslaan ? "Opslaan…" : "Opslaan"}
        </button>
        <button className="rl-knop rl-knop--rood rl-knop--icoon" title="Verwijderen" aria-label="Verwijderen" onClick={onVerwijder}>🗑️</button>
      </div>
    </div>
  );
}
