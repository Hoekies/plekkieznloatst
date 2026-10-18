"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AntwoordRij, TeamAntwoorden } from "@/lib/admin-antwoorden";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import StatKaart from "@/components/admin/StatKaart";
import VraagStatistiek from "@/components/admin/VraagStatistiek";

type Data = {
  route: { id: string; name: string } | null;
  uitslag_vrijgegeven: boolean;
  teams: TeamAntwoorden[];
  wachtende_fotos: number;
};

// beperkt: helper van de spelleider, mag wel keuren maar niet de uitslag vrijgeven of het rapport openen
export default function AntwoordenOverzicht({ beperkt = false }: { beperkt?: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  // Per team (keuren) of per vraag (statistiek)
  const [perVraag, setPerVraag] = useState(false);

  async function laad() {
    const res = await fetch("/api/admin/antwoorden");
    if (res.ok) setData(await res.json());
  }
  useEffect(() => {
    laad();
    const t = setInterval(laad, 10000);
    return () => clearInterval(t);
  }, []);

  async function actie(sleutel: string, fn: () => Promise<Response>) {
    setBezig(sleutel);
    try {
      const res = await fn();
      if (!res.ok) toonMelding((await res.json().catch(() => ({}))).fout ?? "Mislukt", "fout");
      await laad();
    } finally {
      setBezig(null);
    }
  }

  async function wisselUitslag() {
    if (!data) return;
    const vrij = !data.uitslag_vrijgegeven;
    await actie("uitslag", () => fetch("/api/admin/uitslag", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vrij }),
    }));
  }

  // Waarschuwing bij het vrijgeven: teams nog onderweg of foto's nog niet gekeurd
  const nogBezig = data?.teams.filter((t) => t.status === "actief").length ?? 0;
  const uitslagWaarschuwing = [
    nogBezig ? `${nogBezig} speler${nogBezig !== 1 ? "s" : ""} onderweg.` : "",
    data?.wachtende_fotos ? `${data.wachtende_fotos} foto${data.wachtende_fotos !== 1 ? "'s" : ""} niet gekeurd.` : "",
  ].filter(Boolean).join(" ");

  if (!data) return <p style={{ color: "var(--muted)" }}>Laden…</p>;
  if (!data.route) return (
    <div className="card leeg-scherm">
      <p>Er is geen actieve route. Activeer eerst een route, dan zie je hier de antwoorden.</p>
      <Link href="/admin/routes" className="rl-knop rl-knop--cyan actie-knop">🗺️ Naar routes</Link>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tegels zoals bovenaan het dashboard */}
      <div className="admin-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 18, marginBottom: 16 }}>
        <StatKaart label="Actieve route" waarde={data.route.name} badgeKlas="pr-badge--orange" badge="🗺️" />
        <StatKaart label="Spelers" waarde={String(data.teams.length)} badgeKlas="pr-badge--purple" badge="🧑‍🤝‍🧑" />
        <StatKaart label="Foto's te keuren" waarde={String(data.wachtende_fotos ?? 0)} badgeKlas={data.wachtende_fotos ? "pr-badge--gold" : "pr-badge--green"} badge="📸" />
        <StatKaart label="Uitslag" waarde={data.uitslag_vrijgegeven ? "Zichtbaar" : "Verborgen"} badgeKlas={data.uitslag_vrijgegeven ? "pr-badge--green" : "pr-badge--gray"} badge={data.uitslag_vrijgegeven ? "🏆" : "🔒"} />
      </div>

      {/* Uitslag en rapport */}
      {/* Uitslag links, rapport rechts */}
      {!beperkt && <div className="actie-rij">
        {data.uitslag_vrijgegeven ? (
          <button className="rl-knop actie-knop" disabled={bezig === "uitslag"} onClick={wisselUitslag}>🔒 Uitslag weer verbergen</button>
        ) : (
          <BevestigKnop venster gevaarlijk={false} icoon="🏆" titel="Uitslag vrijgeven?"
            className="rl-knop rl-knop--cyan actie-knop" disabled={bezig === "uitslag"} onBevestig={wisselUitslag}
            vraag={`Alle spelers zien dan de eindstand op hun finishscherm.${uitslagWaarschuwing ? " ⚠️ " + uitslagWaarschuwing : ""}`} ja="Ja, vrijgeven">
            🏆 Uitslag vrijgeven
          </BevestigKnop>
        )}
        <span style={{ flex: 1 }} />
        <a className="rl-knop actie-knop" href="/admin/rapport" target="_blank" rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
          title="Eindstand en per speler de vragen, items en gelopen route — als PDF te versturen">
          📄 Rapport (PDF)
        </a>
      </div>}

      {data.teams.length > 0 && (
        <div className="punten-snel" style={{ maxWidth: 360 }}>
          <button type="button" className={`rl-knop${!perVraag ? " rl-knop--cyan" : ""}`} onClick={() => setPerVraag(false)}>🧑‍🤝‍🧑 Per team</button>
          <button type="button" className={`rl-knop${perVraag ? " rl-knop--cyan" : ""}`} onClick={() => setPerVraag(true)}>📊 Per vraag</button>
        </div>
      )}
      {perVraag && <VraagStatistiek teams={data.teams} />}

      {data.teams.length === 0 && (
        <div className="card leeg-scherm"><p>Nog geen spelers aan het spelen. Zodra iemand een vraag beantwoordt, zie je dat hier.</p><Link href="/admin" className="rl-knop actie-knop">🏠 Naar het dashboard</Link></div>
      )}

      {!perVraag && data.teams.map((team) => (
        <div key={team.sessie_id} className="pr-gem-card" style={{ marginBottom: 0 }}>
         <div className="pr-gem-card-inner" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="pr-gem-avatar" style={{ width: 52, height: 52, fontSize: "2rem" }}>{team.icon ?? "🧑‍🤝‍🧑"}</span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "#fff", flex: 1 }}>{team.naam}</span>
            <span className={`pr-gem-chip ${team.status === "voltooid" ? "pr-gem-chip--green" : "pr-gem-chip--orange"}`}>
              {team.status === "voltooid" ? "🏁 Gefinisht" : "Onderweg"}
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "#FFE680" }}>{team.score} pt</span>
          </div>
          {team.rijen.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", margin: 0 }}>Nog geen vragen beantwoord.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {team.rijen.map((r) => (
                <AntwoordRegel key={r.voortgang_id} rij={r} bezig={bezig}
                  onGoedkeuren={() => actie(r.voortgang_id, () => fetch(`/api/admin/antwoorden/${r.voortgang_id}`, { method: "POST" }))}
                  onFoto={(status, punten) => actie(r.voortgang_id, () => fetch(`/api/admin/foto/${r.foto_id}`, {
                    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, punten }),
                  }))}
                />
              ))}
            </div>
          )}
         </div>
        </div>
      ))}
    </div>
  );
}

