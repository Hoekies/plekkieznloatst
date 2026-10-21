"use client";

// 🚀 Eerste stappen: bij een nieuwe route stap voor stap van lege kaart naar een speelbare route.
// Een venster bovenop de kaart (de kaart blijft aan te tikken), één stap tegelijk.
// Rondje (verspreid): start → finish → teams, afstand en punten → voorbeeld → items → vragen → controleren.
// Op volgorde: start → punten → finish → vragen → controleren.
// Elke stap: één korte zin, één brede hoofdknop onderaan, daarboven ← Terug en eventueel een tweede keuze.
// Zonder startpunt kun je niet verder (alleen stoppen met ✕).

export type KiesModus = null | "start" | "finish" | "punten";

type Props = {
  modus: "sequentieel" | "verspreid";
  stap: number;
  onStap: (n: number) => void;
  onSluit: () => void;
  // Plaats of adres zoeken (de kaart zoomt in tot huisnummers leesbaar zijn)
  zoekterm: string;
  onZoekterm: (t: string) => void;
  onZoek: (e: React.FormEvent) => void;
  zoekBezig: boolean;
  zoekFout: string;
  // Aantikken op de kaart
  kies: KiesModus;
  onKies: (k: KiesModus) => void;
  startGekozen: boolean;
  finishGekozen: boolean;
  finishZelfde: boolean;
  onFinishZelfde: () => void;
  // Rondje: teams, afstand en punten (punten is een schatting, aan te passen)
  teams: number; onTeams: (n: number) => void;
  km: number; onKm: (n: number) => void;
  aantal: number; onAantal: (n: number) => void;
  onBewaarInstellingen: () => void;
  onMaakPunten: () => Promise<void>;
  maakBezig: boolean;
  // Voorbeeld: de punten 15° verder over de cirkel
  onAnderVoorbeeld: () => void;
  // Stand van de route
  aantalPunten: number;
  heeftFinish: boolean;
  // Items: voorgesteld aantal, aan te passen met − en +
  itemAantal: number;
  onItemAantal: (n: number) => void;
  aantalItems: number;
  onItems: () => Promise<void>;
  itemsBezig: boolean;
  vraagpunten: number;
  metVraag: number;
  onVragen: () => void;
  onControleren: () => void;
};

type Knop = { tekst: string; onClick: () => void; uit?: boolean };

