"use client";

import { useEffect, useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import Icoon from "@/components/admin/Icoon";
import UitklapPijl from "@/components/shared/UitklapPijl";
import { ACHTERGROND_VOORBEELD, LOGO_REFERENTIES, THEMA_INVUL, achtergrondPrompt, achtergrondPromptGemini, logoBreedPrompt, logoPrompt, logoVierkantPrompt } from "@/lib/seizoen-prompts";

type Dienst = "chatgpt" | "gemini";
type Stuk = { id: string; kop: string; bijlagen: { label: string; bestand: string; naam: string }[]; prompt: (thema: string) => string; knop: string };
const SLEUTEL = "pr_seizoen_dienst";

const LOGOS: Stuk = { id: "logos", kop: "Logo's", bijlagen: LOGO_REFERENTIES, prompt: logoPrompt, knop: "Kopieer prompt" };
const LOGO_BREED: Stuk = { id: "breed", kop: "Logo breed", bijlagen: LOGO_REFERENTIES, prompt: logoBreedPrompt, knop: "Kopieer" };
const LOGO_VIERKANT: Stuk = { id: "vierkant", kop: "Logo", bijlagen: LOGO_REFERENTIES, prompt: logoVierkantPrompt, knop: "Kopieer" };
const ACHTERGROND: Stuk = { id: "achtergrond", kop: "Achtergrond", bijlagen: [ACHTERGROND_VOORBEELD], prompt: achtergrondPrompt, knop: "Kopieer" };
const ACHTERGROND_GEMINI: Stuk = { ...ACHTERGROND, prompt: achtergrondPromptGemini };

// ChatGPT: één prompt voor beide logo's, de achtergrond apart. Gemini: één afbeelding per bericht.
const STUKKEN: Record<Dienst, Stuk[]> = {
  chatgpt: [LOGOS, ACHTERGROND],
  gemini: [LOGO_BREED, LOGO_VIERKANT, ACHTERGROND_GEMINI],
};

// ✨ Zelf nieuwe laten maken: typ 1 tot 4 woorden, kopieer de prompt en plak hem in ChatGPT of Gemini, met de
// referenties of het voorbeeld als bijlage.
export default function SeizoenPrompt() {
  const [open, setOpen] = useState(false);
  const [thema, setThema] = useState("");
  const [dienst, setDienst] = useState<Dienst>("chatgpt");
  // Welke prompt er in het tekstvak staat
  const [gekozen, setGekozen] = useState("logos");
  useEffect(() => { try { if (localStorage.getItem(SLEUTEL) === "gemini") setDienst("gemini"); } catch { /* geen opslag */ } }, []);
  function kiesDienst(d: Dienst) {
    setDienst(d);
    try { localStorage.setItem(SLEUTEL, d); } catch { /* geen opslag */ }
  }

  const woord = thema.trim();
  const invul = woord || THEMA_INVUL;
  const teVeel = woord.split(/\s+/).length > 4;
  const stukken = STUKKEN[dienst];
  const reserve = dienst === "chatgpt" ? [LOGO_BREED, LOGO_VIERKANT] : [];
  const huidig = [...stukken, ...reserve].find((s) => s.id === gekozen) ?? stukken[0];

  function kopieer(s: Stuk) {
    setGekozen(s.id);
    navigator.clipboard?.writeText(s.prompt(woord))
      .then(() => toonMelding(`Prompt voor ${s.kop} gekopieerd: plak hem in ${dienst === "chatgpt" ? "ChatGPT" : "Gemini"}, met de bijlagen erbij`, "ok"))
      .catch(() => toonMelding("Kopiëren lukte niet: selecteer de tekst en kopieer hem zelf", "fout"));
  }
  const uitlegKnop = woord ? undefined : "Typ eerst 1 tot 4 woorden";

  return (
    <div className="seizoen-prompt">
      <button type="button" className="seizoen-prompt-kop" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <UitklapPijl open={open} />
        <span>✨ Logo&apos;s en achtergrond laten maken met AI</span>
      </button>
      {open && (
        <>
          <div className="seizoen-prompt-dienst" role="radiogroup" aria-label="Waarmee maak je de afbeeldingen?">
            {(["chatgpt", "gemini"] as const).map((d) => (
              <button key={d} type="button" role="radio" aria-checked={dienst === d} className={`seizoen-dienst seizoen-dienst--${d}`} onClick={() => kiesDienst(d)}>
                {dienst === d && "✓ "}{d === "chatgpt" ? "ChatGPT" : "Gemini"}
              </button>
            ))}
          </div>

          <ol className="seizoen-prompt-stappen">
            <li>Typ het thema: 1 tot 4 woorden</li>
            {dienst === "chatgpt" ? (
              <>
                <li><strong>Logo&apos;s:</strong> bewaar beide referenties, voeg ze als bijlage toe en plak de prompt. Je krijgt twee logo&apos;s</li>
                <li><strong>Achtergrond:</strong> in een nieuw bericht, met het voorbeeld als bijlage</li>
              </>
            ) : (
              <li>Begin een nieuwe chat. Doe per afbeelding, van boven naar beneden: voeg de bijlagen toe, tik op <strong>Kopieer</strong>, plak en verstuur</li>
            )}
            <li>Plaats de resultaten hierboven: tik op het thema, en in het venster op Achtergrond, Logo of Logo breed</li>
          </ol>

          <input className="form-input" value={thema} onChange={(e) => setThema(e.target.value)} maxLength={60}
            placeholder="Bijv. Kerst, Vriendenweekend, Bier en wandelen" aria-label="Thema: 1 tot 4 woorden" />
          {teVeel && <span className="seizoen-prompt-label">De prompt werkt het best met 1 tot 4 woorden.</span>}

          {stukken.map((s) => (
            <div key={s.id} className="seizoen-prompt-stuk">
              <strong>{s.kop}</strong>
              {s.bijlagen.map((b) => (
                <a key={b.naam} className="rl-knop" href={b.bestand} download={b.naam}><Icoon naam="downloaden" /> {b.label}</a>
              ))}
              <button type="button" className={`rl-knop${huidig.id === s.id ? " rl-knop--cyan" : ""}`} disabled={!woord} title={uitlegKnop} onClick={() => kopieer(s)}>
                <Icoon naam="klembord" /> {s.knop}
              </button>
            </div>
          ))}
          <textarea className="form-input seizoen-prompt-tekst" readOnly value={huidig.prompt(invul)} rows={6} aria-label="Prompt" />

          {/* Reserve: maakt ChatGPT maar één logo, of beide in één afbeelding, dan per bericht één */}
          {reserve.length > 0 && (
            <div className="seizoen-prompt-los">
              <span className="seizoen-prompt-label">Krijg je maar één logo, of staan ze samen in één afbeelding? Stuur ze los, met de referenties erbij:</span>
              <div className="seizoen-prompt-rij">
                {reserve.map((s) => (
                  <button key={s.id} type="button" className={`rl-knop${huidig.id === s.id ? " rl-knop--cyan" : ""}`} disabled={!woord} title={uitlegKnop} onClick={() => kopieer(s)}>
                    <Icoon naam="klembord" /> {s.kop}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
