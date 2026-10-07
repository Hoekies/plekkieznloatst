"use client";

import { useEffect, useState } from "react";
import type { AntwoordRij, TeamAntwoorden } from "@/lib/admin-antwoorden";

type Data = {
  route: { id: string; name: string } | null;
  uitslag_vrijgegeven: boolean;
  teams: TeamAntwoorden[];
  wachtende_fotos: number;
};

export default function AntwoordenOverzicht() {
  const [data, setData] = useState<Data | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);

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
      if (!res.ok) alert((await res.json().catch(() => ({}))).fout ?? "Mislukt");
      await laad();
    } finally {
      setBezig(null);
    }
  }

  async function wisselUitslag() {
    if (!data) return;
    const vrij = !data.uitslag_vrijgegeven;
    if (vrij) {
      const nogBezig = data.teams.filter((t) => t.status === "actief").length;
      const waarschuwing = [
        nogBezig ? `${nogBezig} team${nogBezig !== 1 ? "s zijn" : " is"} nog niet gefinisht.` : "",
        data.wachtende_fotos ? `Er ${data.wachtende_fotos !== 1 ? "zijn" : "is"} nog ${data.wachtende_fotos} foto${data.wachtende_fotos !== 1 ? "'s" : ""} niet gekeurd.` : "",
      ].filter(Boolean).join("\n");
      if (!confirm(`Uitslag vrijgeven? Alle teams zien dan de eindstand.${waarschuwing ? "\n\n" + waarschuwing : ""}`)) return;
    }
    await actie("uitslag", () => fetch("/api/admin/uitslag", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vrij }),
    }));
  }

  if (!data) return <p style={{ color: "var(--muted)" }}>Laden…</p>;
  if (!data.route) return <div className="card"><p style={{ color: "var(--muted)", margin: 0 }}>Er is geen actieve route.</p></div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 900 }}>
      {/* Uitslag */}
      <div className="card" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, color: "var(--ink)" }}>{data.route.name}</div>
          <div style={{ fontSize: "0.8rem", color: data.wachtende_fotos ? "#FBBF24" : "var(--muted)", marginTop: 2 }}>
            {data.wachtende_fotos
              ? `📸 ${data.wachtende_fotos} foto${data.wachtende_fotos !== 1 ? "'s" : ""} nog te keuren`
              : "Alle foto's zijn gekeurd"}
            {" · "}
            {data.uitslag_vrijgegeven ? "✅ Uitslag is zichtbaar voor de teams" : "🔒 Uitslag nog verborgen"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <a className="rl-knop" href="/admin/rapport" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
            title="Eindstand en per team de vragen, items en gelopen route — op te slaan als PDF">
            📄 Rapport (PDF)
          </a>
          <button className={`rl-knop ${data.uitslag_vrijgegeven ? "" : "rl-knop--cyan"}`} disabled={bezig === "uitslag"} onClick={wisselUitslag}>
            {data.uitslag_vrijgegeven ? "🔒 Uitslag weer verbergen" : "🏆 Uitslag vrijgeven"}
          </button>
        </div>
      </div>

      {data.teams.length === 0 && (
        <div className="card"><p style={{ color: "var(--muted)", margin: 0 }}>Nog geen teams aan het spelen.</p></div>
      )}

      {data.teams.map((team) => (
        <div key={team.sessie_id} className="card" style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: "1.5rem" }}>{team.icon ?? "👥"}</span>
            <span style={{ fontWeight: 700, color: "var(--ink)", flex: 1 }}>{team.naam}</span>
            <span style={{ fontSize: "0.78rem", color: team.status === "voltooid" ? "var(--green)" : "var(--muted)" }}>
              {team.status === "voltooid" ? "🏁 Gefinisht" : "Onderweg"}
            </span>
            <span style={{ fontWeight: 800, color: "var(--ink)" }}>{team.score} pt</span>
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
