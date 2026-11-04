"use client";

import { useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import Icoon from "@/components/admin/Icoon";
import UitklapPijl from "@/components/shared/UitklapPijl";
import { SEIZOEN_PROMPTS } from "@/lib/seizoen-prompts";
import type { SeizoenSoort } from "@/lib/seizoenen";

// ✨ Zelf een nieuwe laten maken: typ een woord of seizoen, kopieer de prompt en plak hem in ChatGPT, met het
// voorbeeld als bijlage. Zo blijft een nieuw logo of een nieuwe achtergrond in de stijl van de app.
export default function SeizoenPrompt({ soort, naam }: { soort: SeizoenSoort; naam: string }) {
  const [open, setOpen] = useState(true);
  const [thema, setThema] = useState("");
  const prompt = SEIZOEN_PROMPTS[soort];
  const woord = thema.trim();
  const tekst = prompt.tekst(woord || "[THEMA]");

  function kopieer() {
    navigator.clipboard?.writeText(tekst)
      .then(() => toonMelding("Prompt gekopieerd: plak hem in ChatGPT, met het voorbeeld als bijlage", "ok"))
      .catch(() => toonMelding("Kopiëren lukte niet: selecteer de tekst en kopieer hem zelf", "fout"));
  }

  return (
    <div className="seizoen-prompt">
      <button type="button" className="seizoen-prompt-kop" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <UitklapPijl open={open} />
        <span>✨ {naam} laten maken met ChatGPT</span>
      </button>
      {open && (
        <>
          <ol className="seizoen-prompt-stappen">
            <li>Typ een woord of seizoen en tik op <strong>Kopieer prompt</strong></li>
            <li>Bewaar het <strong>voorbeeld</strong> en voeg het in ChatGPT toe als bijlage</li>
            <li>Plak de prompt en verstuur; bevalt het resultaat, bewaar het dan</li>
            <li>Tik hierboven op een afbeelding om hem te plaatsen, of op <strong>+</strong> bij Eigen 1 of 2</li>
          </ol>
          <div className="seizoen-prompt-rij">
            <input className="form-input" value={thema} onChange={(e) => setThema(e.target.value)} maxLength={60}
              placeholder="Bijv. Zomer, Bedrijfsuitje, Voetbal" aria-label="Woord of seizoen" />
            <button type="button" className="rl-knop rl-knop--cyan" disabled={!woord} onClick={kopieer} title={woord ? "Prompt kopiëren" : "Typ eerst een woord of seizoen"}>
              <Icoon naam="klembord" /> Kopieer prompt
            </button>
            <a className="rl-knop" href={prompt.voorbeeld} download={prompt.voorbeeldNaam}>
              <Icoon naam="downloaden" /> Voorbeeld
            </a>
          </div>
          <textarea className="form-input seizoen-prompt-tekst" readOnly value={tekst} rows={8} aria-label="Prompt voor ChatGPT" />
        </>
      )}
    </div>
  );
}
