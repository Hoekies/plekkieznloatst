"use client";

import { useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import Icoon from "@/components/admin/Icoon";
import UitklapPijl from "@/components/shared/UitklapPijl";
import { SEIZOEN_VOORBEELDEN, seizoenPrompt } from "@/lib/seizoen-prompts";

// ✨ Zelf nieuwe laten maken: typ een woord of seizoen, kopieer de prompt en plak hem in ChatGPT, met de drie
// voorbeelden als bijlage. Maakt ChatGPT toch niet alle drie, dan per afbeelding een losse prompt.
export default function SeizoenPrompt() {
  const [open, setOpen] = useState(true);
  const [thema, setThema] = useState("");
  const woord = thema.trim();
  const tekst = seizoenPrompt(woord || "[THEMA]");

  function kopieer(inhoud: string, melding: string) {
    navigator.clipboard?.writeText(inhoud)
      .then(() => toonMelding(melding, "ok"))
      .catch(() => toonMelding("Kopiëren lukte niet: selecteer de tekst en kopieer hem zelf", "fout"));
  }
  const uitlegKnop = woord ? undefined : "Typ eerst een woord of seizoen";

  return (
    <div className="seizoen-prompt">
      <button type="button" className="seizoen-prompt-kop" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <UitklapPijl open={open} />
        <span>✨ Logo&apos;s en achtergrond laten maken met ChatGPT</span>
      </button>
      {open && (
        <>
          <ol className="seizoen-prompt-stappen">
            <li>Typ een woord of seizoen en tik op <strong>Kopieer prompt</strong></li>
            <li>Bewaar de <strong>drie voorbeelden</strong> en voeg ze in ChatGPT toe als bijlage</li>
            <li>Plak de prompt en verstuur</li>
            <li>Plaats elk resultaat hierboven: kies Achtergrond, Logo of Logo breed en tik op een afbeelding, of op <strong>+</strong> bij Eigen 1 of 2</li>
          </ol>
          <div className="seizoen-prompt-rij">
            <input className="form-input" value={thema} onChange={(e) => setThema(e.target.value)} maxLength={60}
              placeholder="Bijv. Zomer, Bedrijfsuitje, Voetbal" aria-label="Woord of seizoen" />
            <button type="button" className="rl-knop rl-knop--cyan" disabled={!woord} title={uitlegKnop}
              onClick={() => kopieer(tekst, "Prompt gekopieerd: plak hem in ChatGPT, met de drie voorbeelden als bijlage")}>
              <Icoon naam="klembord" /> Kopieer prompt
            </button>
          </div>
          <div className="seizoen-prompt-rij">
            <span className="seizoen-prompt-label">Voorbeelden:</span>
            {SEIZOEN_VOORBEELDEN.map((v) => (
              <a key={v.naam} className="rl-knop" href={v.bestand} download={v.naam}>
                <Icoon naam="downloaden" /> {v.label}
              </a>
            ))}
          </div>
          <textarea className="form-input seizoen-prompt-tekst" readOnly value={tekst} rows={8} aria-label="Prompt voor ChatGPT" />
          {/* Reserve: ChatGPT maakt soms drie keer hetzelfde. Eén bericht per afbeelding gaat altijd goed */}
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
      )}
    </div>
  );
}
