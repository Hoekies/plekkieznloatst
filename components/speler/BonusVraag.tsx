"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { speelBonus, speelGoedAntwoord, speelFoutAntwoord } from "@/lib/sounds";
import { strooiConfetti } from "@/lib/confetti";

// ⚡ Bonusvraag (migratie 004): komt bij alle teams tegelijk in beeld, met een eigen geluid. Eén poging; wie het
// eerst goed is krijgt alle punten, de volgende iets minder. Op de kaart én na de finish. "Later" klapt hem in
// tot een knopje met de resterende tijd.

type Bonus = { id: string; vraag: string; soort: "meerkeuze" | "foto"; keuzes: string[]; punten: number; aantal_teams: number; rest: number };
type Uitslag = { soort: "goed"; plek: number; punten: number } | { soort: "fout" } | { soort: "foto" };

const POLL_MS = 6000;

// Foto kleiner maken vóór het versturen (telefoonfoto's zijn vaak te groot om te uploaden)
async function verklein(bestand: File): Promise<Blob> {
  try {
    const beeld = await createImageBitmap(bestand);
    const schaal = Math.min(1, 1600 / Math.max(beeld.width, beeld.height));
    const doek = document.createElement("canvas");
    doek.width = Math.round(beeld.width * schaal); doek.height = Math.round(beeld.height * schaal);
    doek.getContext("2d")!.drawImage(beeld, 0, 0, doek.width, doek.height);
    return await new Promise<Blob>((ok) => doek.toBlob((b) => ok(b ?? bestand), "image/jpeg", 0.85));
  } catch {
    return bestand;
  }
}

