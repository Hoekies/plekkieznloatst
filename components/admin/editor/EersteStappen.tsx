"use client";

// 🚀 Eerste stappen: bij een nieuwe route stap voor stap van lege kaart naar een speelbare route.
// Een venster bovenop de kaart (de kaart blijft aan te tikken), één stap tegelijk.
// Rondje (verspreid): start → finish → teams, afstand en punten → voorbeeld → items → vragen → controleren.
// Op volgorde: start → punten → finish → vragen → controleren.
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

export default function EersteStappen(p: Props) {
  const rondje = p.modus === "verspreid";
  const stappen = rondje
    ? ["📍 Startpunt", "🏁 Finish", "👥 Teams en afstand", "🗺️ Voorbeeld", "🎁 Items", "📝 Vragen", "🩺 Controleren"]
    : ["📍 Startpunt", "📍 Punten zetten", "🏁 Finish", "📝 Vragen", "🩺 Controleren"];
  const stap = Math.min(p.stap, stappen.length - 1);
  const laatste = stap === stappen.length - 1;
  const naar = (n: number) => { p.onKies(null); p.onStap(n); };

  // Mag je door? (anders is "Volgende" grijs; zonder startpunt kun je alleen stoppen)
  const klaarVoorVolgende = rondje
    ? [p.startGekozen, p.finishGekozen || p.finishZelfde, p.km > 0 && p.teams >= 2 && p.aantal >= 3, p.aantalPunten >= 3, true, true, true][stap]
    : [p.aantalPunten >= 1, p.aantalPunten >= 1, p.heeftFinish, true, true][stap];
  const uitleg = rondje
    ? ["Tik eerst het startpunt aan.", "Tik de finish aan, of kies dezelfde plek als de start.", "Vul de afstand in.", "Maak eerst de punten.", "", "", ""][stap]
    : ["Tik eerst het startpunt aan.", "Zet minstens één punt.", "Tik de finish aan.", "", ""][stap];

  const zoekVeld = (
    <form onSubmit={p.onZoek} className="es-zoek">
      <input className="form-input" placeholder="🔍 Plaats of adres, bijv. Kerkstraat 1, Berghem" value={p.zoekterm} onChange={(e) => p.onZoekterm(e.target.value)} />
      <button type="submit" className="rl-knop" disabled={p.zoekBezig}>{p.zoekBezig ? "…" : "Zoeken"}</button>
      {p.zoekFout && <div className="es-fout">{p.zoekFout}</div>}
    </form>
  );
  const kiesKnop = (k: Exclude<KiesModus, null>, tekst: string, gedaan: boolean) => (
    <button type="button" className={`rl-knop es-groot${p.kies === k ? " rl-knop--cyan" : ""}`} onClick={() => p.onKies(p.kies === k ? null : k)}>
      {p.kies === k ? "👆 Tik nu op de kaart…" : gedaan ? `✓ ${tekst} (opnieuw kiezen)` : tekst}
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

  // Stappen met eigen knoppen in plaats van "Volgende"
  let eigenVoet: React.ReactNode = null;
  let inhoud: React.ReactNode;

  if (stap === 0) inhoud = (<>
    <p>Zoek de plaats of het adres en tik op de kaart waar de teams <strong>beginnen</strong>.</p>
    {zoekVeld}
    {rondje
      ? kiesKnop("start", "📍 Startpunt aantikken", p.startGekozen)
      : kiesKnop("punten", "📍 Startpunt aantikken", p.aantalPunten > 0)}
  </>);
  else if (rondje) {
    if (stap === 1) inhoud = (<>
      <p>Waar <strong>eindigen</strong> de teams? Tik de finish aan, of gebruik dezelfde plek als de start.</p>
      {kiesKnop("finish", "🏁 Finish aantikken", p.finishGekozen)}
      <button type="button" className={`rl-knop es-groot${p.finishZelfde ? " rl-knop--cyan" : ""}`} onClick={p.onFinishZelfde}>
        {p.finishZelfde ? "✓ Finish = startpunt" : "↩ Zelfde plek als de start"}
      </button>
    </>);
    else if (stap === 2) inhoud = (<>
      <p>Hoeveel teams spelen er en hoe ver lopen ze ongeveer? Het aantal punten rekent de app uit; je kunt het aanpassen.</p>
      {getal("Teams", p.teams, p.onTeams, 2, 20)}
      {getal("Afstand", p.km, p.onKm, 0.5, 30, 0.5, " km")}
      {getal("Punten", p.aantal, p.onAantal, 3, 30, 1, "", "schatting")}
      {p.aantal < p.teams * 2 && <div className="es-let-op">⚠️ Minstens {p.teams * 2} punten aanbevolen voor {p.teams} teams.</div>}
    </>);
    else if (stap === 3) {
      inhoud = (<>
        <p>Zo komen de <strong>{p.aantal} punten</strong> ongeveer te liggen (gestippeld op de kaart). Klopt dit? Dan maakt de app ze, meteen op de weg of het voetpad. Liever iets anders? Met <strong>🔄 Ander voorbeeld</strong> schuiven ze een stukje over de cirkel.</p>
        {p.aantalPunten >= 3 && <div className="es-ok">✓ {p.aantalPunten} punten staan op de kaart. Verslepen kan altijd nog.</div>}
      </>);
      eigenVoet = (<>
        <button type="button" className="rl-knop" disabled={p.maakBezig} onClick={p.onAnderVoorbeeld} title="De punten 15° verder over de cirkel">🔄 Ander voorbeeld</button>
        <button type="button" className="rl-knop rl-knop--cyan" disabled={p.maakBezig}
          onClick={async () => { await p.onMaakPunten(); naar(stap + 1); }}>
          {p.maakBezig ? "⏳ Punten maken…" : p.aantalPunten >= 3 ? "✓ Opnieuw maken" : "✓ Ja, maak de punten"}
        </button>
      </>);
    }
    else if (stap === 4) {
      inhoud = (<>
        <p>Voorgestelde items staan doorzichtig op de kaart, verdeeld langs de route. Meer of minder? Pas het aantal aan.</p>
        {getal("Items", p.itemAantal, p.onItemAantal, 0, 60)}
        {p.aantalItems > 0 && <div className="es-ok">✓ Er liggen al {p.aantalItems} items.</div>}
      </>);
      eigenVoet = (<>
        <button type="button" className="rl-knop" onClick={() => naar(stap + 1)}>Later →</button>
        <button type="button" className="rl-knop rl-knop--cyan" disabled={p.itemsBezig || p.itemAantal === 0}
          onClick={async () => { await p.onItems(); naar(stap + 1); }}>
          {p.itemsBezig ? "⏳ Plaatsen…" : `✨ Plaats ${p.itemAantal} items`}
        </button>
      </>);
    }
  } else {
    if (stap === 1) inhoud = (<>
      <p>Tik de volgende punten aan, <strong>in de volgorde</strong> waarin de teams ze lopen. Punten uit een bestand haal je binnen met 📥 Importeren.</p>
      {kiesKnop("punten", "📍 Punten aantikken", false)}
      <div className="es-ok">✓ {p.aantalPunten} {p.aantalPunten === 1 ? "punt" : "punten"} gezet.</div>
    </>);
    else if (stap === 2) inhoud = (<>
      <p>Tik aan waar de teams <strong>finishen</strong>.</p>
      {kiesKnop("finish", "🏁 Finish aantikken", p.heeftFinish)}
    </>);
  }

  const vragenStap = rondje ? 5 : 3;
  if (stap === vragenStap) {
    inhoud = (<>
      <p>Bij elk vraagpunt hoort een vraag. Vul ze nu achter elkaar in, of doe het later.</p>
      <div className={p.metVraag === p.vraagpunten && p.vraagpunten > 0 ? "es-ok" : "es-let-op"}>{p.metVraag} van {p.vraagpunten} vragen ingevuld</div>
    </>);
    eigenVoet = (<>
      <button type="button" className="rl-knop" onClick={() => naar(stap + 1)}>Later →</button>
      <button type="button" className="rl-knop rl-knop--cyan" disabled={!p.vraagpunten} onClick={p.onVragen}>📝 Vragen invullen</button>
    </>);
  }
  if (laatste) {
    inhoud = (<>
      <p>De route staat nu op <strong>✏️ Concept</strong>. Laat de app controleren wat er nog ontbreekt; als alles klopt zet je de route later klaar en kun je hem activeren.</p>
    </>);
    eigenVoet = <button type="button" className="rl-knop rl-knop--cyan" onClick={p.onControleren}>🩺 Controleren</button>;
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
      <div className="es-inhoud">{inhoud}</div>
      <div className="es-voet">
        {stap > 0 && <button type="button" className="rl-knop" onClick={() => naar(stap - 1)}>← Terug</button>}
        <span style={{ flex: 1 }} />
        {eigenVoet ?? (!laatste && (
          <button type="button" className="rl-knop rl-knop--cyan" disabled={!klaarVoorVolgende}
            onClick={() => { if (rondje && stap === 2) p.onBewaarInstellingen(); naar(stap + 1); }}
            title={klaarVoorVolgende ? undefined : uitleg}>
            Volgende →
          </button>
        ))}
      </div>
      {!klaarVoorVolgende && !eigenVoet && uitleg && <div className="es-hint">{uitleg}</div>}
    </div>
  );
}
