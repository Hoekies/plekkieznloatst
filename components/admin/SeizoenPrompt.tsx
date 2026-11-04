"use client";

import { useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import Icoon from "@/components/admin/Icoon";
import UitklapPijl from "@/components/shared/UitklapPijl";
import { SEIZOEN_VOORBEELDEN, seizoenPrompt } from "@/lib/seizoen-prompts";

// ✨ Zelf nieuwe laten maken: typ een woord of seizoen, kopieer de prompt en plak hem in ChatGPT, met de drie
// voorbeelden als bijlage. Dan komen de achtergrond en beide logo's in één keer, in de stijl van de app.
export default function SeizoenPrompt() {
  const [open, setOpen] = useState(true);
  const [thema, setThema] = useState("");
  const woord = thema.trim();
  const tekst = seizoenPrompt(woord || "[THEMA]");

  function kopieer() {
    navigator.clipboard?.writeText(tekst)
      .then(() => toonMelding("Prompt gekopieerd: plak hem in ChatGPT, met de drie voorbeelden als bijlage", "ok"))
      .catch(() => toonMelding("Kopiëren lukte niet: selecteer de tekst en kopieer hem zelf", "fout"));
  }

  return (
    <div className="seizoen-prompt">
      <button type="button" className="seizoen-prompt-kop" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <UitklapPijl open={open} />
        <span>✨ Achtergrond en logo&apos;s laten maken met ChatGPT</span>
      </button>
      {open && (
        <>
          <ol className="seizoen-prompt-stappen">
            <li>Typ een woord of seizoen en tik op <strong>Kopieer prompt</strong></li>
            <li>Bewaar de <strong>drie voorbeelden</strong> en voeg ze in ChatGPT toe als bijlage</li>
            <li>Plak de prompt en verstuur. Stopt ChatGPT na één afbeelding? Typ dan <strong>volgende</strong></li>
            <li>Plaats elk resultaat hierboven: kies Achtergrond, Logo of Logo breed en tik op een afbeelding, of op <strong>+</strong> bij Eigen 1 of 2</li>
          </ol>
          <div className="seizoen-prompt-rij">
            <input className="form-input" value={thema} onChange={(e) => setThema(e.target.value)} maxLength={60}
              placeholder="Bijv. Zomer, Bedrijfsuitje, Voetbal" aria-label="Woord of seizoen" />
            <button type="button" className="rl-knop rl-knop--cyan" disabled={!woord} onClick={kopieer} title={woord ? "Prompt kopiëren" : "Typ eerst een woord of seizoen"}>
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
        </>
      )}
    </div>
  );
}
