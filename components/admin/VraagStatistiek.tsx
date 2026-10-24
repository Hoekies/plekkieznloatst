"use client";

import type { TeamAntwoorden } from "@/lib/admin-antwoorden";
import LeegScherm from "@/components/admin/LeegScherm";
import BevestigKnop from "@/components/admin/BevestigKnop";
import Icoon from "@/components/admin/Icoon";

type Stat = {
  punt_id: string; volgorde: number; punt_naam: string; vraag_tekst: string; vraag_type: string;
  aantal: number; goed: number; wacht: number; juiste: string | null;
  fout: Map<string, { tekst: string; n: number; ids: string[] }>;
  // Alle foute antwoorden (voor "iedereen goed")
  foutIds: string[];
  // 🗳️ Stemvraag: aantal stemmen per keuze, en of de stemming nog open is
  stemmen: Map<string, number>;
  stemOpen: boolean;
};

// "📊 Per vraag": hoeveel teams elke vraag goed of fout hadden, en welke foute antwoorden vaak voorkwamen.
// Zo zie je meteen of een vraag te moeilijk (of fout ingesteld) is.
// onOokGoed: achteraf goed rekenen voor alle teams met dat antwoord (tekst = open vraag: telt voortaan ook goed)
export default function VraagStatistiek({ teams, onOokGoed, onSluitStemming }: {
  teams: TeamAntwoorden[];
  onOokGoed?: (ids: string[], tekst: string | null) => Promise<void>;
  onSluitStemming?: (puntId: string) => Promise<void>;
}) {
  const stats = new Map<string, Stat>();
  for (const t of teams) {
    for (const r of t.rijen) {
      let s = stats.get(r.punt_id);
      if (!s) {
        s = { punt_id: r.punt_id, volgorde: r.punt_volgorde, punt_naam: r.punt_naam, vraag_tekst: r.vraag_tekst, vraag_type: r.vraag_type,
          aantal: 0, goed: 0, wacht: 0, juiste: r.juiste_antwoord, fout: new Map(), foutIds: [], stemmen: new Map(), stemOpen: false };
        stats.set(r.punt_id, s);
      }
      s.aantal++;
      if (r.vraag_type === "stemvraag") {
        const keuze = r.antwoord ?? "(geen keuze)";
        s.stemmen.set(keuze, (s.stemmen.get(keuze) ?? 0) + 1);
        if (r.stem_open) s.stemOpen = true;
        if (r.is_correct === true) s.goed++;
        continue;
      }
      const isFoto = r.vraag_type === "foto_opdracht";
      if (isFoto ? r.foto_status === "wacht" : false) s.wacht++;
      else if (isFoto ? r.foto_status === "goedgekeurd" : r.is_correct === true) s.goed++;
      else if (!isFoto) {
        // Foute antwoorden samen tellen, ongeacht hoofdletters en spaties
        const tekst = (r.antwoord ?? "").trim() || "(geen antwoord)";
        const sleutel = tekst.toLowerCase().replace(/\s+/g, " ");
        const f = s.fout.get(sleutel) ?? { tekst, n: 0, ids: [] };
        f.n++;
        f.ids.push(r.voortgang_id);
        s.foutIds.push(r.voortgang_id);
        s.fout.set(sleutel, f);
      }
    }
  }
  const lijst = [...stats.values()].sort((a, b) => a.volgorde - b.volgorde);
  if (lijst.length === 0) {
    return <LeegScherm icoon="📊">Nog geen vragen beantwoord. Zodra teams antwoorden, zie je hier per vraag hoe het ging.</LeegScherm>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {lijst.map((s, i) => {
        const beoordeeld = s.aantal - s.wacht;
        const pct = beoordeeld ? Math.round((s.goed / beoordeeld) * 100) : 0;
        const kleur = pct >= 70 ? "#4ADE80" : pct >= 40 ? "#FBBF24" : "#F87171";
        const fouten = [...s.fout.values()].sort((a, b) => b.n - a.n);
        if (s.vraag_type === "stemvraag") {
          const max = Math.max(0, ...s.stemmen.values());
          return (
            <div key={s.punt_id} className="pr-gem-card" style={{ marginBottom: 0 }}>
              <div className="pr-gem-card-inner" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>{i + 1}. {s.punt_naam} · 🗳️ stemvraag · {s.stemOpen ? "stemming open" : `gesloten, ${s.goed} ${s.goed === 1 ? "team kreeg" : "teams kregen"} de punten`}</div>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>{s.vraag_tekst}</div>
                {[...s.stemmen].sort((a, b) => b[1] - a[1]).map(([keuze, n]) => (
                  <div key={keuze} className="stem-balk">
                    <span className="stem-balk-vulling" style={{ width: `${(n / s.aantal) * 100}%`, background: n === max ? "#A78BFA" : "rgba(167,139,250,0.35)" }} />
                    <span className="stem-balk-tekst">{n === max ? "👑 " : ""}{keuze}</span>
                    <strong className="stem-balk-aantal">{n}</strong>
                  </div>
                ))}
                {s.stemOpen && onSluitStemming && (
                  <BevestigKnop venster gevaarlijk={false} icoon="🗳️" titel="Stemming sluiten?" className="rl-knop" style={{ alignSelf: "flex-start" }}
                    vraag="De teams die de meest gekozen keuze kozen, krijgen nu de punten. Teams die later nog stemmen, krijgen meteen de uitslag. (Bij Uitslag vrijgeven gebeurt dit ook vanzelf.)"
                    ja="🗳️ Sluiten en punten geven" onBevestig={() => onSluitStemming(s.punt_id)}>
                    <Icoon naam="stemmen" /> Stemming sluiten
                  </BevestigKnop>
                )}
              </div>
            </div>
          );
        }
        return (
          <div key={s.punt_id} className="pr-gem-card" style={{ marginBottom: 0 }}>
            <div className="pr-gem-card-inner" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
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
                  {fouten.slice(0, 6).map((f) => onOokGoed && f.tekst !== "(geen antwoord)" ? (
                    // Tik op een fout antwoord om het voor alle teams alsnog goed te rekenen
                    <BevestigKnop key={f.tekst} venster gevaarlijk={false} icoon="✅" titel={`“${f.tekst}” ook goed rekenen?`}
                      className="stat-fout-knop" tip="Dit antwoord toch goed rekenen"
                      vraag={`${f.n} ${f.n === 1 ? "team krijgt" : "teams krijgen"} alsnog de punten.${s.vraag_type === "open" ? " Bij deze open vraag telt het antwoord voortaan ook goed." : ""}`}
                      ja="✓ Ook goed rekenen" onBevestig={() => onOokGoed(f.ids, s.vraag_type === "open" ? f.tekst : null)}>
                      “{f.tekst}”{f.n > 1 && <strong> {f.n}×</strong>} <span className="stat-fout-plus">✓</span>
                    </BevestigKnop>
                  ) : (
                    <span key={f.tekst} style={{ color: "#FCA5A5" }}>“{f.tekst}”{f.n > 1 && <strong> {f.n}×</strong>}</span>
                  ))}
                  {s.juiste && <span style={{ color: "#BBF7D0" }}>· goed: {s.juiste}</span>}
                </div>
              )}
              {/* Klopte de vraag zelf niet? Dan iedereen goed */}
              {onOokGoed && s.foutIds.length > 1 && (
                <BevestigKnop venster gevaarlijk={false} icoon="🏳️" titel="Iedereen goed rekenen?" className="es-link" tip="Bijv. als de vraag of het goede antwoord niet klopte"
                  vraag={`Alle ${s.foutIds.length} teams met een fout antwoord krijgen alsnog de punten van deze vraag.`}
                  ja="✓ Iedereen goed" onBevestig={() => onOokGoed(s.foutIds, null)}>
                  <Icoon naam="vlag" /> Klopte de vraag niet? Iedereen goed rekenen
                </BevestigKnop>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
