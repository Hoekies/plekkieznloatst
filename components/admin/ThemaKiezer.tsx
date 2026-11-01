"use client";

import { useEffect, useState } from "react";
import { VensterMetKop } from "@/components/shared/Venster";
import MenuIcoon from "@/components/admin/MenuIcoon";
import { KLEUR_THEMAS, BEHEER_THEMA_SLEUTEL, VOLGT_SPELER, isKleurThema, spelerThemaNu, zetThema } from "@/lib/kleurthema";

// Menu-item "🎨 Kleur": de kleur van het beheer op dit toestel: dezelfde kleuren als de spelersapp, of
// "🎮 Zoals de spelersapp" (volgt de kleur van de actieve route, route-editor → ⚙️ Instellingen → 🎨 Uiterlijk).
export default function ThemaKiezer() {
  const [open, setOpen] = useState(false);
  const [keuze, setKeuze] = useState<string>("paars");
  const [speler, setSpeler] = useState<string | null>(null);
  useEffect(() => {
    setSpeler(spelerThemaNu());
    try { const t = localStorage.getItem(BEHEER_THEMA_SLEUTEL); if (t === VOLGT_SPELER || isKleurThema(t)) setKeuze(t); } catch { /* geen opslag */ }
  }, []);
  function kies(t: string) {
    setKeuze(t);
    zetThema(t === VOLGT_SPELER ? speler : t);
    try { localStorage.setItem(BEHEER_THEMA_SLEUTEL, t); } catch { /* geen opslag */ }
  }
  const spelerKleur = KLEUR_THEMAS.find((k) => k.sleutel === (speler ?? "paars"));
  const huidig = keuze === VOLGT_SPELER ? spelerKleur : KLEUR_THEMAS.find((k) => k.sleutel === keuze);
  return (
    <>
      <button type="button" className="admin-nav-link" onClick={() => setOpen(true)} title="Kleur van het beheer op dit toestel">
        <MenuIcoon naam="palet" /> Kleur <span className="thema-stip" style={{ background: huidig?.staal }} aria-hidden />
      </button>
      {open && (
        <VensterMetKop icoon="🎨" label="Op dit toestel" titel="Kleur van het beheer" onSluit={() => setOpen(false)} breedte={420}>
          <div className="thema-keuzes" role="radiogroup" aria-label="Kleur">
            {/* Volgt de spelersapp: met de kleur van de actieve route als staal */}
            <button type="button" role="radio" aria-checked={keuze === VOLGT_SPELER}
              className={`thema-keuze thema-keuze--speler${keuze === VOLGT_SPELER ? " aan" : ""}`} onClick={() => kies(VOLGT_SPELER)}>
              <span className="thema-staal" style={{ background: spelerKleur?.staal }} aria-hidden />
              <span>🎮 Zoals de spelersapp<span className="thema-keuze-sub">{spelerKleur?.naam ?? "Paars"}</span></span>
            </button>
            {KLEUR_THEMAS.map((k) => (
              <button key={k.sleutel} type="button" role="radio" aria-checked={keuze === k.sleutel}
                className={`thema-keuze${keuze === k.sleutel ? " aan" : ""}`} onClick={() => kies(k.sleutel)}>
                <span className="thema-staal" style={{ background: k.staal }} aria-hidden />
                {k.naam}
              </button>
            ))}
          </div>
          <span className="inst-uitleg">Geldt alleen op dit toestel. <b>Zoals de spelersapp</b> neemt de kleur over van de actieve route (die kies je per route bij 🎨 Uiterlijk).</span>
        </VensterMetKop>
      )}
    </>
  );
}
