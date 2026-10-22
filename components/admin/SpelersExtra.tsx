"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toonMelding } from "@/components/admin/Melding";
import { openKaartjes } from "@/components/admin/InlogUitdelen";
import { uitlegBijStatus } from "@/lib/fout-uitleg";

// Klein venster in de stijl van de andere vensters: icoon, titel, inhoud en een rode ✕
function Venster({ icoon, label, titel, onSluit, children }: { icoon: string; label: string; titel: string; onSluit: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") onSluit(); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [onSluit]);
  return createPortal(
    <div onClick={onSluit} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 400 }}>
        <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pr-gem-avatar" style={{ width: 44, height: 44, fontSize: "1.6rem" }}>{icoon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pr-gem-label">{label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titel}</div>
            </div>
            <button type="button" className="editor-paneel-sluit" onClick={onSluit} title="Sluiten" aria-label="Sluiten">✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ✏️ Teamnaam aanpassen (bijv. een ongepaste naam); leeg = het team kiest bij de start opnieuw
export function TeamnaamVenster({ spelerId, naam, icoon, onSluit, onOpgeslagen }: {
  spelerId: string; naam: string | null; icoon: string | null; onSluit: () => void; onOpgeslagen: (naam: string | null) => void;
}) {
  const [waarde, setWaarde] = useState(naam ?? "");
  const [bezig, setBezig] = useState(false);
  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    const res = await fetch(`/api/admin/groepen/${spelerId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname: waarde }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBezig(false);
    if (!res?.ok) { toonMelding(uitlegBijStatus(res?.status ?? 0, "Opslaan", data.fout), "fout"); return; }
    onOpgeslagen(data.nickname ?? null);
    toonMelding("Teamnaam aangepast", "ok");
    onSluit();
  }
  return (
    <Venster icoon={icoon ?? "👫"} label="✏️ Teamnaam" titel={naam ?? "nog geen teamnaam"} onSluit={onSluit}>
      <form onSubmit={opslaan} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input className="form-input" value={waarde} maxLength={30} autoFocus onChange={(e) => setWaarde(e.target.value)}
          placeholder="Leeg = het team kiest zelf opnieuw" style={{ fontSize: "1.05rem", fontWeight: 700 }} />
        <button type="submit" className="rl-knop hoofdknop" style={{ height: 44 }} disabled={bezig}>{bezig ? "Bezig…" : "💾 Opslaan"}</button>
      </form>
    </Venster>
  );
}

// 🖨️ Alle kaartjes: inloggegevens van alle actieve spelers in één keer, om te printen of per WhatsApp te sturen
export function AlleKaartjesKnop() {
  const [bezig, setBezig] = useState(false);
  const [onbekend, setOnbekend] = useState<string[] | null>(null);
  async function haal(nieuw: boolean) {
    setBezig(true);
    const res = await fetch("/api/admin/groepen/kaartjes", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nieuw }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBezig(false);
    if (!res?.ok) { toonMelding(uitlegBijStatus(res?.status ?? 0, "Ophalen", data.fout), "fout"); return; }
    // Van sommige spelers is het wachtwoord niet bewaard: eerst vragen of die een nieuw krijgen
    if (!nieuw && data.onbekend?.length) { setOnbekend(data.onbekend); return; }
    setOnbekend(null);
    if (!data.inlogs?.length) { toonMelding("Geen spelers met inloggegevens", "fout"); return; }
    openKaartjes(data.inlogs);
  }
  // Zonder nieuwe wachtwoorden: alleen wie een bewaard wachtwoord heeft
  async function haalZonder() {
    const res = await fetch("/api/admin/groepen/kaartjes", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => ({})) : {};
    setOnbekend(null);
    if (data.inlogs?.length) openKaartjes(data.inlogs);
    else toonMelding("Geen spelers met een bewaard wachtwoord", "fout");
  }
  return (
    <>
      <button type="button" className="rl-knop actie-knop" disabled={bezig} onClick={() => haal(false)}
        title="Inlogkaartjes van alle spelers: printen of per WhatsApp versturen">
        🖨️ <span className="alleen-pc">Alle kaartjes</span><span className="alleen-mobiel">Kaartjes</span>
      </button>
      {onbekend && (
        <Venster icoon="🔑" label="Wachtwoord niet bewaard" titel={`${onbekend.length} ${onbekend.length === 1 ? "speler" : "spelers"}`} onSluit={() => setOnbekend(null)}>
          <div style={{ fontSize: "0.84rem", color: "var(--text)" }}>
            Van <strong>{onbekend.join(", ")}</strong> is het wachtwoord niet bewaard. Die krijgen een nieuw wachtwoord; het oude werkt daarna niet meer.
          </div>
          <button type="button" className="rl-knop hoofdknop" style={{ height: 44 }} disabled={bezig} onClick={() => haal(true)}>
            {bezig ? "Bezig…" : "🔑 Nieuw wachtwoord en kaartjes maken"}
          </button>
          <button type="button" className="es-link" style={{ alignSelf: "center" }} onClick={() => haalZonder()}>Alleen de kaartjes van de anderen</button>
        </Venster>
      )}
    </>
  );
}
