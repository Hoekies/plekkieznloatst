"use client";

import { useEffect, useRef, useState } from "react";
import { OPSLAG } from "@/lib/huisstijl";
import { toonMelding } from "@/components/admin/Melding";
import { THEMAS, huidigThema, periodeTekst, standaardBeeld, themaNaam, themaEmoji, MAX_NAAM, MAX_EMOJI, type EigenNamen, type SeizoenSoort } from "@/lib/seizoenen";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { zetConfettiThema } from "@/lib/confetti";
import SeizoenPrompt from "@/components/admin/SeizoenPrompt";
import { knipLogoUit } from "@/lib/logo-uitknippen";
import { verklein } from "@/components/admin/editor/HuisstijlInstellingen";
import Icoon from "@/components/admin/Icoon";
import { VensterMetKop } from "@/components/shared/Venster";

const SOORTEN: { soort: SeizoenSoort; emoji: string; knop: string; naam: string; uitleg: string }[] = [
  { soort: "achtergrond", emoji: "🖼️", knop: "Achtergrond", naam: "Achtergrond", uitleg: "Achtergrond van het welkomstscherm (staand, 9:16)." },
  { soort: "logo", emoji: "🔲", knop: "Logo", naam: "Logo", uitleg: "Spellogo, vierkant: inlogscherm, welkomstscherm, oorkonde, uitslag, beamer." },
  { soort: "logo_breed", emoji: "▭", knop: "Logo breed", naam: "Breed logo", uitleg: "Spellogo, breed: bovenbalk, rapport, voorproefje, inlogkaartje, beamer." },
];

// Tegel met een afbeelding. Een CSS-achtergrond die niet laadt blijft stil leeg, dus laden we hem ook apart: een zandloper
// zolang het duurt, twee keer opnieuw proberen, en lukt dat niet dan een zichtbare melding in plaats van een leeg vak.
function SeizoenBeeld({ beeld, bezig, disabled, onClick, title, label }: {
  beeld: string | null; bezig: boolean; disabled: boolean; onClick: () => void; title: string; label: string;
}) {
  const [toon, setToon] = useState(beeld);
  const [stand, setStand] = useState<"laden" | "klaar" | "fout">(beeld ? "laden" : "klaar");
  useEffect(() => {
    setToon(beeld);
    if (!beeld) { setStand("klaar"); return; }
    setStand("laden");
    let weg = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const probeer = (poging: number) => {
      const adres = poging === 1 ? beeld : `${beeld}?poging=${poging}`;
      const img = new Image();
      img.onload = () => { if (!weg) { setToon(adres); setStand("klaar"); } };
      img.onerror = () => { if (weg) return; if (poging < 3) timer = setTimeout(() => probeer(poging + 1), 1500); else setStand("fout"); };
      img.src = adres;
    };
    probeer(1);
    return () => { weg = true; clearTimeout(timer); };
  }, [beeld]);
  const fout = stand === "fout";
  return (
    <button type="button" className="seizoen-beeld" disabled={disabled} onClick={onClick} aria-label={label}
      title={fout ? "Deze afbeelding kon niet worden geladen" : title}
      style={toon && !fout ? { backgroundImage: `url(${toon})` } : undefined}>
      {bezig || stand === "laden" ? <span className="seizoen-beeld-laden"><Icoon naam="laden" /></span>
        : fout ? <span className="seizoen-beeld-fout">⚠️ Niet geladen</span>
        : beeld ? "" : "+"}
    </button>
  );
}

// Het logo in het menu en de kop meteen mee laten wisselen (dat adres blijft hetzelfde, dus de browser haalt het niet vanzelf op)
function ververLogos() {
  document.querySelectorAll<HTMLImageElement>('img[src*="/spellogo/"]').forEach((img) => { img.src = `${img.src.split("?")[0]}?v=${Date.now()}`; });
}

