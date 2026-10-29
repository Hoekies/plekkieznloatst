"use client";

import { useState } from "react";
import { VensterMetKop } from "@/components/shared/Venster";
import {
  BADGES, BONUS_ITEMS, ITEM_LABEL, KEUZES, plezierInstellingen, radMomentTekst,
  type BadgeSoort, type BonusItem, type PlezierInstellingen,
} from "@/lib/spelplezier";

// 🎉 Spelplezier (migratie 007) in de route-editor (⚙️ Instellingen → 🎮 Spel): elk onderdeel los Aan of Uit, en
// met ⚙️ de instellingen ervan (migratie 008). Alleen knoppen; wat je kiest wordt meteen opgeslagen.

export type PlezierVeld = "val_aan" | "reeks_aan" | "badges_aan" | "fotobattle_aan" | "schat_aan" | "rad_aan";
type Sleutel = keyof PlezierInstellingen;

const ONDERDELEN: { veld: PlezierVeld | null; sleutel: Sleutel; naam: string; uitleg: string }[] = [
  { veld: "val_aan", sleutel: "val", naam: "🪤 Val", uitleg: "Een team kan een bom als verborgen val op zijn plek leggen. Wie erlangs loopt, verliest punten." },
  { veld: "reeks_aan", sleutel: "reeks", naam: "🔥 Reeks", uitleg: "Goede antwoorden op rij geven een bonus-item of bonuspunten." },
  { veld: "badges_aan", sleutel: "badges", naam: "🎖️ Badges", uitleg: "Kleine prijzen tijdens het spel, zoals Pionier en On fire. Ze staan ook op de oorkonde." },
  { veld: "fotobattle_aan", sleutel: "fotobattle", naam: "📸 Fotobattle", uitleg: "Na de finish stemmen de teams op de mooiste finishfoto. De winnaar krijgt een prijs bij de uitslag." },
  { veld: "schat_aan", sleutel: "schat", naam: "📦 Vliegende schat", uitleg: "Een schat op de kaart die steeds verhuist. Wie er het eerst bij is, krijgt de beloning." },
  { veld: "rad_aan", sleutel: "rad", naam: "🎰 Rad van fortuin", uitleg: "Onderweg draait elk team één keer: punten, een item of pech." },
  { veld: null, sleutel: "gouden", naam: "⏰ Gouden kwartier", uitleg: "Zet je aan met de knop in het Spelleider-blok, of laat het vanzelf op een tijdstip beginnen." },
];

