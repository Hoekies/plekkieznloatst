"use client";

import { useState } from "react";
import { VensterMetKop } from "@/components/shared/Venster";
import { verklein } from "@/components/admin/editor/HuisstijlInstellingen";
import { toonMelding } from "@/components/admin/Melding";
import { OPSLAG } from "@/lib/huisstijl";
import {
  BADGES, BONUS_ITEMS, ITEM_LABEL, KEUZES, plezierInstellingen, radMomentTekst,
  type BadgeSoort, type BonusItem, type PlezierInstellingen,
} from "@/lib/spelplezier";

// 🎉 Spelplezier (migratie 007) in de route-editor (⚙️ Instellingen → 🎮 Spel): elk onderdeel los Aan of Uit, en
// met ⚙️ de instellingen ervan (migratie 008; deel 2: migratie 009). Alleen knoppen; wat je kiest wordt meteen
// opgeslagen. In groepen, zodat de lijst overzichtelijk blijft.

export type PlezierVeld = "val_aan" | "reeks_aan" | "badges_aan" | "fotobattle_aan" | "schat_aan" | "rad_aan";
type Sleutel = keyof PlezierInstellingen;

// veld: aan/uit als kolom van de route (migratie 007); anders staat "aan" in de instellingen zelf.
// zonderInst: geen ⚙️ (alleen aan of uit)
type Onderdeel = { veld: PlezierVeld | null; sleutel: Sleutel; naam: string; uitleg: string; zonderInst?: boolean };
const GROEPEN: { titel: string; onderdelen: Onderdeel[] }[] = [
  { titel: "🗺️ Op de kaart", onderdelen: [
    { veld: "val_aan", sleutel: "val", naam: "🪤 Val", uitleg: "Een team kan een bom als verborgen val op zijn plek leggen. Wie erlangs loopt, verliest punten." },
    { veld: "schat_aan", sleutel: "schat", naam: "📦 Vliegende schat", uitleg: "Een schat op de kaart die steeds verhuist. Wie er het eerst bij is, krijgt de beloning." },
    { veld: null, sleutel: "schaduw", naam: "🥷 Schaduw-item", uitleg: "Een item dat het team een paar minuten onzichtbaar maakt voor radar en duels. Leg het op de kaart of geef het als startitem; staat het aan, dan kan het ook uit de schat, het rad en de reeks komen." },
    { veld: null, sleutel: "km", naam: "📏 Kilometerbonus", uitleg: "Elke gelopen kilometer geeft punten of een item." },
  ] },
  { titel: "❓ Bij de vragen", onderdelen: [
    { veld: "reeks_aan", sleutel: "reeks", naam: "🔥 Reeks", uitleg: "Goede antwoorden op rij geven een bonus-item of bonuspunten." },
    { veld: null, sleutel: "jokers", naam: "🃏 Jokers", uitleg: "Elk team heeft een paar jokers: 50/50 haalt twee foute antwoorden weg bij een meerkeuzevraag, overslaan gaat zonder punten door naar het volgende punt." },
    { veld: null, sleutel: "bezwaar", naam: "🧑‍⚖️ Bezwaar", uitleg: "Een team maakt bezwaar tegen een fout gerekend antwoord. Jij beslist in het Spelleider-blok: toekennen (punten erbij) of afwijzen." },
    { veld: null, sleutel: "fotopuzzel", naam: "🧩 Fotopuzzel", uitleg: "Elk goed antwoord onthult een stukje van een foto. Wie raadt wat erop staat, krijgt bonuspunten." },
    { veld: null, sleutel: "sleutel", naam: "🗝️ Sleutelpunten", uitleg: "In de puntenlijst geef je een punt een slot: dat punt gaat pas open als het team eerst bij het sleutelpunt is geweest.", zonderInst: true },
  ] },
  { titel: "🏆 Belonen en beleven", onderdelen: [
    { veld: "badges_aan", sleutel: "badges", naam: "🎖️ Badges", uitleg: "Kleine prijzen tijdens het spel, zoals Pionier en On fire. Ze staan ook op de oorkonde." },
    { veld: null, sleutel: "mascotte", naam: "🐣 Mascotte", uitleg: "Een teamdiertje dat meegroeit met de punten: 🥚 ei → 🐣 kuiken (100) → 🦉 uil (300) → 🦅 adelaar (600).", zonderInst: true },
    { veld: null, sleutel: "levels", naam: "🏅 Levels", uitleg: "Het team stijgt in rang: 🌱 Rookie → 🔎 Speurder (100) → 🧭 Kenner (250) → 🎓 Meester (500) → 👑 Legende (1000).", zonderInst: true },
    { veld: "rad_aan", sleutel: "rad", naam: "🎰 Rad van fortuin", uitleg: "Onderweg draait elk team één keer: punten, een item of pech." },
    { veld: null, sleutel: "gouden", naam: "⏰ Gouden kwartier", uitleg: "Staat het aan, dan start je het met de knop in het Spelleider-blok, of het begint vanzelf op een tijdstip." },
  ] },
  { titel: "🏁 Na de finish", onderdelen: [
    { veld: "fotobattle_aan", sleutel: "fotobattle", naam: "📸 Fotobattle", uitleg: "Na de finish stemmen de teams op de mooiste finishfoto. De winnaar krijgt een prijs bij de uitslag." },
    { veld: null, sleutel: "statistieken", naam: "📊 Spelstatistieken", uitleg: "Na de uitslag ziet elk team leuke cijfers: snelste antwoord, langste nadenktijd, langste stuk lopen en meer.", zonderInst: true },
  ] },
  { titel: "💬 Contact", onderdelen: [
    { veld: null, sleutel: "chat", naam: "💬 Chat met de spelleider", uitleg: "Teams sturen jou een bericht vanuit de app; jij antwoordt in het teamvenster op het dashboard.", zonderInst: true },
  ] },
];
// 🚧 Nog in de maak: niet tonen tot de spelersapp ze kan spelen
const IN_DE_MAAK: Sleutel[] = ["fotopuzzel", "sleutel"];
for (const g of GROEPEN) g.onderdelen = g.onderdelen.filter((o) => !IN_DE_MAAK.includes(o.sleutel));
const ONDERDELEN = GROEPEN.flatMap((g) => g.onderdelen);

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
      {GROEPEN.map((g) => (
      <div key={g.titel} className="plezier-groep">
      <div className="plezier-groep-titel">{g.titel}</div>
      <div className="plezier-lijst">
        {g.onderdelen.map((o) => {
          // Aan of uit: een kolom van de route, of in de instellingen zelf
          const isAan = o.veld ? !!waarden[o.veld] : !!(inst[o.sleutel] as { aan?: boolean }).aan;
          const zetAan = (aan: boolean) => (o.veld ? onZet(o.veld, aan) : zet(o.sleutel, { aan } as never));
          return (
          <div key={o.sleutel} className={`plezier-rij${isAan ? "" : " plezier-rij--uit"}`} title={o.uitleg}>
            <div className="plezier-tekst">
              <strong>{o.naam}</strong>
              {!o.zonderInst && <span className="plezier-samenvatting">{samenvatting(o.sleutel, inst)}</span>}
              {o.zonderInst && <span className="plezier-samenvatting plezier-samenvatting--uitleg">{o.uitleg}</span>}
            </div>
            <div className="plezier-knoppen">
              {!o.zonderInst && <button type="button" className="rl-knop plezier-tandwiel" onClick={() => setOpen(o.sleutel)} title={`Instellingen ${o.naam}`} aria-label={`Instellingen ${o.naam}`}>⚙️</button>}
              <div className="segment" role="radiogroup" aria-label={`${o.naam} aan of uit`}>
                {([[false, "Uit"], [true, "Aan"]] as const).map(([aan, tekst]) => (
                  <button key={tekst} type="button" role="radio" aria-checked={isAan === aan} className={isAan === aan ? "aan" : ""}
                    onClick={() => zetAan(aan)}>{tekst}</button>
                ))}
              </div>
            </div>
          </div>
          );
        })}
      </div>
      </div>
      ))}

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

            {open === "schaduw" && <>
              <Keuze label="Onzichtbaar" opties={KEUZES.schaduwMinuten} waarde={inst.schaduw.minuten} tekst={(m) => `${m} min`} onKies={(minuten) => zet("schaduw", { minuten })} />
            </>}

            {open === "km" && <>
              <Keuze label="Beloning per kilometer" opties={["punten", "item"] as const} waarde={inst.km.beloning} tekst={(b) => (b === "item" ? "🎁 Item" : "➕ Punten")} onKies={(beloning) => zet("km", { beloning })} />
              {inst.km.beloning === "punten"
                ? <Keuze label="Punten" opties={KEUZES.kmPunten} waarde={inst.km.punten} tekst={(p) => `+${p}`} onKies={(punten) => zet("km", { punten })} />
                : <Items label="Welke items (willekeurig één)" waarde={inst.km.items} onKies={(items) => zet("km", { items })} />}
            </>}

            {open === "jokers" && <>
              <Keuze label="🃏 50/50-jokers per team" opties={KEUZES.jokerAantal} waarde={inst.jokers.vijftig} tekst={String} onKies={(vijftig) => zet("jokers", { vijftig })} />
              <Keuze label="⏭️ Overslaan-jokers per team" opties={KEUZES.jokerAantal} waarde={inst.jokers.over} tekst={String} onKies={(over) => zet("jokers", { over })} />
            </>}

            {open === "bezwaar" && <>
              <Keuze label="Bezwaren per team" opties={KEUZES.bezwaarMax} waarde={inst.bezwaar.max} tekst={String} onKies={(max) => zet("bezwaar", { max })} />
            </>}

            {open === "fotopuzzel" && <>
              <PuzzelFoto pad={inst.fotopuzzel.pad} onPad={(pad) => zet("fotopuzzel", { pad })} />
              <AntwoordenTekst waarde={inst.fotopuzzel.antwoorden} onOpslaan={(antwoorden) => zet("fotopuzzel", { antwoorden })} />
              <Keuze label="Punten bij goed raden" opties={KEUZES.puzzelfotoPunten} waarde={inst.fotopuzzel.punten} tekst={(p) => `+${p}`} onKies={(punten) => zet("fotopuzzel", { punten })} />
              <span className="inst-uitleg">Elk goed antwoord maakt een paar van de 16 stukjes open. Het team mag één keer raden.</span>
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
    case "schaduw": return `${i.schaduw.minuten} min onzichtbaar`;
    case "km": return `per km: ${i.km.beloning === "punten" ? `+${i.km.punten} pt` : "item"}`;
    case "jokers": return `${i.jokers.vijftig}× 50/50, ${i.jokers.over}× overslaan`;
    case "bezwaar": return `${i.bezwaar.max}× per team`;
    case "fotopuzzel": return i.fotopuzzel.pad ? `foto gekozen, ${i.fotopuzzel.antwoorden.length} antwoord(en), +${i.fotopuzzel.punten}` : "nog geen foto gekozen";
    default: return "";
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

// 🧩 Foto van de fotopuzzel: uploaden (verkleind) of vervangen
function PuzzelFoto({ pad, onPad }: { pad: string | null; onPad: (pad: string | null) => void }) {
  const [bezig, setBezig] = useState(false);
  async function kies(bestand: File | undefined) {
    if (!bestand) return;
    setBezig(true);
    try {
      const klein = await verklein(bestand, 1200, false);
      if (!klein) { toonMelding("Dit bestand kan niet als afbeelding worden geopend", "fout"); return; }
      const form = new FormData();
      form.append("bestand", new File([klein], "puzzel.jpg", { type: klein.type }));
      form.append("bucket", "route-afbeeldingen");
      const res = await fetch("/api/admin/upload", { method: "POST", body: form }).catch(() => null);
      const d = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok) { toonMelding(d.fout ?? "Uploaden lukte niet", "fout"); return; }
      onPad(d.pad);
    } finally {
      setBezig(false);
    }
  }
  return (
    <div className="plezier-veld">
      <span className="form-label">Foto</span>
      <div className="plezier-puzzelfoto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {pad ? <img src={OPSLAG + pad} alt="" /> : <span className="plezier-puzzelfoto-leeg">🧩</span>}
        <label className="rl-knop">
          {bezig ? "Bezig…" : pad ? "📷 Andere foto" : "📷 Foto kiezen"}
          <input type="file" accept="image/*" hidden disabled={bezig} onChange={(e) => kies(e.target.files?.[0])} />
        </label>
        {pad && <button type="button" className="rl-knop rl-knop--rood" onClick={() => onPad(null)}>Weghalen</button>}
      </div>
    </div>
  );
}

// 🧩 Goede antwoorden (komma's ertussen), opslaan bij Opslaan of als je het veld verlaat
function AntwoordenTekst({ waarde, onOpslaan }: { waarde: string[]; onOpslaan: (lijst: string[]) => void }) {
  const [tekst, setTekst] = useState(waarde.join(", "));
  const lijst = tekst.split(",").map((x) => x.trim()).filter(Boolean);
  const gewijzigd = lijst.join("|") !== waarde.join("|");
  return (
    <div className="plezier-veld">
      <span className="form-label">Goede antwoorden (komma ertussen)</span>
      <div className="plezier-prijs-rij">
        <input className="form-input" value={tekst} maxLength={200} placeholder="vuurtoren, de vuurtoren"
          onChange={(e) => setTekst(e.target.value)} onBlur={() => gewijzigd && onOpslaan(lijst)} />
        <button type="button" className="rl-knop rl-knop--cyan" disabled={!gewijzigd} onClick={() => onOpslaan(lijst)}>Opslaan</button>
      </div>
    </div>
  );
}
