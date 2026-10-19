"use client";

// Bewerkpanelen van de route-editor: een punt, een item, en de statuslabel bovenin.
import { useState, useEffect } from "react";
import type { RoutePunt, SpeciaalItem, SpeciaalItemType } from "@/types/database";
import { ITEM_UITLEG } from "./item-uitleg";
import NaamKiezer from "../NaamKiezer";

export function StatusPil({ status, isActief }: { status: string; isActief: boolean }) {
  if (isActief) return <span className="editor-chip" style={{ background: "var(--green-soft)", color: "var(--green)" }}>▶ Actief</span>;
  // "gepubliceerd" in de database heet in beeld Klaar
  if (status === "gepubliceerd") return <span className="editor-chip" style={{ background: "var(--cyan-soft)", color: "var(--cyan)" }}>✅ Klaar</span>;
  return <span className="editor-chip" style={{ background: "var(--line)", color: "var(--muted)" }}>✏️ Concept</span>;
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
        <img src={`/items/${type}.webp`} alt="" style={{ width: 22, height: 22 }} />
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
              <img src={`/items/${t}.webp`} alt="" style={{ width: 26, height: 26 }} />
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
export function PuntForm({ punt, opslaan, fout, heeftVraag, onVraag, naamWoorden, onOpslaan, onVerwijder, onSluit, info, onOpDeWeg }: {
  punt: RoutePunt; opslaan: boolean; fout: string; heeftVraag: boolean; onVraag: () => void;
  naamWoorden: string[];
  onOpslaan: (u: Partial<RoutePunt>) => void; onVerwijder: () => void; onSluit: () => void;
  // Extra: de vraag (kort), welke teams hier beginnen en welke items in de buurt liggen
  info?: { vraagTekst?: string | null; teams?: { naam: string; kleur: string }[]; items?: string[] };
  // Dit ene punt op de dichtstbijzijnde weg of het voetpad zetten
  onOpDeWeg?: () => void;
}) {
  const [naam, setNaam] = useState(punt.name);
  const [beschrijving, setBeschrijving] = useState(punt.description ?? "");
  const [type, setType] = useState(punt.type);

  useEffect(() => {
    setNaam(punt.name); setBeschrijving(punt.description ?? ""); setType(punt.type);
  // Alleen resetten bij wisselen van punt, niet bij elke prop-update (anders vecht dit met lokale invoer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punt.id]);
  // Naam elders gewijzigd (bij het opslaan van de vraag): meteen overnemen. Tijdens het typen hier
  // verandert punt.name niet, dus dit vecht niet met lokale invoer.
  useEffect(() => { setNaam(punt.name); }, [punt.name]);

  return (
    <div className="editor-paneel-inhoud">
      <div className="editor-paneel-kop">
        <span style={{ fontSize: "1.1rem" }}>{type === "eindpunt" ? "🏁" : type === "informatiepunt" ? "ℹ️" : "📍"}</span>
        <span>Punt</span>
        <button onClick={onSluit} className="editor-paneel-sluit" aria-label="Sluiten">✕</button>
      </div>

      {/* Eerst het soort punt; daaronder alleen wat bij dat soort hoort */}
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Soort punt</label>
        <div className="segment" role="radiogroup" aria-label="Soort punt">
          {([["vraagpunt", "❓ Vraag"], ["informatiepunt", "ℹ️ Info"], ["eindpunt", "🏁 Eind"]] as const).map(([t, label]) => (
            <button key={t} type="button" role="radio" aria-checked={type === t} className={type === t ? "aan" : ""} onClick={() => setType(t)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Naam</label>
        <NaamKiezer naam={naam} onNaam={setNaam} woorden={naamWoorden} hoogte={38} />
      </div>

      {type === "vraagpunt" && (
        <>
          {!heeftVraag && <div className="editor-paneel-noot" style={{ fontWeight: 600, color: "#FBBF24" }}>⚠️ Nog geen vraag</div>}
          {heeftVraag && (
            <div className="punt-vraagtekst" title={info?.vraagTekst ?? undefined}>{info?.vraagTekst ? `“${info.vraagTekst}”` : "✓ Vraag ingevuld"}</div>
          )}
          <button type="button" onClick={onVraag} className={`rl-knop${heeftVraag ? "" : " rl-knop--cyan"}`} style={{ width: "100%", justifyContent: "center" }}>
            {heeftVraag ? "❓ Vraag bewerken →" : "➕ Vraag invullen →"}
          </button>
        </>
      )}

      {type === "informatiepunt" && (
        <>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Tekst voor de spelers</label>
            <textarea className="form-textarea" spellCheck lang="nl" value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)}
              placeholder="Dit lezen de spelers als ze hier aankomen" style={{ fontSize: "0.85rem", minHeight: 60 }} />
          </div>
          {/* Een infopunt met een vraag (zoals een startvraag): de spelers krijgen dan de vraag */}
          {heeftVraag && (
            <>
              <div className="editor-paneel-noot" style={{ color: "#FBBF24" }}>❓ Hier hangt ook een vraag (bijv. een startvraag). Die krijgen de spelers in plaats van de tekst.</div>
              <button type="button" onClick={onVraag} className="rl-knop" style={{ width: "100%", justifyContent: "center" }}>❓ Vraag bewerken →</button>
            </>
          )}
        </>
      )}

      {type === "eindpunt" && (
        <>
          <div className="editor-paneel-noot">🏁 Hier finisht het team. Je kunt er een opdracht aan hangen, zoals een selfie (niet verplicht).</div>
          <button type="button" onClick={onVraag} className="rl-knop" style={{ width: "100%", justifyContent: "center" }}>
            {heeftVraag ? "❓ Opdracht bewerken →" : "➕ Opdracht bij de finish →"}
          </button>
        </>
      )}

      {/* Teams die hier beginnen en items in de buurt */}
      {((info?.teams?.length ?? 0) > 0 || (info?.items?.length ?? 0) > 0) && (
        <div className="punt-extra">
          {info?.teams?.map((t) => (
            <span key={t.naam} className="punt-team" style={{ borderColor: t.kleur, color: t.kleur }}>🚩 Start {t.naam}</span>
          ))}
          {(info?.items?.length ?? 0) > 0 && (
            <span className="punt-items" title="Items binnen 40 meter">
              In de buurt:
              {info!.items!.map((type, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={`/items/${type}.webp`} alt={type} style={{ width: 18, height: 18 }} />
              ))}
            </span>
          )}
        </div>
      )}

      {/* Positie: verslepen op de kaart, of op de dichtstbijzijnde weg zetten */}
      <div className="punt-positie">
        <span title="Verplaatsen: sleep het punt op de kaart. Straal en punten staan bij ⚙️ Instellingen.">📌 {punt.latitude.toFixed(5)}, {punt.longitude.toFixed(5)}</span>
        {onOpDeWeg && <button type="button" className="rl-knop" onClick={onOpDeWeg} title="Op de dichtstbijzijnde weg of het voetpad zetten">🛣️ Op de weg</button>}
      </div>

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
