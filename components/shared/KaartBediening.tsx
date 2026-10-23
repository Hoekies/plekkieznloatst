"use client";

import { useEffect, useState } from "react";

// Linksonder op de kaart: kaartlagen en licht/donker/luchtfoto in één paneel, in te klappen tot
// één knopje (zodat het geen punten bedekt). Ingeklapt of niet wordt onthouden op dit toestel.
const SLEUTEL = "pr_kaartpaneel_ingeklapt";

export default function KaartBediening({ children, extraKlasse = "" }: { children: React.ReactNode; extraKlasse?: string }) {
  const [ingeklapt, setIngeklapt] = useState(false);
  useEffect(() => {
    try { setIngeklapt(localStorage.getItem(SLEUTEL) === "1"); } catch { /* geen opslag */ }
  }, []);
  function wissel(nieuw: boolean) {
    setIngeklapt(nieuw);
    try { localStorage.setItem(SLEUTEL, nieuw ? "1" : "0"); } catch { /* geen opslag */ }
  }

  if (ingeklapt) {
    return (
      <div className={`kaart-bediening kaart-bediening--in ${extraKlasse}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="kaart-bediening-open" onClick={() => wissel(false)} title="Kaartlagen en kaartstijl" aria-label="Kaartlagen en kaartstijl tonen">🗺️ <span>Kaart</span></button>
      </div>
    );
  }
  return (
    <div className={`kaart-bediening ${extraKlasse}`} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="kaart-bediening-dicht" onClick={() => wissel(true)} title="Inklappen" aria-label="Paneel inklappen">‹</button>
      {children}
    </div>
  );
}
