"use client";

import { useEffect, useState } from "react";
import BevestigKnop from "@/components/admin/BevestigKnop";
import SectieKop from "@/components/admin/SectieKop";
import { toonMelding } from "@/components/admin/Melding";
import { WijzigVenster, NieuwAccountForm, type BeheerModal } from "@/components/admin/GroepenBeheer";
import { foutUitleg } from "@/lib/fout-uitleg";
import LaadBlokjes from "@/components/shared/LaadBlokjes";

type Helper = { id: string; naam: string; laatst_ingelogd: string | null; uitgeschakeld?: boolean };

// Helpers van de spelleider: zij loggen in met een naam en wachtwoord en kunnen dan
// meekijken, foto's keuren en punten vrijgeven. Geen routes, spelers of reset.
// Zelfde opbouw als de spelers: knop "+ Nieuwe helper", formulier, en kaarten met knoppen.
export default function HelpersBeheer() {
  const [helpers, setHelpers] = useState<Helper[] | null>(null);
  const [formulier, setFormulier] = useState(false);
  const [modal, setModal] = useState<BeheerModal | null>(null);

  async function laad() {
    const res = await fetch("/api/admin/helpers");
    if (res.ok) setHelpers((await res.json()).helpers);
  }
  useEffect(() => { laad(); }, []);

  async function verwijder(h: Helper) {
    const res = await fetch("/api/admin/helpers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id }) });
    if (!res.ok) toonMelding(await foutUitleg(res, "Verwijderen"), "fout");
    else toonMelding(`${h.naam} is verwijderd`, "ok");
    laad();
  }

  // Aan/uit, zoals bij de spelers: uit = kan niet inloggen en wordt meteen uitgelogd
  async function schakel(h: Helper) {
    const uit = !h.uitgeschakeld;
    const res = await fetch("/api/admin/helpers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: h.id, uitgeschakeld: uit }) });
    if (!res.ok) { toonMelding(await foutUitleg(res, uit ? "Uitzetten" : "Aanzetten"), "fout"); return; }
    setHelpers((lijst) => lijst?.map((x) => x.id === h.id ? { ...x, uitgeschakeld: uit } : x) ?? null);
    toonMelding(uit ? `${h.naam} staat uit: kan niet meer inloggen` : `${h.naam} staat weer aan`, "ok");
  }

  return (
    <div className="helpers-blok" style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32 }}>
      {/* Kop met korte uitleg; de knop links eronder, net als "+ Speler" */}
      <div>
        <SectieKop titel="🦺 Helpers" />
        <div style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: -6 }}>
          Kijken mee, keuren foto&apos;s en geven punten vrij.
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button className="btn btn-primary actie-knop" onClick={() => setFormulier(true)}>
          + <span className="alleen-pc">Nieuwe helper</span><span className="alleen-mobiel">Helper</span>
        </button>
      </div>

      {formulier && <NieuwAccountForm helper onSuccess={laad} onSluit={() => setFormulier(false)} />}

      {helpers === null ? (
        <LaadBlokjes aantal={2} hoogte={64} />
      ) : helpers.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>Nog geen helpers.</p>
      ) : (
        <div>
          {helpers.map((h) => (
            <div key={h.id} className="pr-gem-card">
              <div className="pr-gem-card-inner gb-kaart">
                <div className="pr-gem-avatar" style={{ borderRadius: "50%", background: "var(--blue-soft)", opacity: h.uitgeschakeld ? 0.4 : 1 }}>🦺</div>
                <div className="gb-tekst" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: h.uitgeschakeld ? "var(--muted)" : "#fff" }}>
                    {h.naam}{h.uitgeschakeld && <span className="pr-gem-chip pr-gem-chip--gray" style={{ marginLeft: 8, fontSize: "0.66rem", padding: "2px 8px", verticalAlign: "middle" }}>⏸ Uit</span>}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>
                    <span><span className="gb-login-woord">Login: </span><strong style={{ color: "var(--ink)" }}>{h.naam}</strong> · </span>
                    {h.uitgeschakeld ? (
                      <span>Uitgeschakeld: kan niet inloggen</span>
                    ) : (
                      <span style={{ color: h.laatst_ingelogd ? "#4ADE80" : "var(--muted)", fontWeight: h.laatst_ingelogd ? 700 : 400 }}>
                        {h.laatst_ingelogd ? `Ingelogd ${new Date(h.laatst_ingelogd).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Nog niet ingelogd"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="gb-schakel gb-rechts">
                  <div className="gb-iconen">
                  {!h.uitgeschakeld && (
                    <button type="button" className="rl-knop rl-knop--icoon rl-knop--cyan gb-icoon" aria-label="Inloggegevens versturen"
                      title="Inloggegevens versturen: nieuw wachtwoord en het kaartje via WhatsApp"
                      onClick={() => setModal({ id: h.id, groepNaam: h.naam, icoon: "🦺", login: h.naam, helper: true })}>🔑<span className="gb-label">Inlog</span></button>
                  )}
                  <BevestigKnop venster icoon="🗑️" titel={`${h.naam} verwijderen?`} vraag="" ja="Ja, verwijderen"
                    onBevestig={() => verwijder(h)} className="rl-knop rl-knop--icoon rl-knop--rood gb-verwijder"
                    tip="Helper verwijderen: kan daarna niet meer inloggen">🗑️<span className="gb-label">Verwijder</span></BevestigKnop>
                  </div>
                  {/* Aan/uit, zelfde schakelaar als bij de spelers */}
                  <div className="gb-schakelaar" role="switch" aria-checked={!h.uitgeschakeld} tabIndex={0}
                    title={h.uitgeschakeld ? "Aanzetten" : "Uitzetten (kan dan niet inloggen)"}
                    onClick={() => schakel(h)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); schakel(h); } }}
                    style={{
                      width: 42, height: 24, borderRadius: 12, flexShrink: 0,
                      background: h.uitgeschakeld ? "rgba(255,59,92,0.3)" : "rgba(34,197,94,0.3)",
                      border: `1.5px solid ${h.uitgeschakeld ? "var(--red)" : "var(--green)"}`,
                      position: "relative", cursor: "pointer", transition: "background 0.2s, border-color 0.2s",
                    }}>
                    <div style={{
                      position: "absolute", width: 18, height: 18, borderRadius: "50%",
                      background: h.uitgeschakeld ? "var(--red)" : "var(--green)",
                      top: 2, left: h.uitgeschakeld ? 2 : 20,
                      transition: "left 0.2s, background 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <WijzigVenster modal={modal} onSluit={() => setModal(null)} />}
    </div>
  );
}