export default function SpelplezierInstellingen({ waarden, onZet, onInstellingen }: {
  waarden: Partial<Record<PlezierVeld, boolean | null>> & { spelplezier?: unknown };
  onZet: (veld: PlezierVeld, aan: boolean) => void;
  onInstellingen: (nieuw: PlezierInstellingen) => void;
}) {
  const [open, setOpen] = useState<Sleutel | null>(null);
  const inst = plezierInstellingen(waarden);
  const onderdeel = ONDERDELEN.find((o) => o.sleutel === open);
  const zet = <K extends Sleutel>(k: K, deel: Partial<PlezierInstellingen[K]>) => onInstellingen({ ...inst, [k]: { ...inst[k], ...deel } });

  return (
    <div className="form-group">
      <label className="form-label">🎉 Spelplezier</label>
      <div className="plezier-lijst">
        {ONDERDELEN.map((o) => (
          <div key={o.sleutel} className={`plezier-rij${o.veld && !waarden[o.veld] ? " plezier-rij--uit" : ""}`} title={o.uitleg}>
            <div className="plezier-tekst">
              <strong>{o.naam}</strong>
              <span className="plezier-samenvatting">{samenvatting(o.sleutel, inst)}</span>
            </div>
            <div className="plezier-knoppen">
              <button type="button" className="rl-knop plezier-tandwiel" onClick={() => setOpen(o.sleutel)} title={`Instellingen ${o.naam}`} aria-label={`Instellingen ${o.naam}`}>⚙️</button>
              {o.veld && (
                <div className="segment" role="radiogroup" aria-label={`${o.naam} aan of uit`}>
                  {([[false, "Uit"], [true, "Aan"]] as const).map(([aan, tekst]) => (
                    <button key={tekst} type="button" role="radio" aria-checked={!!waarden[o.veld!] === aan} className={!!waarden[o.veld!] === aan ? "aan" : ""}
                      onClick={() => onZet(o.veld!, aan)}>{tekst}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {onderdeel && (
        <VensterMetKop icoon={onderdeel.naam.split(" ")[0]} label="Instellingen" titel={onderdeel.naam.split(" ").slice(1).join(" ")} onSluit={() => setOpen(null)} breedte={460} maxHoogte={90}>
          <div className="plezier-venster">
            <p className="inst-uitleg plezier-intro">{onderdeel.uitleg}</p>
            {open === "val" && <>
              <Keuze label="Gaat af binnen" opties={KEUZES.valMeter} waarde={inst.val.meter} tekst={(m) => `${m} m`} onKies={(meter) => zet("val", { meter })} />
              <Keuze label="Blijft liggen" opties={KEUZES.valMinuten} waarde={inst.val.minuten} tekst={(m) => `${m} min`} onKies={(minuten) => zet("val", { minuten })} />
              <Keuze label="Vallen per team tegelijk" opties={KEUZES.valMax} waarde={inst.val.max} tekst={String} onKies={(max) => zet("val", { max })} />
              <Keuze label="Punten" opties={[null, ...KEUZES.valPunten]} waarde={inst.val.punten} tekst={(p) => (p === null ? "Bomwaarde" : `${p}`)} onKies={(punten) => zet("val", { punten })} />
              <Keuze label="Waar gaan de punten heen?" opties={[false, true]} waarde={inst.val.zetterKrijgt} tekst={(j) => (j ? "Naar wie de val zette" : "Gewoon eraf")} onKies={(zetterKrijgt) => zet("val", { zetterKrijgt })} />
            </>}

            {open === "reeks" && <>
              <Keuze label="Zoveel goed op rij" opties={KEUZES.reeksLengte} waarde={inst.reeks.lengte} tekst={String} onKies={(lengte) => zet("reeks", { lengte })} />
              <Keuze label="Beloning" opties={["item", "punten"] as const} waarde={inst.reeks.beloning} tekst={(b) => (b === "item" ? "🎁 Item" : "➕ Punten")} onKies={(beloning) => zet("reeks", { beloning })} />
              {inst.reeks.beloning === "punten"
                ? <Keuze label="Bonuspunten" opties={KEUZES.reeksPunten} waarde={inst.reeks.punten} tekst={(p) => `+${p}`} onKies={(punten) => zet("reeks", { punten })} />
                : <Items label="Welke items (willekeurig één)" waarde={inst.reeks.items} onKies={(items) => zet("reeks", { items })} />}
            </>}

            {open === "badges" && <>
              <Keuze label="Punten per badge" opties={KEUZES.badgePunten} waarde={inst.badges.punten} tekst={(p) => (p ? `+${p}` : "Geen")} onKies={(punten) => zet("badges", { punten })} />
              <div className="plezier-veld">
                <span className="form-label">Welke badges (tik om aan of uit te zetten)</span>
                <div className="plezier-chips">
                  {(Object.keys(BADGES) as BadgeSoort[]).map((b) => {
                    const aan = !inst.badges.uit.includes(b);
                    return (
                      <button key={b} type="button" className={`plezier-chip${aan ? " plezier-chip--aan" : ""}`} aria-pressed={aan} title={BADGES[b].uitleg}
                        onClick={() => zet("badges", { uit: aan ? [...inst.badges.uit, b] : inst.badges.uit.filter((x) => x !== b) })}>
                        {BADGES[b].emoji} {BADGES[b].naam}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>}

            {open === "fotobattle" && <>
              <Keuze label="Punten voor de winnaar" opties={KEUZES.fotoPunten} waarde={inst.fotobattle.punten} tekst={(p) => (p ? `+${p}` : "Geen")} onKies={(punten) => zet("fotobattle", { punten })} />
              <PrijsTekst waarde={inst.fotobattle.prijs} onOpslaan={(prijs) => zet("fotobattle", { prijs })} />
              <span className="inst-uitleg">De punten komen erbij als je de uitslag vrijgeeft. De prijs staat bij de winnaar in de uitslag en op de oorkonde.</span>
            </>}

            {open === "schat" && <>
              <Keuze label="Nieuwe plek elke" opties={KEUZES.schatMinuten} waarde={inst.schat.minuten} tekst={(m) => `${m} min`} onKies={(minuten) => zet("schat", { minuten })} />
              <Keuze label="Gepakt binnen" opties={KEUZES.schatMeter} waarde={inst.schat.meter} tekst={(m) => `${m} m`} onKies={(meter) => zet("schat", { meter })} />
              <Keuze label="Beloning" opties={["item", "punten", "allebei"] as const} waarde={inst.schat.beloning} tekst={(b) => (b === "item" ? "🎁 Item" : b === "punten" ? "➕ Punten" : "Allebei")} onKies={(beloning) => zet("schat", { beloning })} />
              {inst.schat.beloning !== "item" && <Keuze label="Punten" opties={KEUZES.schatPunten} waarde={inst.schat.punten} tekst={(p) => `+${p}`} onKies={(punten) => zet("schat", { punten })} />}
              {inst.schat.beloning !== "punten" && <Items label="Welke items (willekeurig één)" waarde={inst.schat.items} onKies={(items) => zet("schat", { items })} />}
            </>}

            {open === "rad" && <>
              <Keuze label="Wanneer draaien" opties={KEUZES.radMoment} waarde={inst.rad.moment} tekst={radMomentTekst} onKies={(moment) => zet("rad", { moment })} />
              <Keuze label="Hoofdprijs" opties={KEUZES.radHoofdprijs} waarde={inst.rad.hoofdprijs} tekst={(p) => `+${p}`} onKies={(hoofdprijs) => zet("rad", { hoofdprijs })} />
              <Keuze label="Pechvak (−25)" opties={[false, true]} waarde={inst.rad.zonderMin} tekst={(z) => (z ? "Nee, +10 in plaats daarvan" : "Ja")} onKies={(zonderMin) => zet("rad", { zonderMin })} />
            </>}

            {open === "gouden" && <>
              <Keuze label="Duur" opties={KEUZES.goudenMinuten} waarde={inst.gouden.minuten} tekst={(m) => `${m} min`} onKies={(minuten) => zet("gouden", { minuten })} />
              <Keuze label="Punten" opties={KEUZES.goudenFactor} waarde={inst.gouden.factor} tekst={(f) => `×${f}`} onKies={(factor) => zet("gouden", { factor })} />
              <Keuze label="Starten" opties={[false, true]} waarde={inst.gouden.om !== null} tekst={(v) => (v ? "Vanzelf op een tijdstip" : "Alleen met de knop")}
                onKies={(vanzelf) => zet("gouden", { om: vanzelf ? inst.gouden.om ?? "15:00" : null })} />
              {inst.gouden.om !== null && (
                <div className="plezier-veld">
                  <span className="form-label">Elke dag om (Nederlandse tijd)</span>
                  <input type="time" className="form-input plezier-tijd" value={inst.gouden.om} onChange={(e) => e.target.value && zet("gouden", { om: e.target.value })} />
                </div>
              )}
            </>}
          </div>
        </VensterMetKop>
      )}
    </div>
  );
}

// Korte samenvatting achter de uitleg, zodat je zonder het venster te openen ziet wat er ingesteld is
function samenvatting(k: Sleutel, i: PlezierInstellingen): string {
  switch (k) {
    case "val": return `${i.val.meter} m, ${i.val.minuten} min, ${i.val.punten ?? "bomwaarde"} pt${i.val.zetterKrijgt ? " naar de zetter" : ""}`;
    case "reeks": return `elke ${i.reeks.lengte} goed: ${i.reeks.beloning === "punten" ? `+${i.reeks.punten} pt` : "item"}`;
    case "badges": return `${9 - i.badges.uit.length} van 9${i.badges.punten ? `, +${i.badges.punten} pt` : ""}`;
    case "fotobattle": return [i.fotobattle.punten ? `+${i.fotobattle.punten} pt` : "", i.fotobattle.prijs].filter(Boolean).join(" · ") || "alleen de titel";
    case "schat": return `elke ${i.schat.minuten} min, ${i.schat.beloning === "item" ? "item" : i.schat.beloning === "punten" ? `+${i.schat.punten} pt` : `item + ${i.schat.punten} pt`}`;
    case "rad": return `${radMomentTekst(i.rad.moment)}, hoofdprijs +${i.rad.hoofdprijs}`;
    case "gouden": return `${i.gouden.minuten} min ×${i.gouden.factor}${i.gouden.om ? `, vanzelf om ${i.gouden.om}` : ", met de knop"}`;
  }
}

function Keuze<T>({ label, opties, waarde, tekst, onKies }: { label: string; opties: readonly T[]; waarde: T; tekst: (t: T) => string; onKies: (t: T) => void }) {
  return (
    <div className="plezier-veld">
      <span className="form-label">{label}</span>
      <div className="segment" role="radiogroup" aria-label={label}>
        {opties.map((o) => (
          <button key={String(o)} type="button" role="radio" aria-checked={o === waarde} className={o === waarde ? "aan" : ""} onClick={() => onKies(o)}>{tekst(o)}</button>
        ))}
      </div>
    </div>
  );
}

// Items aan/uit (minstens één blijft aan)
function Items({ label, waarde, onKies }: { label: string; waarde: BonusItem[]; onKies: (items: BonusItem[]) => void }) {
  return (
    <div className="plezier-veld">
      <span className="form-label">{label}</span>
      <div className="plezier-chips">
        {BONUS_ITEMS.map((it) => {
          const aan = waarde.includes(it);
          return (
            <button key={it} type="button" className={`plezier-chip${aan ? " plezier-chip--aan" : ""}`} aria-pressed={aan}
              disabled={aan && waarde.length === 1} onClick={() => onKies(aan ? waarde.filter((x) => x !== it) : [...waarde, it])}>
              {ITEM_LABEL[it]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 🎁 Fysieke prijs: opslaan bij Opslaan of als je het veld verlaat
function PrijsTekst({ waarde, onOpslaan }: { waarde: string; onOpslaan: (prijs: string) => void }) {
  const [tekst, setTekst] = useState(waarde);
  const gewijzigd = tekst.trim() !== waarde;
  return (
    <div className="plezier-veld">
      <span className="form-label">Fysieke prijs (mag leeg)</span>
      <div className="plezier-prijs-rij">
        <input className="form-input" value={tekst} maxLength={60} placeholder="🍰 Taart voor het hele team"
          onChange={(e) => setTekst(e.target.value)} onBlur={() => gewijzigd && onOpslaan(tekst.trim())} />
        <button type="button" className="rl-knop rl-knop--cyan" disabled={!gewijzigd} onClick={() => onOpslaan(tekst.trim())}>Opslaan</button>
      </div>
    </div>
  );
}
