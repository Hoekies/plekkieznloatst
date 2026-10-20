"use client";

// 🚀 Eerste stappen: bij een nieuwe route stap voor stap van lege kaart naar een speelbare route.
// Een venster bovenop de kaart (de kaart blijft aan te tikken), één stap tegelijk.
// Verspreid: startpunt → finish → teams en km → punten maken → items → vragen → klaar.
// Op volgorde: plaats → punten tikken → finish → vragen → klaar.

export type KiesModus = null | "start" | "finish" | "punten";

type Props = {
  modus: "sequentieel" | "verspreid";
  stap: number;
  onStap: (n: number) => void;
  onSluit: () => void;
  // Plaats zoeken (zelfde zoekveld als boven de kaart)
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
  // Verspreid: rondje
  teams: number; onTeams: (n: number) => void;
  km: number; onKm: (n: number) => void;
  aantal: number; onAantal: (n: number) => void;
  onBewaarInstellingen: () => void;
  onMaakPunten: () => Promise<void>;
  maakBezig: boolean;
  // Stand van de route
  aantalPunten: number;
  heeftFinish: boolean;
  itemVoorstellen: number;
  aantalItems: number;
  onItems: () => Promise<void>;
  itemsBezig: boolean;
  vraagpunten: number;
  metVraag: number;
  onVragen: () => void;
  onControleren: () => void;
};