export default function EersteStappen(p: Props) {
  const rondje = p.modus === "verspreid";
  const stappen = rondje
    ? ["📍 Startpunt", "🏁 Finish", "👥 Teams en afstand", "🗺️ Voorbeeld", "🎁 Items", "📝 Vragen", "🩺 Controleren"]
    : ["📍 Startpunt", "📍 Punten zetten", "🏁 Finish", "📝 Vragen", "🩺 Controleren"];
  const stap = Math.min(p.stap, stappen.length - 1);
  const naar = (n: number) => { p.onKies(null); p.onStap(n); };
  const volgende: Knop = { tekst: "Volgende →", onClick: () => naar(stap + 1) };

  const zoekVeld = (
    <form onSubmit={p.onZoek} className="es-zoek">
      <input className="form-input" placeholder="🔍 Plaats of adres" value={p.zoekterm} onChange={(e) => p.onZoekterm(e.target.value)} />
      <button type="submit" className="rl-knop" disabled={p.zoekBezig}>{p.zoekBezig ? "…" : "Zoeken"}</button>
      {p.zoekFout && <div className="es-fout">{p.zoekFout}</div>}
    </form>
  );
  const kiesKnop = (k: Exclude<KiesModus, null>, tekst: string, gedaan: boolean) => (
    <button type="button" className={`rl-knop es-groot${p.kies === k ? " rl-knop--cyan" : gedaan ? " es-gedaan" : ""}`} onClick={() => p.onKies(p.kies === k ? null : k)}>
      {p.kies === k ? "👆 Tik nu op de kaart…" : gedaan ? `✓ ${tekst} · opnieuw` : tekst}
    </button>
  );
  const getal = (label: string, waarde: number, onWaarde: (n: number) => void, min: number, max: number, stapGrootte = 1, eenheid = "", hint?: string) => (
    <div className="es-getal">
      <span>{label}{hint && <small>{hint}</small>}</span>
      <span className="es-getal-veld">
        <button type="button" className="rl-knop" onClick={() => onWaarde(Math.max(min, +(waarde - stapGrootte).toFixed(1)))} aria-label={`${label} minder`}>−</button>
        <strong>{String(waarde).replace(".", ",")}{eenheid}</strong>
        <button type="button" className="rl-knop" onClick={() => onWaarde(Math.min(max, +(waarde + stapGrootte).toFixed(1)))} aria-label={`${label} meer`}>+</button>
      </span>
    </div>
  );

  // Per stap: uitleg (één zin), inhoud, de hoofdknop, eventueel een tweede keuze, en waarom het nog niet verder kan
  let zin: React.ReactNode;
  let inhoud: React.ReactNode = null;
  let hoofd: Knop = volgende;
  let extra: Knop | null = null;
  let nogNiet = "";

  const vragenStap = rondje ? 5 : 3;
  if (stap === 0) {
    zin = <>Zoek de plaats en tik op de kaart waar de teams <strong>beginnen</strong>.</>;
    inhoud = <>{zoekVeld}{rondje ? kiesKnop("start", "📍 Startpunt aantikken", p.startGekozen) : kiesKnop("punten", "📍 Startpunt aantikken", p.aantalPunten > 0)}</>;
    if (rondje ? !p.startGekozen : p.aantalPunten < 1) nogNiet = "Tik eerst het startpunt aan.";
  } else if (rondje && stap === 1) {
    zin = <>Waar <strong>eindigen</strong> de teams?</>;
    inhoud = (<>
      {kiesKnop("finish", "🏁 Finish aantikken", p.finishGekozen)}
      <button type="button" className={`rl-knop es-groot${p.finishZelfde ? " es-gedaan" : ""}`} onClick={p.onFinishZelfde}>
        {p.finishZelfde ? "✓ Finish = startpunt" : "↩ Zelfde plek als de start"}
      </button>
    </>);
    if (!p.finishGekozen && !p.finishZelfde) nogNiet = "Kies eerst de finish.";
  } else if (rondje && stap === 2) {
    zin = <>Hoeveel teams en hoe ver? Het aantal punten rekent de app uit.</>;
    inhoud = (<>
      {getal("Teams", p.teams, p.onTeams, 2, 20)}
      {getal("Afstand", p.km, p.onKm, 0.5, 30, 0.5, " km")}
      {getal("Punten", p.aantal, p.onAantal, 3, 30, 1, "", "schatting")}
      {p.aantal < p.teams * 2 && <div className="es-let-op">⚠️ Minstens {p.teams * 2} punten aanbevolen voor {p.teams} teams.</div>}
    </>);
    hoofd = { ...volgende, onClick: () => { p.onBewaarInstellingen(); naar(stap + 1); } };
    if (!(p.km > 0 && p.teams >= 2 && p.aantal >= 3)) nogNiet = "Vul de afstand in.";
  } else if (rondje && stap === 3) {
    zin = <>Zo komen de <strong>{p.aantal} punten</strong> te liggen (gestippeld). De app zet ze straks op de weg of het voetpad.</>;
    if (p.aantalPunten >= 3) inhoud = <div className="es-ok">✓ {p.aantalPunten} punten staan op de kaart. Verslepen kan altijd nog.</div>;
    hoofd = {
      tekst: p.maakBezig ? "⏳ Punten maken…" : p.aantalPunten >= 3 ? "✓ Opnieuw maken" : "✓ Ja, maak de punten",
      onClick: async () => { await p.onMaakPunten(); naar(stap + 1); }, uit: p.maakBezig,
    };
    extra = { tekst: "🔄 Ander voorbeeld", onClick: p.onAnderVoorbeeld, uit: p.maakBezig };
  } else if (rondje && stap === 4) {
    zin = <>Voorgestelde items staan doorzichtig op de kaart. Meer of minder?</>;
    inhoud = (<>
      {getal("Items", p.itemAantal, p.onItemAantal, 0, 60)}
      {p.aantalItems > 0 && <div className="es-ok">✓ Er liggen al {p.aantalItems} items.</div>}
    </>);
    hoofd = { tekst: p.itemsBezig ? "⏳ Plaatsen…" : `✨ Plaats ${p.itemAantal} items`, onClick: async () => { await p.onItems(); naar(stap + 1); }, uit: p.itemsBezig || p.itemAantal === 0 };
    extra = { tekst: "Later →", onClick: () => naar(stap + 1) };
  } else if (!rondje && stap === 1) {
    zin = <>Tik de volgende punten aan, <strong>in de volgorde</strong> van lopen. Een GPX? Gebruik 📥 Importeren.</>;
    inhoud = (<>
      {kiesKnop("punten", "📍 Punten aantikken", false)}
      <div className="es-ok">✓ {p.aantalPunten} {p.aantalPunten === 1 ? "punt" : "punten"} gezet</div>
    </>);
  } else if (!rondje && stap === 2) {
    zin = <>Tik aan waar de teams <strong>finishen</strong>.</>;
    inhoud = kiesKnop("finish", "🏁 Finish aantikken", p.heeftFinish);
    if (!p.heeftFinish) nogNiet = "Tik eerst de finish aan.";
  } else if (stap === vragenStap) {
    zin = <>Bij elk vraagpunt hoort een vraag. Nu invullen, of later.</>;
    inhoud = <div className={p.metVraag === p.vraagpunten && p.vraagpunten > 0 ? "es-ok" : "es-let-op"}>{p.metVraag} van {p.vraagpunten} vragen ingevuld</div>;
    hoofd = { tekst: "📝 Vragen invullen", onClick: p.onVragen, uit: !p.vraagpunten };
    extra = { tekst: "Later →", onClick: () => naar(stap + 1) };
  } else {
    zin = <>De route staat op <strong>✏️ Concept</strong>. Laat de app nakijken wat er nog ontbreekt; daarna zet je hem klaar.</>;
    hoofd = { tekst: "🩺 Controleren", onClick: p.onControleren };
  }

  return (
    <div className="eerste-stappen" role="dialog" aria-label="Eerste stappen" onClick={(e) => e.stopPropagation()}>
      <div className="es-kop">
        <span className="es-titel">🚀 Nieuwe route</span>
        <span className="es-teller">stap {stap + 1} van {stappen.length}</span>
        <button type="button" className="editor-paneel-sluit" onClick={p.onSluit} title="Stoppen (later verder via 🚀)" aria-label="Stoppen">✕</button>
      </div>
      <div className="es-balk" aria-hidden>
        {stappen.map((s, i) => <span key={s} className={i < stap ? "gedaan" : i === stap ? "nu" : ""} />)}
      </div>
      <div className="es-stapnaam">{stappen[stap]}</div>
      <p className="es-zin">{zin}</p>
      {inhoud && <div className="es-inhoud">{inhoud}</div>}
      {(stap > 0 || extra) && (
        <div className="es-neven">
          {stap > 0 && <button type="button" className="es-link" onClick={() => naar(stap - 1)}>← Terug</button>}
          <span style={{ flex: 1 }} />
          {extra && <button type="button" className="rl-knop es-extra" disabled={extra.uit} onClick={extra.onClick}>{extra.tekst}</button>}
        </div>
      )}
      <button type="button" className="rl-knop rl-knop--cyan es-hoofd" disabled={hoofd.uit || !!nogNiet} onClick={hoofd.onClick}>{hoofd.tekst}</button>
      {nogNiet && <div className="es-hint">{nogNiet}</div>}
    </div>
  );
}
