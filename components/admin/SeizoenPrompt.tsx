"use client";

import { useEffect, useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import Icoon from "@/components/admin/Icoon";
import UitklapPijl from "@/components/shared/UitklapPijl";
import { SEIZOEN_VOORBEELDEN, seizoenPrompt } from "@/lib/seizoen-prompts";

type Dienst = "chatgpt" | "gemini";
const SLEUTEL = "pr_seizoen_dienst";

// ✨ Zelf nieuwe laten maken: typ een woord of seizoen, kopieer de prompt en plak hem in ChatGPT of Gemini, met de
// voorbeelden als bijlage. ChatGPT: één prompt voor alle drie (met losse als reserve). Gemini: per afbeelding een prompt.
export default function SeizoenPrompt() {
  const [open, setOpen] = useState(false);
  const [thema, setThema] = useState("");
  const [dienst, setDienst] = useState<Dienst>("chatgpt");
  // Gemini: welke prompt er in het tekstvak staat
  const [gekozen, setGekozen] = useState(0);
  useEffect(() => { try { if (localStorage.getItem(SLEUTEL) === "gemini") setDienst("gemini"); } catch { /* geen opslag */ } }, []);
  function kiesDienst(d: Dienst) {
    setDienst(d);
    try { localStorage.setItem(SLEUTEL, d); } catch { /* geen opslag */ }
  }

  const woord = thema.trim();
  const invul = woord || "[THEMA]";
  const tekst = dienst === "chatgpt" ? seizoenPrompt(invul) : SEIZOEN_VOORBEELDEN[gekozen].gemini(invul);

  function kopieer(inhoud: string, melding: string) {
    navigator.clipboard?.writeText(inhoud)
      .then(() => toonMelding(melding, "ok"))
      .catch(() => toonMelding("Kopiëren lukte niet: selecteer de tekst en kopieer hem zelf", "fout"));
  }
  const uitlegKnop = woord ? undefined : "Typ eerst een woord of seizoen";
  const invoer = (
    <input className="form-input" value={thema} onChange={(e) => setThema(e.target.value)} maxLength={60}
      placeholder="Bijv. Zomer, Bedrijfsuitje, Voetbal" aria-label="Woord of seizoen" />
  );

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

          {dienst === "chatgpt" ? (
            <>
              <ol className="seizoen-prompt-stappen">
                <li>Typ een woord of seizoen en tik op <strong>Kopieer prompt</strong></li>
                <li>Bewaar de <strong>drie voorbeelden</strong> en voeg ze in ChatGPT toe als bijlage</li>
                <li>Plak de prompt en verstuur</li>
                <li>Plaats de resultaten hierboven: tik op het thema, en in het venster op Achtergrond, Logo of Logo breed</li>
              </ol>
              <div className="seizoen-prompt-rij">
                {invoer}
                <button type="button" className="rl-knop rl-knop--cyan" disabled={!woord} title={uitlegKnop}
                  onClick={() => kopieer(tekst, "Prompt gekopieerd: plak hem in ChatGPT, met de drie voorbeelden als bijlage")}>
                  <Icoon naam="klembord" /> Kopieer prompt
                </button>
              </div>
              <div className="seizoen-prompt-rij">
                <span className="seizoen-prompt-label">Voorbeelden:</span>
                {SEIZOEN_VOORBEELDEN.map((v) => (
                  <a key={v.naam} className="rl-knop" href={v.bestand} download={v.naam}><Icoon naam="downloaden" /> {v.label}</a>
                ))}
              </div>
              <textarea className="form-input seizoen-prompt-tekst" readOnly value={tekst} rows={8} aria-label="Prompt" />
              {/* Reserve: ChatGPT maakt soms drie keer hetzelfde. Eén bericht per afbeelding is het zekerst */}
              <div className="seizoen-prompt-los">
                <span className="seizoen-prompt-label">Krijg je drie keer hetzelfde? Stuur ze los, één bericht per afbeelding, met alleen dat voorbeeld erbij:</span>
                <div className="seizoen-prompt-rij">
                  {SEIZOEN_VOORBEELDEN.map((v) => (
                    <button key={v.naam} type="button" className="rl-knop" disabled={!woord} title={uitlegKnop}
                      onClick={() => kopieer(v.los(woord), `Prompt voor ${v.label} gekopieerd: plak hem in ChatGPT, met dat voorbeeld als bijlage`)}>
                      <Icoon naam="klembord" /> {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <ol className="seizoen-prompt-stappen">
                <li>Typ een woord of seizoen</li>
                <li>Begin in Gemini een nieuwe chat. Doe per afbeelding hieronder, van boven naar beneden en in dezelfde chat: voeg het <strong>Voorbeeld</strong> toe als bijlage, tik op <strong>Kopieer</strong>, plak en verstuur</li>
                <li>Plaats de resultaten hierboven: tik op het thema, en in het venster op Achtergrond, Logo of Logo breed</li>
              </ol>
              <div className="seizoen-prompt-rij">{invoer}</div>
              {SEIZOEN_VOORBEELDEN.map((v, i) => (
                <div key={v.naam} className="seizoen-prompt-stuk">
                  <strong>{i + 1}. {v.label}</strong>
                  <a className="rl-knop" href={v.bestand} download={v.naam}><Icoon naam="downloaden" /> Voorbeeld</a>
                  <button type="button" className={`rl-knop${gekozen === i ? " rl-knop--cyan" : ""}`} disabled={!woord} title={uitlegKnop}
                    onClick={() => { setGekozen(i); kopieer(v.gemini(woord), `Prompt voor ${v.label} gekopieerd: plak hem in Gemini, met dat voorbeeld als bijlage`); }}>
                    <Icoon naam="klembord" /> Kopieer
                  </button>
                </div>
              ))}
              <textarea className="form-input seizoen-prompt-tekst" readOnly value={tekst} rows={6} aria-label="Prompt" />
            </>
          )}
        </>
      )}
    </div>
  );
}
