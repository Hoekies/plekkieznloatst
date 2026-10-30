"use client";

import { useEffect, useState } from "react";
import { VensterMetKop } from "@/components/shared/Venster";
import MenuIcoon from "@/components/admin/MenuIcoon";
import { KLEUR_THEMAS, BEHEER_THEMA_SLEUTEL, isKleurThema, zetThema, type KleurThema } from "@/lib/kleurthema";

// Menu-item "🎨 Kleur": de kleur van het beheer op dit toestel (paars, nachtblauw, bosgroen, antraciet, bordeaux).
// De spelersapp heeft een eigen keuze per route (route-editor → ⚙️ Instellingen → 🎨 Uiterlijk).
export default function ThemaKiezer() {
  const [open, setOpen] = useState(false);
  const [thema, setThema] = useState<KleurThema>("paars");
  useEffect(() => {
    try { const t = localStorage.getItem(BEHEER_THEMA_SLEUTEL); if (isKleurThema(t)) setThema(t); } catch { /* geen opslag */ }
  }, []);
  function kies(t: KleurThema) {
    setThema(t);
    zetThema(t);
    try { localStorage.setItem(BEHEER_THEMA_SLEUTEL, t); } catch { /* geen opslag */ }
  }
  const huidig = KLEUR_THEMAS.find((k) => k.sleutel === thema);
  return (
    <>
      <button type="button" className="admin-nav-link" onClick={() => setOpen(true)} title="Kleur van het beheer op dit toestel">
        <MenuIcoon naam="palet" /> Kleur <span className="thema-stip" style={{ background: huidig?.staal }} aria-hidden />
      </button>
      {open && (
        <VensterMetKop icoon="🎨" label="Op dit toestel" titel="Kleur van het beheer" onSluit={() => setOpen(false)} breedte={420}>
          <div className="thema-keuzes" role="radiogroup" aria-label="Kleur">
            {KLEUR_THEMAS.map((k) => (
              <button key={k.sleutel} type="button" role="radio" aria-checked={thema === k.sleutel}
                className={`thema-keuze${thema === k.sleutel ? " aan" : ""}`} onClick={() => kies(k.sleutel)}>
                <span className="thema-staal" style={{ background: k.staal }} aria-hidden />
                {k.naam}
              </button>
            ))}
          </div>
          <span className="inst-uitleg">Geldt alleen op dit toestel. De kleur van de spelersapp kies je per route bij 🎨 Uiterlijk.</span>
        </VensterMetKop>
      )}
    </>
  );
}
