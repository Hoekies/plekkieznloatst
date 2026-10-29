"use client";

// 🎉 Spelplezier (migratie 007) in de route-editor (⚙️ Instellingen → 🎮 Spel): elk onderdeel los Aan of Uit.

export type PlezierVeld = "val_aan" | "reeks_aan" | "badges_aan" | "fotobattle_aan" | "schat_aan" | "rad_aan";

const ONDERDELEN: { veld: PlezierVeld; naam: string; uitleg: string }[] = [
  { veld: "val_aan", naam: "🪤 Val", uitleg: "Een team kan een bom als verborgen val op zijn plek leggen. Wie binnen 15 m langs loopt, verliest de bompunten." },
  { veld: "reeks_aan", naam: "🔥 Reeks", uitleg: "Elke 3 goede antwoorden op rij geven een bonus-item (ster, verdubbeling of radar)." },
  { veld: "badges_aan", naam: "🎖️ Badges", uitleg: "Kleine prijzen tijdens het spel, zoals Pionier en On fire. Ze staan ook op de oorkonde." },
  { veld: "fotobattle_aan", naam: "📸 Fotobattle", uitleg: "Na de finish stemmen de teams op de mooiste finishfoto. De winnaar krijgt een prijs bij de uitslag." },
  { veld: "schat_aan", naam: "📦 Vliegende schat", uitleg: "Een schat op de kaart die elke 10 minuten verhuist. Wie er het eerst bij is, krijgt een item." },
  { veld: "rad_aan", naam: "🎰 Rad van fortuin", uitleg: "Halverwege de route draait elk team één keer: punten, een item of pech." },
];

export default function SpelplezierInstellingen({ waarden, onZet }: { waarden: Partial<Record<PlezierVeld, boolean | null>>; onZet: (veld: PlezierVeld, aan: boolean) => void }) {
  return (
    <div className="form-group">
      <label className="form-label">🎉 Spelplezier</label>
      <div className="plezier-lijst">
        {ONDERDELEN.map((o) => (
          <div key={o.veld} className="plezier-rij">
            <div className="plezier-tekst">
              <strong>{o.naam}</strong>
              <span className="inst-uitleg">{o.uitleg}</span>
            </div>
            <div className="segment" role="radiogroup" aria-label={`${o.naam} aan of uit`}>
              {([[false, "Uit"], [true, "Aan"]] as const).map(([aan, tekst]) => (
                <button key={tekst} type="button" role="radio" aria-checked={!!waarden[o.veld] === aan} className={!!waarden[o.veld] === aan ? "aan" : ""}
                  onClick={() => onZet(o.veld, aan)}>{tekst}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