export default function BonusVraag() {
  const [bonus, setBonus] = useState<Bonus | null>(null);
  const [beantwoord, setBeantwoord] = useState(false);
  const [open, setOpen] = useState(false);
  const [rest, setRest] = useState(0);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [uitslag, setUitslag] = useState<Uitslag | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  // Voorbeeld van de gekozen foto (één adres per foto, weer vrijgegeven als er een andere komt)
  const fotoUrl = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);
  useEffect(() => () => { if (fotoUrl) URL.revokeObjectURL(fotoUrl); }, [fotoUrl]);
  const gezien = useRef<string | null>(null);
  const kiesFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let weg = false;
    async function haal() {
      try {
        const res = await fetch("/api/speler/bonus");
        if (!res.ok || weg) return;
        const d = await res.json() as { bonus: Bonus | null; antwoord: unknown };
        setBonus(d.bonus);
        setBeantwoord(!!d.antwoord);
        if (d.bonus) {
          setRest(d.bonus.rest);
          // Nieuwe bonusvraag: open, met geluid en trillen
          if (gezien.current !== d.bonus.id) {
            gezien.current = d.bonus.id;
            if (!d.antwoord) { setOpen(true); setUitslag(null); setFout(""); setFoto(null); speelBonus(); navigator.vibrate?.([80, 60, 80, 60, 200]); }
          }
        }
      } catch { /* geen verbinding: volgende keer */ }
    }
    haal();
    const t = setInterval(haal, POLL_MS);
    return () => { weg = true; clearInterval(t); };
  }, []);

  // Aftellen per seconde
  useEffect(() => {
    if (!bonus) return;
    const t = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [bonus]);

  async function stuur(body: FormData | { keuze: number }) {
    if (!bonus || bezig) return;
    setBezig(true); setFout("");
    try {
      const res = body instanceof FormData
        ? await fetch("/api/speler/bonus", { method: "POST", body })
        : await fetch("/api/speler/bonus", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bonus_id: bonus.id, ...body }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setFout(d.fout ?? "Versturen lukte niet, probeer het opnieuw"); return; }
      setBeantwoord(true);
      if (d.foto) setUitslag({ soort: "foto" });
      else if (d.goed) { setUitslag({ soort: "goed", plek: d.plek, punten: d.punten }); speelGoedAntwoord(); strooiConfetti({ aantal: 90, duurMs: 2000, knal: true }); }
      else { setUitslag({ soort: "fout" }); speelFoutAntwoord(); }
    } catch {
      setFout("Geen verbinding: probeer het zo opnieuw");
    } finally {
      setBezig(false);
    }
  }

  async function stuurFoto() {
    if (!bonus || !foto) return;
    const form = new FormData();
    form.append("bonus_id", bonus.id);
    form.append("foto", new File([await verklein(foto)], "bonus.jpg", { type: "image/jpeg" }));
    await stuur(form);
  }

  const tijd = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, "0")}`;
  const zichtbaar = bonus && rest > 0;
  if (!zichtbaar && !uitslag) return null;

  // Ingeklapt (of al beantwoord en weggetikt): een knopje met de resterende tijd
  if (!open) {
    if (!zichtbaar || beantwoord) return null;
    return createPortal(
      <button type="button" className="bonus-knopje" onClick={() => setOpen(true)}>⚡ Bonusvraag · {tijd}</button>,
      document.body,
    );
  }

  return createPortal(
    <div className="bonus-achter" role="dialog" aria-label="Bonusvraag">
      <div className="bonus-kaart">
        <div className="bonus-kop">
          <span className="bonus-bliksem" aria-hidden>⚡</span>
          <span className="bonus-titel">BONUSVRAAG</span>
          {zichtbaar && !uitslag && <span className={`bonus-tijd${rest <= 15 ? " bonus-tijd--bijna" : ""}`}>⏱ {tijd}</span>}
        </div>

        {uitslag ? (
          <div className="bonus-uitslag">
            {uitslag.soort === "goed" && <>
              <div className="bonus-uitslag-groot">🎉 Goed!</div>
              <p>Jullie waren nummer {uitslag.plek}: <strong>+{uitslag.punten} punten</strong></p>
            </>}
            {uitslag.soort === "fout" && <>
              <div className="bonus-uitslag-groot">😬 Helaas…</div>
              <p>Dat was niet goed. De volgende bonusvraag is voor jullie!</p>
            </>}
            {uitslag.soort === "foto" && <>
              <div className="bonus-uitslag-groot">📸 Verstuurd!</div>
              <p>De punten volgen zodra de organisatie de foto heeft goedgekeurd. Hoe eerder ingestuurd, hoe meer punten.</p>
            </>}
            <button type="button" className="bonus-sluit" onClick={() => { setOpen(false); setUitslag(null); }}>Verder spelen</button>
          </div>
        ) : beantwoord ? (
          <div className="bonus-uitslag">
            <p>Jullie hebben deze bonusvraag al beantwoord.</p>
            <button type="button" className="bonus-sluit" onClick={() => setOpen(false)}>Verder spelen</button>
          </div>
        ) : bonus && (
          <>
            <p className="bonus-uitleg">Snel zijn! Wie het eerst goed is krijgt <strong>{bonus.punten} punten</strong>, de volgende minder. Eén poging.</p>
            <div className="bonus-vraag">{bonus.vraag}</div>
            {bonus.soort === "meerkeuze" ? (
              <div className="bonus-keuzes">
                {bonus.keuzes.map((k, i) => (
                  <button key={i} type="button" className="bonus-keuze" disabled={bezig} onClick={() => stuur({ keuze: i })}>{k}</button>
                ))}
              </div>
            ) : (
              <div className="bonus-foto">
                <input ref={kiesFoto} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
                {foto ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {fotoUrl && <img src={fotoUrl} alt="" className="bonus-foto-voorbeeld" />}
                    <div className="bonus-foto-knoppen">
                      <button type="button" className="bonus-keuze bonus-keuze--klein" disabled={bezig} onClick={() => kiesFoto.current?.click()}>🔄 Opnieuw</button>
                      <button type="button" className="bonus-keuze bonus-keuze--goud" disabled={bezig} onClick={stuurFoto}>{bezig ? "Versturen…" : "📤 Versturen"}</button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="bonus-keuze bonus-keuze--goud" onClick={() => kiesFoto.current?.click()}>📷 Maak de foto</button>
                )}
              </div>
            )}
            {fout && <div className="bonus-fout">⚠️ {fout}</div>}
            <button type="button" className="bonus-later" onClick={() => setOpen(false)}>Later (de tijd loopt door)</button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