// 🗓️ Afbeeldingen per seizoen en feestdag, voor alle routes: achtergrond van het welkomstscherm en het
// spellogo (vierkant en breed), op alfabet of door het jaar heen. De app kiest op datum (feestdag gaat voor seizoen).
// Elk thema met een datum heeft een standaardafbeelding (public/seizoenen); een gekozen afbeelding gaat daarvoor, en
// verwijder je die, dan komt de standaard terug. Vrije thema's beginnen leeg.
// Een eigen welkomstfoto van een route gaat altijd voor de seizoensachtergrond. Eigen pagina: /admin/seizoenen.
// Tik op een thema: dan opent een venster met de achtergrond en beide logo's, zodat je ze meteen alle drie kunt plaatsen.
export default function SeizoenAfbeeldingen() {
  const [paden, setPaden] = useState<Record<SeizoenSoort, Record<string, string>> | null>(null);
  const [logosKlaar, setLogosKlaar] = useState(true);
  const [soort, setSoort] = useState<SeizoenSoort>("achtergrond");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState<{ thema: string; soort: SeizoenSoort } | null>(null);
  // Het thema waarvan het venster met alle drie de afbeeldingen open staat
  const [open, setOpen] = useState<string | null>(null);
  const kiesRef = useRef<HTMLInputElement>(null);
  const voorKeuze = useRef<{ thema: string; soort: SeizoenSoort } | null>(null);
  // Volgorde van de thema's: op alfabet of door het jaar heen (onthouden op dit toestel)
  const [volgorde, setVolgorde] = useState<"alfabet" | "periode">("alfabet");
  useEffect(() => { try { if (localStorage.getItem("pr_seizoen_volgorde") === "periode") setVolgorde("periode"); } catch { /* geen opslag */ } }, []);
  function kiesVolgorde(v: "alfabet" | "periode") {
    setVolgorde(v);
    try { localStorage.setItem("pr_seizoen_volgorde", v); } catch { /* geen opslag */ }
  }

  // Lukt het laden niet, dan is onbekend wat er ingesteld staat: dan alleen de fout en opnieuw proberen, geen thema's
  async function laad() {
    setFout(null);
    const res = await fetch("/api/admin/achtergronden").catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok || !d.paden) { setFout(d.fout ?? "Laden lukte niet: controleer je internet"); return; }
    setPaden(d.paden);
    setLogosKlaar(d.logosKlaar !== false);
    setVast(d.vast ?? null);
    setNamen(d.namen ?? {});
  }
  useEffect(() => { laad(); }, []);

  // 📌 Eén thema overal vastzetten (achtergrond, beide logo's en de finish), wat de datum ook is; null = weer op datum
  // Eén wijziging tegelijk: de knoppen staan uit tot het antwoord binnen is, zodat scherm en opslag niet uit elkaar lopen
  const [vast, setVast] = useState<string | null>(null);
  const [pinBezig, setPinBezig] = useState(false);
  // De ref is meteen bij, ook als twee tikken vlak na elkaar komen en de state nog niet is ververst
  const pinLoopt = useRef(false);
  async function zetVast(sleutel: string | null) {
    if (pinLoopt.current) return;
    pinLoopt.current = true;
    setPinBezig(true);
    const oud = vast;
    setVast(sleutel);
    const res = await fetch("/api/admin/achtergronden", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vast: sleutel }) }).catch(() => null);
    const r = res ? await res.json().catch(() => ({})) : {};
    pinLoopt.current = false;
    setPinBezig(false);
    if (!res?.ok) { setVast(oud); toonMelding(r.fout ?? "Opslaan lukte niet", "fout"); return; }
    const t = THEMAS.find((x) => x.sleutel === sleutel);
    ververLogos();
    // null = terug naar de datum; de eigen emoji van een vrij thema
    zetConfettiThema(sleutel, t?.eigen ? themaEmoji(t, namen) : null);
    toonMelding(t ? `${themaEmoji(t, namen)} ${themaNaam(t, namen)} staat nu overal vast (wie de app al open heeft: na opnieuw openen of verversen)` : "Weer automatisch op datum");
  }

  // ✏️ Vrije thema's (Eigen 1 en 2): zelf een naam en emoji geven
  const [namen, setNamen] = useState<EigenNamen>({});
  const [bewerk, setBewerk] = useState<{ sleutel: string; naam: string; emoji: string } | null>(null);
  function bewerkNaam(sleutel: string) {
    const t = THEMAS.find((x) => x.sleutel === sleutel);
    if (t) setBewerk({ sleutel, naam: namen[sleutel]?.naam ?? "", emoji: themaEmoji(t, namen) });
  }
  async function bewaarNaam() {
    if (!bewerk) return;
    const res = await fetch("/api/admin/achtergronden", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eigen: bewerk.sleutel, naam: bewerk.naam, emoji: bewerk.emoji }) }).catch(() => null);
    const r = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { toonMelding(r.fout ?? "Opslaan lukte niet", "fout"); return; }
    setNamen(r.namen ?? {});
    setBewerk(null);
  }

  // Achtergrond als jpg; logo eerst uitknippen (achtergrond doorzichtig, lege randen eraf), dan als webp
  async function upload(thema: string, s: SeizoenSoort, bestand: File | undefined) {
    if (!bestand) return;
    setBezig({ thema, soort: s });
    try {
      const logo = s !== "achtergrond";
      const bron = logo ? (await knipLogoUit(bestand)) ?? bestand : bestand;
      const klein = await verklein(bron, s === "achtergrond" ? 1600 : s === "logo" ? 600 : 900, logo);
      if (!klein) { toonMelding("Dit bestand kan niet als afbeelding worden geopend", "fout"); return; }
      const form = new FormData();
      form.append("bestand", new File([klein], logo ? "logo.webp" : "achtergrond.jpg", { type: klein.type }));
      form.append("bucket", "route-afbeeldingen");
      const up = await fetch("/api/admin/upload", { method: "POST", body: form }).catch(() => null);
      const data = up ? await up.json().catch(() => ({})) : {};
      if (!up?.ok) { toonMelding(data.fout ?? "Uploaden lukte niet", "fout"); return; }
      const res = await fetch("/api/admin/achtergronden", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thema, soort: s, pad: data.pad }) }).catch(() => null);
      const r = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok) { toonMelding(r.fout ?? "Opslaan lukte niet", "fout"); return; }
      setPaden((p) => p && { ...p, [s]: { ...p[s], [thema]: data.pad } });
      ververLogos();
    } finally {
      setBezig(null);
    }
  }
  async function weg(thema: string, s: SeizoenSoort) {
    const res = await fetch("/api/admin/achtergronden", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thema, soort: s }) }).catch(() => null);
    if (!res?.ok) { toonMelding("Verwijderen lukte niet: controleer je internet en probeer het opnieuw", "fout"); return; }
    setPaden((p) => { if (!p) return p; const n = { ...p[s] }; delete n[thema]; return { ...p, [s]: n }; });
    ververLogos();
  }

  const nu = new Date();
  const huidig = paden?.[soort] ?? {};
  const vastThema = THEMAS.find((t) => t.sleutel === vast) ?? null;
  // Vast: altijd dat thema (zonder afbeelding van deze soort: de gewone); anders op datum
  const heeftBeeld = (sleutel: string, s: SeizoenSoort) => !!paden?.[s]?.[sleutel] || !!standaardBeeld(sleutel, s);
  const actief = vastThema ? (heeftBeeld(vastThema.sleutel, soort) ? vastThema : null) : paden ? huidigThema(nu, new Set(THEMAS.filter((t) => heeftBeeld(t.sleutel, soort)).map((t) => t.sleutel))) : null;
  const info = SOORTEN.find((s) => s.soort === soort)!;
  const logo = soort !== "achtergrond";
  const gewoon = logo ? "het gewone logo" : "de gewone achtergrond";
  // Door het jaar heen: op begindatum dit jaar (januari → december)
  const begin = (t: (typeof THEMAS)[number]) => { const [van] = t.periode(nu.getFullYear()); return van.getMonth() * 100 + van.getDate(); };
  // Vrije thema's altijd achteraan
  const themas = [...THEMAS].sort((a, b) => Number(!!a.eigen) - Number(!!b.eigen) || (a.eigen ? 0 : volgorde === "periode" ? begin(a) - begin(b) : a.naam.localeCompare(b.naam, "nl")));
  const openThema = THEMAS.find((t) => t.sleutel === open) ?? null;

  return (
    <div className="form-group seizoen">
      <span className="inst-uitleg">
        Voor <strong>alle routes</strong>. De app wisselt vanzelf op datum. Tik op een thema om de achtergrond en logo&apos;s te wijzigen.
        {soort === "achtergrond" && " Een route met een eigen welkomstfoto houdt die foto."}
      </span>
      {fout && (
        <div className="seizoen-status">
          <span style={{ color: "#FCA5A5" }}>⚠️ {fout}</span>
          <button type="button" className="rl-knop" onClick={laad}>↺ Opnieuw</button>
        </div>
      )}
      {paden && (
        <>
          <div className="segment seizoen-soorten" role="group" aria-label="Soort afbeelding">
            {SOORTEN.map((s) => (
              <button key={s.soort} type="button" className={soort === s.soort ? "aan" : undefined} onClick={() => setSoort(s.soort)} aria-pressed={soort === s.soort}>
                <span aria-hidden>{s.emoji}</span>
                <span>{s.knop}</span>
                <span className="seizoen-telling">{THEMAS.filter((t) => heeftBeeld(t.sleutel, s.soort)).length}</span>
              </button>
            ))}
          </div>
          <span className="inst-uitleg">{info.uitleg}</span>
          <div className="seizoen-status">
            {vastThema ? (
              <>
                <span>📌 Overal vast: <strong>{themaEmoji(vastThema, namen)} {themaNaam(vastThema, namen)}</strong>{!actief && <> (hier {gewoon})</>}</span>
                <button type="button" className="rl-knop" disabled={pinBezig} onClick={() => zetVast(null)}>↺ Weer automatisch</button>
              </>
            ) : (
              <span>🗓️ Op datum: <strong>{actief ? <>{themaEmoji(actief, namen)} {themaNaam(actief, namen)}</> : gewoon}</strong>. Tik op 📌 om een thema overal vast te zetten.</span>
            )}
          </div>
          <div className="seizoen-kop">
            <span>Thema&apos;s</span>
            <div className="segment seizoen-volgorde" role="radiogroup" aria-label="Volgorde">
              <button type="button" role="radio" className={volgorde === "alfabet" ? "aan" : undefined} aria-checked={volgorde === "alfabet"} onClick={() => kiesVolgorde("alfabet")}><Icoon naam="tekst" /> Alfabet</button>
              <button type="button" role="radio" className={volgorde === "periode" ? "aan" : undefined} aria-checked={volgorde === "periode"} onClick={() => kiesVolgorde("periode")}><Icoon naam="kalender" /> Periode</button>
            </div>
          </div>
          {logo && !logosKlaar ? (
            <span className="inst-uitleg" style={{ color: "#FCA5A5" }}>⚠️ Draai eerst migratie 020 (seizoenslogo&apos;s) in Supabase.</span>
          ) : (
            <div className={`seizoen-raster${logo ? " seizoen-raster--logo" : ""}`}>
              {themas.map((t) => {
                const pad = huidig[t.sleutel];
                const standaard = standaardBeeld(t.sleutel, soort);
                const beeld = pad ? OPSLAG + pad : standaard;
                const isNu = actief?.sleutel === t.sleutel;
                return (
                  <div key={t.sleutel} className={`seizoen-vak${isNu ? " seizoen-vak--nu" : ""}`}>
                    <SeizoenBeeld beeld={beeld} bezig={bezig?.thema === t.sleutel} disabled={!!bezig}
                      onClick={() => setOpen(t.sleutel)}
                      title="Achtergrond en logo's van dit thema" label={`${themaNaam(t, namen)}: achtergrond en logo's`} />
                    <span className="seizoen-naam"><span className="seizoen-naam-tekst" title={themaNaam(t, namen)}>{themaEmoji(t, namen)} {themaNaam(t, namen)}</span>
                      {t.eigen && <button type="button" className="seizoen-naam-wijzig" title="Naam en emoji wijzigen" aria-label={`${themaNaam(t, namen)}: naam en emoji wijzigen`}
                        onClick={() => { setOpen(t.sleutel); bewerkNaam(t.sleutel); }}>✏️</button>}
                    </span>
                    <span className="seizoen-periode">{periodeTekst(t, nu.getFullYear())}{!pad && standaard && <span className="seizoen-standaard">standaard</span>}</span>
                    {isNu && <span className="seizoen-nu">{vast ? "vast" : "nu"}</span>}
                    <button type="button" className="seizoen-pin" aria-pressed={vast === t.sleutel} disabled={pinBezig}
                      onClick={() => zetVast(vast === t.sleutel ? null : t.sleutel)}
                      title={vast === t.sleutel ? "Vastgezet: tik om weer automatisch op datum te wisselen" : `${themaNaam(t, namen)} overal vastzetten`}
                      aria-label={vast === t.sleutel ? `${themaNaam(t, namen)} losmaken` : `${themaNaam(t, namen)} vastzetten`}>📌</button>
                    {/* Alleen een gekozen afbeelding is te verwijderen; de standaard blijft er altijd */}
                    {pad && (
                      <BevestigKnop venster icoon="🗑️" titel={`${info.naam} van ${themaNaam(t, namen)} verwijderen?`} vraag=""
                        uitleg={standaard ? "De standaardafbeelding komt er weer voor terug." : "Dit vak wordt weer leeg."}
                        ja="Ja, verwijderen" onBevestig={() => weg(t.sleutel, soort)} className="seizoen-weg" title={`${info.naam} verwijderen`} label={`${info.naam} van ${themaNaam(t, namen)} verwijderen`}>✕</BevestigKnop>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {/* ✨ Zelf nieuwe laten maken, alle drie in dezelfde stijl */}
          <SeizoenPrompt />
        </>
      )}
      {/* Alle afbeeldingen van één thema bij elkaar, elk apart te kiezen */}
      {openThema && (
        <VensterMetKop icoon={themaEmoji(openThema, namen)} label={periodeTekst(openThema, nu.getFullYear())} titel={themaNaam(openThema, namen)}
          onSluit={() => { setOpen(null); setBewerk(null); }} breedte={420} maxHoogte={96}>
          <span className="inst-uitleg">Tik op een vak om de afbeelding te kiezen.</span>
          <div className="seizoen-set">
            {SOORTEN.map((s) => {
              const pad = paden?.[s.soort]?.[openThema.sleutel];
              const standaard = standaardBeeld(openThema.sleutel, s.soort);
              const beeld = pad ? OPSLAG + pad : standaard;
              return (
                <div key={s.soort} className={`seizoen-set-vak seizoen-set-vak--${s.soort}`}>
                  <SeizoenBeeld beeld={beeld} bezig={bezig?.thema === openThema.sleutel && bezig.soort === s.soort}
                    disabled={!!bezig || (s.soort !== "achtergrond" && !logosKlaar)}
                    onClick={() => { voorKeuze.current = { thema: openThema.sleutel, soort: s.soort }; kiesRef.current?.click(); }}
                    title={beeld ? "Andere afbeelding kiezen" : "Afbeelding kiezen"} label={`${s.naam} van ${themaNaam(openThema, namen)} kiezen`} />
                  <span className="seizoen-naam">{s.emoji} {s.knop}</span>
                  <span className="seizoen-periode">{pad ? "eigen" : standaard ? "standaard" : "leeg"}</span>
                  {pad && (
                    <BevestigKnop venster icoon="🗑️" titel={`${s.naam} van ${themaNaam(openThema, namen)} verwijderen?`} vraag=""
                      uitleg={standaard ? "De standaardafbeelding komt er weer voor terug." : "Dit vak wordt weer leeg."}
                      ja="Ja, verwijderen" onBevestig={() => weg(openThema.sleutel, s.soort)} className="seizoen-weg" title={`${s.naam} verwijderen`} label={`${s.naam} van ${themaNaam(openThema, namen)} verwijderen`}>✕</BevestigKnop>
                  )}
                </div>
              );
            })}
          </div>
          {/* ✏️ Naam en emoji van een vrij thema */}
          {openThema.eigen && (bewerk?.sleutel === openThema.sleutel ? (
            <form className="seizoen-bewerk" onSubmit={(e) => { e.preventDefault(); bewaarNaam(); }}>
              <input className="form-input seizoen-bewerk-emoji" value={bewerk.emoji} onChange={(e) => setBewerk({ ...bewerk, emoji: e.target.value })} maxLength={MAX_EMOJI} aria-label="Emoji" />
              <input className="form-input" value={bewerk.naam} onChange={(e) => setBewerk({ ...bewerk, naam: e.target.value })} maxLength={MAX_NAAM} aria-label="Naam" placeholder={openThema.naam} autoFocus />
              <button type="submit" className="seizoen-bewerk-ok" aria-label="Bewaren">✓</button>
            </form>
          ) : (
            <button type="button" className="rl-knop seizoen-set-pin" onClick={() => bewerkNaam(openThema.sleutel)}>✏️ Naam en emoji wijzigen</button>
          ))}
          {/* 📌 Ook hier, met tekst: wat de knop doet staat er meteen bij */}
          <button type="button" className="rl-knop seizoen-set-pin" aria-pressed={vast === openThema.sleutel} disabled={pinBezig}
            onClick={() => zetVast(vast === openThema.sleutel ? null : openThema.sleutel)}>
            📌 {vast === openThema.sleutel ? "Staat overal vast: tik om los te maken" : "Dit thema overal vastzetten"}
          </button>
        </VensterMetKop>
      )}
      <input ref={kiesRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
        onChange={(e) => { if (voorKeuze.current) upload(voorKeuze.current.thema, voorKeuze.current.soort, e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}