export default function EersteStappen(p: Props) {
  const verspreid = p.modus === "verspreid";
  const stappen = verspreid
    ? ["📍 Startpunt", "🏁 Finish", "👥 Teams en km", "🎲 Punten maken", "✨ Items", "📝 Vragen", "✅ Klaar"]
    : ["🔍 Plaats", "📍 Punten zetten", "🏁 Finish", "📝 Vragen", "✅ Klaar"];
  const stap = Math.min(p.stap, stappen.length - 1);
  const laatste = stap === stappen.length - 1;

  // Mag je door naar de volgende stap? (anders is "Volgende" grijs, met uitleg)
  const klaarVoorVolgende = verspreid
    ? [p.startGekozen, p.finishGekozen || p.finishZelfde, p.km > 0 && p.teams >= 2, p.aantalPunten >= 3, true, true, true][stap]
    : [true, p.aantalPunten >= 1, p.heeftFinish, true, true][stap];

  const zoekVeld = (
    <form onSubmit={p.onZoek} className="es-zoek">
      <input className="form-input" placeholder="🔍 Plaats of adres, bijv. Berghem" value={p.zoekterm} onChange={(e) => p.onZoekterm(e.target.value)} />
      <button type="submit" className="rl-knop" disabled={p.zoekBezig}>{p.zoekBezig ? "…" : "Zoeken"}</button>
      {p.zoekFout && <div className="es-fout">{p.zoekFout}</div>}
    </form>
  );
  const kiesKnop = (k: Exclude<KiesModus, null>, tekst: string, gedaan: boolean) => (
    <button type="button" className={`rl-knop es-groot${p.kies === k ? " rl-knop--cyan" : ""}`} onClick={() => p.onKies(p.kies === k ? null : k)}>
      {p.kies === k ? "👆 Tik nu op de kaart…" : gedaan ? `✓ ${tekst} (opnieuw kiezen)` : tekst}
    </button>
  );
  const getal = (label: string, waarde: number, onWaarde: (n: number) => void, min: number, max: number, stapGrootte = 1, eenheid = "") => (
    <label className="es-getal">
      <span>{label}</span>
      <span className="es-getal-veld">
        <button type="button" className="rl-knop" onClick={() => onWaarde(Math.max(min, +(waarde - stapGrootte).toFixed(1)))} aria-label={`${label} minder`}>−</button>
        <strong>{waarde}{eenheid}</strong>
        <button type="button" className="rl-knop" onClick={() => onWaarde(Math.min(max, +(waarde + stapGrootte).toFixed(1)))} aria-label={`${label} meer`}>+</button>
      </span>
    </label>
  );

  let inhoud: React.ReactNode;
  if (verspreid) {
    if (stap === 0) inhoud = (<>
      <p>Zoek de plaats en tik op de kaart waar alle teams <strong>beginnen</strong>. De punten komen in een rondje hieromheen.</p>
      {zoekVeld}
      {kiesKnop("start", "📍 Startpunt aantikken", p.startGekozen)}
    </>);
    else if (stap === 1) inhoud = (<>
      <p>Waar <strong>eindigen</strong> de teams? Tik de finish aan, of kies dezelfde plek als de start.</p>
      {kiesKnop("finish", "🏁 Finish aantikken", p.finishGekozen)}
      <button type="button" className={`rl-knop es-groot${p.finishZelfde ? " rl-knop--cyan" : ""}`} onClick={p.onFinishZelfde}>
        {p.finishZelfde ? "✓ Finish = startpunt" : "↩ Zelfde plek als de start"}
      </button>
    </>);
    else if (stap === 2) inhoud = (<>
      <p>Hoeveel teams spelen er en hoe lang wordt het rondje? Tip: reken op ongeveer 2 à 3 punten per kilometer.</p>
      {getal("Teams", p.teams, (n) => { p.onTeams(n); }, 2, 20)}
      {getal("Rondje", p.km, (n) => { p.onKm(n); }, 0.5, 30, 0.5, " km")}
      {getal("Punten", p.aantal, p.onAantal, 3, 30)}
      {p.aantal < p.teams * 2 && <div className="es-let-op">⚠️ Minstens {p.teams * 2} punten aanbevolen voor {p.teams} teams.</div>}
    </>);
    else if (stap === 3) inhoud = (<>
      <p>Op de kaart zie je de voorgestelde plekken. Maak de punten: ze komen op de dichtstbijzijnde weg of het voetpad.</p>
      <button type="button" className="rl-knop rl-knop--cyan es-groot" disabled={p.maakBezig} onClick={() => p.onMaakPunten()}>
        {p.maakBezig ? "⏳ Punten maken…" : p.aantalPunten >= 3 ? `🎲 Opnieuw maken (${p.aantal} punten)` : `🎲 Maak ${p.aantal} punten`}
      </button>
      {p.aantalPunten >= 3 && <div className="es-ok">✓ {p.aantalPunten} punten staan op de kaart. Verslepen kan altijd nog.</div>}
    </>);
    else if (stap === 4) inhoud = (<>
      <p>Items maken het spannend. De app weet hoeveel er passen bij dit rondje en zet ze langs de weg.</p>
      {p.itemVoorstellen > 0 ? (
        <button type="button" className="rl-knop rl-knop--cyan es-groot" disabled={p.itemsBezig} onClick={() => p.onItems()}>
          {p.itemsBezig ? "⏳ Items plaatsen…" : `✨ Plaats ${p.itemVoorstellen} items`}
        </button>
      ) : <div className="es-ok">✓ Er liggen {p.aantalItems} items: genoeg voor dit rondje.</div>}
    </>);
  } else {
    if (stap === 0) inhoud = (<>
      <p>Zoek de plaats waar de route komt.</p>
      {zoekVeld}
    </>);
    else if (stap === 1) inhoud = (<>
      <p>Tik de punten <strong>in de volgorde</strong> waarin de teams ze lopen. Het eerste punt is waar ze beginnen. Punten uit een bestand haal je binnen met 📥 Importeren.</p>
      {kiesKnop("punten", "📍 Punten aantikken", false)}
      {p.aantalPunten > 0 && <div className="es-ok">✓ {p.aantalPunten} {p.aantalPunten === 1 ? "punt" : "punten"} gezet.</div>}
    </>);
    else if (stap === 2) inhoud = (<>
      <p>Tik aan waar de teams <strong>finishen</strong>.</p>
      {kiesKnop("finish", "🏁 Finish aantikken", p.heeftFinish)}
    </>);
  }
  const vragenStap = verspreid ? 5 : 3;
  if (stap === vragenStap) inhoud = (<>
    <p>Bij elk vraagpunt hoort een vraag. Vul ze achter elkaar in; bij het opslaan kies je ook de naam van het punt.</p>
    <div className={p.metVraag === p.vraagpunten && p.vraagpunten > 0 ? "es-ok" : "es-let-op"}>{p.metVraag} van {p.vraagpunten} vragen ingevuld</div>
    <button type="button" className="rl-knop rl-knop--cyan es-groot" disabled={!p.vraagpunten} onClick={p.onVragen}>📝 Vragen invullen</button>
  </>);
  if (laatste) inhoud = (<>
    <p>Bijna klaar! Laat de app controleren of alles in orde is; daarna zet je de route klaar en kun je hem activeren.</p>
    <button type="button" className="rl-knop rl-knop--cyan es-groot" onClick={p.onControleren}>🩺 Controleren en klaarzetten</button>
  </>);

  return (
    <div className="eerste-stappen" role="dialog" aria-label="Eerste stappen" onClick={(e) => e.stopPropagation()}>
      <div className="es-kop">
        <span className="es-titel">🚀 Eerste stappen</span>
        <span className="es-teller">{stap + 1}/{stappen.length}</span>
        <button type="button" className="editor-paneel-sluit" onClick={p.onSluit} title="Sluiten (later terug via 🚀)" aria-label="Sluiten">✕</button>
      </div>
      <div className="es-balk" aria-hidden>
        {stappen.map((s, i) => <span key={s} className={i < stap ? "gedaan" : i === stap ? "nu" : ""} />)}
      </div>
      <div className="es-stapnaam">{stappen[stap]}</div>
      <div className="es-inhoud">{inhoud}</div>
      <div className="es-voet">
        {stap > 0 && <button type="button" className="rl-knop" onClick={() => { p.onKies(null); p.onStap(stap - 1); }}>← Terug</button>}
        <span style={{ flex: 1 }} />
        {!laatste && (
          <button type="button" className="rl-knop rl-knop--cyan" disabled={!klaarVoorVolgende}
            onClick={() => { p.onKies(null); if (verspreid && stap === 2) p.onBewaarInstellingen(); p.onStap(stap + 1); }}
            title={klaarVoorVolgende ? undefined : "Rond eerst deze stap af"}>
            Volgende →
          </button>
        )}
      </div>
    </div>
  );
}
