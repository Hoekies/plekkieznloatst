"use client";

import type { TeamAntwoorden } from "@/lib/admin-antwoorden";

type Stat = {
  punt_id: string; volgorde: number; punt_naam: string; vraag_tekst: string; vraag_type: string;
  aantal: number; goed: number; wacht: number; juiste: string | null;
  fout: Map<string, { tekst: string; n: number }>;
};

// "📊 Per vraag": hoeveel teams elke vraag goed of fout hadden, en welke foute antwoorden vaak voorkwamen.
// Zo zie je meteen of een vraag te moeilijk (of fout ingesteld) is.
export default function VraagStatistiek({ teams }: { teams: TeamAntwoorden[] }) {
  const stats = new Map<string, Stat>();
  for (const t of teams) {
    for (const r of t.rijen) {
      let s = stats.get(r.punt_id);
      if (!s) {
        s = { punt_id: r.punt_id, volgorde: r.punt_volgorde, punt_naam: r.punt_naam, vraag_tekst: r.vraag_tekst, vraag_type: r.vraag_type,
          aantal: 0, goed: 0, wacht: 0, juiste: r.juiste_antwoord, fout: new Map() };
        stats.set(r.punt_id, s);
      }
      s.aantal++;
      const isFoto = r.vraag_type === "foto_opdracht";
      if (isFoto ? r.foto_status === "wacht" : false) s.wacht++;
      else if (isFoto ? r.foto_status === "goedgekeurd" : r.is_correct === true) s.goed++;
      else if (!isFoto) {
        // Foute antwoorden samen tellen, ongeacht hoofdletters en spaties
        const tekst = (r.antwoord ?? "").trim() || "(geen antwoord)";
        const sleutel = tekst.toLowerCase().replace(/\s+/g, " ");
        const f = s.fout.get(sleutel) ?? { tekst, n: 0 };
        f.n++;
        s.fout.set(sleutel, f);
      }
    }
  }
  const lijst = [...stats.values()].sort((a, b) => a.volgorde - b.volgorde);
  if (lijst.length === 0) {
    return <div className="card leeg-scherm"><p>Nog geen vragen beantwoord.</p></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {lijst.map((s, i) => {
        const beoordeeld = s.aantal - s.wacht;
        const pct = beoordeeld ? Math.round((s.goed / beoordeeld) * 100) : 0;
        const kleur = pct >= 70 ? "#4ADE80" : pct >= 40 ? "#FBBF24" : "#F87171";
        const fouten = [...s.fout.values()].sort((a, b) => b.n - a.n);
        return (
          <div key={s.punt_id} className="pr-gem-card" style={{ marginBottom: 0 }}>
            <div className="pr-gem-card-inner" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>{i + 1}. {s.punt_naam}{s.vraag_type === "foto_opdracht" ? " · 📸 foto" : ""}</div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>{s.vraag_tekst}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem", color: kleur }}>{beoordeeld ? `${pct}%` : "—"}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{s.goed} van {beoordeeld} goed{s.wacht ? ` · ${s.wacht} te keuren` : ""}</div>
                </div>
              </div>
              <div className="pr-xp-bar" style={{ marginTop: 0 }}><div className="pr-xp-fill" style={{ width: `${pct}%`, background: kleur }} /></div>
              {fouten.length > 0 && (
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
                  <span>Fout:</span>
                  {fouten.slice(0, 6).map((f) => (
                    <span key={f.tekst} style={{ color: "#FCA5A5" }}>“{f.tekst}”{f.n > 1 && <strong> {f.n}×</strong>}</span>
                  ))}
                  {s.juiste && <span style={{ color: "#BBF7D0" }}>· goed: {s.juiste}</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