function AntwoordRegel({ rij: r, bezig, onGoedkeuren, onFoto }: {
  rij: AntwoordRij; bezig: string | null;
  onGoedkeuren: () => void; onFoto: (status: "goedgekeurd" | "afgekeurd", punten: number) => void;
}) {
  const [punten, setPunten] = useState(r.max_punten);
  const isFoto = r.vraag_type === "foto_opdracht";
  const kleur = isFoto
    ? r.foto_status === "goedgekeurd" ? "#4ADE80" : r.foto_status === "afgekeurd" ? "#F87171" : "#FBBF24"
    : r.is_correct ? "#4ADE80" : "#F87171";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${kleur}` }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: "0.82rem" }}>
        <div style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{r.punt_naam}</div>
        <div style={{ color: "var(--ink)", fontWeight: 600 }}>{r.vraag_tekst}</div>
        {isFoto ? (
          r.foto_pad && <FotoMini pad={r.foto_pad} />
        ) : (
          <div style={{ marginTop: 3 }}>
            <span style={{ color: kleur, fontWeight: 700 }}>{r.is_correct ? "✓" : "✗"} {r.antwoord ?? "—"}</span>
            {!r.is_correct && r.juiste_antwoord && (
              <span style={{ color: "var(--muted)" }}> · goed: {r.juiste_antwoord}</span>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, color: "var(--ink)", fontSize: "0.85rem" }}>
          {isFoto && r.foto_status === "wacht" ? `max ${r.max_punten}` : `${r.punten} / ${r.max_punten}`}
        </span>
        {!isFoto && r.kan_goedkeuren && (
          <button className="rl-knop" disabled={bezig === r.voortgang_id} onClick={onGoedkeuren}
            title="Het antwoord lijkt genoeg op het goede antwoord: geef alsnog de punten">
            ✓ Toch goed
          </button>
        )}
        {isFoto && r.foto_status === "wacht" && (
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input type="number" min={0} value={punten} onChange={(e) => setPunten(Number(e.target.value))}
              className="form-input" style={{ width: 64, padding: "4px 6px", fontSize: "0.8rem" }} />
            <button className="rl-knop rl-knop--cyan" disabled={bezig === r.voortgang_id} onClick={() => onFoto("goedgekeurd", punten)}>✓</button>
            <button className="rl-knop rl-knop--rood" disabled={bezig === r.voortgang_id} onClick={() => onFoto("afgekeurd", 0)}>✗</button>
          </div>
        )}
        {isFoto && r.foto_status !== "wacht" && (
          <span style={{ fontSize: "0.72rem", color: kleur }}>{r.foto_status === "goedgekeurd" ? "Goedgekeurd" : "Afgekeurd"}</span>
        )}
      </div>
    </div>
  );
}

// Foto's staan in een afgeschermde opslag: haal een tijdelijke link op via de admin-API
function FotoMini({ pad }: { pad: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/admin/foto/sign?pad=${encodeURIComponent(pad)}`)
      .then((r) => r.json()).then((d) => setSrc(d.url ?? null)).catch(() => setSrc(null));
  }, [pad]);
  if (!src) return <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 4 }}>Foto laden…</div>;
  return (
    <a href={src} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Ingestuurde foto" style={{ marginTop: 6, maxWidth: 220, maxHeight: 160, borderRadius: 8, objectFit: "cover", display: "block" }} />
    </a>
  );
}
