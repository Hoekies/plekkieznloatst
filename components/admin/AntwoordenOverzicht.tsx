"use client";

import { useEffect, useState } from "react";
import type { AntwoordRij, TeamAntwoorden } from "@/lib/admin-antwoorden";
import BevestigKnop from "@/components/admin/BevestigKnop";
import LeegScherm from "@/components/admin/LeegScherm";
import { toonMelding } from "@/components/admin/Melding";
import VraagStatistiek from "@/components/admin/VraagStatistiek";
import FotoGalerij, { useFotoUrl } from "@/components/admin/FotoGalerij";
import StatStrook from "@/components/admin/StatStrook";
import UitslagDelen from "@/components/shared/UitslagDelen";
import LaadBlokjes from "@/components/shared/LaadBlokjes";
import UitklapPijl from "@/components/shared/UitklapPijl";

type Data = {
  route: { id: string; name: string; huis_logo?: string | null } | null;
  uitslag_vrijgegeven: boolean;
  teams: TeamAntwoorden[];
  wachtende_fotos: number;
};
type Weergave = "team" | "vraag" | "fotos";

// 📥 Alle antwoorden als bestand voor Excel (puntkomma's en een BOM, zodat Excel het meteen goed opent)
function downloadExcel(data: Data) {
  const cel = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const regels: string[][] = [["Team", "Score team", "Status", "Nr", "Punt", "Vraag", "Antwoord", "Goed antwoord", "Goed", "Punten", "Max"]];
  for (const t of [...data.teams].sort((a, b) => b.score - a.score)) {
    for (const r of [...t.rijen].sort((a, b) => a.punt_volgorde - b.punt_volgorde)) {
      const foto = r.vraag_type === "foto_opdracht";
      regels.push([
        t.naam, String(t.score), t.status === "voltooid" ? "Gefinisht" : "Onderweg", String(r.punt_volgorde + 1), r.punt_naam, r.vraag_tekst,
        foto ? "(foto)" : r.antwoord ?? "", r.juiste_antwoord ?? "",
        foto ? (r.foto_status === "goedgekeurd" ? "ja" : r.foto_status === "afgekeurd" ? "nee" : "te keuren") : r.is_correct ? "ja" : "nee",
        String(r.punten), String(r.max_punten),
      ]);
    }
    if (!t.rijen.length) regels.push([t.naam, String(t.score), t.status === "voltooid" ? "Gefinisht" : "Onderweg"]);
  }
  const tekst = "﻿" + regels.map((r) => r.map(cel).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([tekst], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `antwoorden-${(data.route?.name ?? "spel").replace(/[^\w-]+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// beperkt: helper van de spelleider, mag wel keuren maar niet de uitslag vrijgeven of het rapport openen
export default function AntwoordenOverzicht({ beperkt = false }: { beperkt?: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [weergave, setWeergave] = useState<Weergave>("team");
  // Ingeklapte of opengeklapte teams (zonder keuze: open als er iets te doen is)
  const [openTeams, setOpenTeams] = useState<Record<string, boolean>>({});
  // 🤏 Alleen wat aandacht vraagt (bijna goed of nog te keuren)
  const [alleenAandacht, setAlleenAandacht] = useState(false);

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

  const keurFoto = (fotoId: string, voortgangId: string, status: "goedgekeurd" | "afgekeurd", punten: number, opmerking = "") =>
    actie(voortgangId, () => fetch(`/api/admin/foto/${fotoId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, punten, opmerking }),
    }));

  async function ookGoed(ids: string[], tekst: string | null) {
    await actie("ook-goed", () => fetch("/api/admin/antwoorden/ook-goed", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, ook_goed_tekst: tekst }),
    }));
    toonMelding(`${ids.length} ${ids.length === 1 ? "antwoord" : "antwoorden"} goed gerekend`, "ok");
  }

  // Waarschuwing bij het vrijgeven: teams nog onderweg of foto's nog niet gekeurd
  const nogBezig = data?.teams.filter((t) => t.status === "actief").length ?? 0;
  const uitslagWaarschuwing = [
    nogBezig ? `${nogBezig} speler${nogBezig !== 1 ? "s" : ""} onderweg.` : "",
    data?.wachtende_fotos ? `${data.wachtende_fotos} foto${data.wachtende_fotos !== 1 ? "'s" : ""} niet gekeurd.` : "",
  ].filter(Boolean).join(" ");

  if (!data) return <LaadBlokjes aantal={4} hoogte={72} />;
  if (!data.route) return (
    <LeegScherm icoon="🗺️" knop={{ label: "🗺️ Naar routes", href: "/admin/routes" }}>Er is geen actieve route. Activeer eerst een route, dan zie je hier de antwoorden.</LeegScherm>
  );

  const aandacht = (r: AntwoordRij) => r.bijna_goed || r.foto_status === "wacht";
  const aantalBijna = data.teams.reduce((n, t) => n + t.rijen.filter((r) => r.bijna_goed).length, 0);
  const heeftFotos = data.teams.some((t) => t.rijen.some((r) => r.foto_pad));
  const isOpen = (t: TeamAntwoorden) => openTeams[t.sessie_id] ?? (alleenAandacht || t.rijen.some(aandacht));
  const zetAlles = (open: boolean) => setOpenTeams(Object.fromEntries(data.teams.map((t) => [t.sessie_id, open])));
  const teams = alleenAandacht ? data.teams.filter((t) => t.rijen.some(aandacht)) : data.teams;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Compacte strook (ook op de pc) in plaats van vier grote tegels */}
      <StatStrook vakken={[
        { icoon: "🗺️", waarde: data.route.name, label: "actieve route" },
        { icoon: "👫", waarde: data.teams.length, label: data.teams.length === 1 ? "speler" : "spelers" },
        { icoon: "📸", waarde: data.wachtende_fotos ?? 0, label: "foto's te keuren", letOp: !!data.wachtende_fotos },
        { icoon: data.uitslag_vrijgegeven ? "🏆" : "🔒", waarde: data.uitslag_vrijgegeven ? "Zichtbaar" : "Verborgen", label: "uitslag" },
      ]} />

      {/* Eén rij: weergave links, uitslag, Excel en rapport rechts */}
      <div className="actie-rij antw-balk">
        {data.teams.length > 0 && (
          <div className="punten-snel antw-tabs">
            <button type="button" className={`rl-knop${weergave === "team" ? " rl-knop--cyan" : ""}`} onClick={() => setWeergave("team")}>👫 Per team</button>
            <button type="button" className={`rl-knop${weergave === "vraag" ? " rl-knop--cyan" : ""}`} onClick={() => setWeergave("vraag")}>📊 Per vraag</button>
            {heeftFotos && (
              <button type="button" className={`rl-knop${weergave === "fotos" ? " rl-knop--cyan" : ""}`} onClick={() => setWeergave("fotos")}>
                📸 Foto&apos;s{data.wachtende_fotos ? ` (${data.wachtende_fotos})` : ""}
              </button>
            )}
          </div>
        )}
        <span className="antw-ruimte" style={{ flex: 1 }} />
        {data.teams.length > 0 && (
          <button type="button" className="rl-knop actie-knop" onClick={() => downloadExcel(data)} title="Alle antwoorden als bestand voor Excel">📥 Excel</button>
        )}
      {!beperkt && <>
        {data.uitslag_vrijgegeven ? (
          <button className="rl-knop actie-knop" disabled={bezig === "uitslag"} onClick={wisselUitslag}>🔒 Uitslag weer verbergen</button>
        ) : (
          <BevestigKnop venster gevaarlijk={false} icoon="🏆" titel="Uitslag vrijgeven?"
            className="rl-knop rl-knop--cyan actie-knop" disabled={bezig === "uitslag"} onBevestig={wisselUitslag}
            vraag={`Alle spelers zien dan de eindstand op hun finishscherm.${uitslagWaarschuwing ? " ⚠️ " + uitslagWaarschuwing : ""}`} ja="Ja, vrijgeven">
            🏆 Uitslag vrijgeven
          </BevestigKnop>
        )}
        {data.teams.length > 0 && (
          <UitslagDelen routeNaam={data.route.name} huisLogo={data.route.huis_logo ?? null} knopClass="rl-knop actie-knop" stand={(() => {
            // Plaats: hoogste score eerst; bij gelijke score de snelste (zoals de stand)
            const duur = (t: TeamAntwoorden) => (t.finished_at ? Date.parse(t.finished_at) : Date.now()) - (t.started_at ? Date.parse(t.started_at) : 0);
            const lijst = [...data.teams].sort((a, b) => b.score - a.score || duur(a) - duur(b));
            return lijst.map((t, i) => ({ naam: t.naam, icon: t.icon, score: t.score, plaats: i + 1 }));
          })()} />
        )}
        <a className="rl-knop actie-knop" href="/admin/rapport" target="_blank" rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
          title="Eindstand en per speler de vragen, items en gelopen route — als PDF te versturen">
          📄 Rapport (PDF)
        </a>
      </>}
      </div>

      {/* Wat doet Uitslag vrijgeven? (alleen zolang de uitslag nog verborgen is) */}
      {!beperkt && !data.uitslag_vrijgegeven && data.teams.length > 0 && (
        <div className="inst-uitleg uitslag-uitleg">
          🏆 <strong>Uitslag vrijgeven</strong>: tot dan zien teams die binnen zijn op hun telefoon <em>Even geduld…</em>, zodat niemand de stand al weet terwijl jij nog foto&apos;s keurt of teams onderweg zijn. Geef je hem vrij, dan zien alle teams de eindstand met het podium, worden open stemvragen afgerond en vervallen overgebleven items. Je kunt hem weer verbergen.
        </div>
      )}
      {weergave === "vraag" && <VraagStatistiek teams={data.teams} onOokGoed={ookGoed}
        onSluitStemming={async (puntId) => {
          await actie("stemming", () => fetch("/api/admin/stemming", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ punt_id: puntId }) }));
          toonMelding("Stemming gesloten: de punten zijn uitgedeeld", "ok");
        }} />}
      {weergave === "fotos" && <FotoGalerij teams={data.teams} bezig={bezig}
        onKeur={(fotoId, voortgangId, status, punten, opmerking) => keurFoto(fotoId, voortgangId, status, punten, opmerking)} />}

      {data.teams.length === 0 && (
        <LeegScherm icoon="📝" knop={{ label: "🏠 Naar het dashboard", href: "/admin" }}>Nog geen spelers aan het spelen. Zodra iemand een vraag beantwoordt, zie je dat hier.</LeegScherm>
      )}

      {weergave === "team" && data.teams.length > 0 && (
        <div className="antw-filterbalk">
          {aantalBijna > 0 || data.wachtende_fotos ? (
            <button type="button" className={`rl-knop${alleenAandacht ? " rl-knop--cyan" : ""}`} onClick={() => setAlleenAandacht((v) => !v)}
              title="Alleen de antwoorden die je nog moet bekijken">
              {alleenAandacht ? "✕ Alles tonen" : `🤏 Te bekijken: ${[aantalBijna ? `${aantalBijna} bijna goed` : "", data.wachtende_fotos ? `${data.wachtende_fotos} foto${data.wachtende_fotos === 1 ? "" : "'s"}` : ""].filter(Boolean).join(" · ")}`}
            </button>
          ) : <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>✅ Niets te bekijken</span>}
          <span style={{ flex: 1 }} />
          <button type="button" className="es-link" onClick={() => zetAlles(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><UitklapPijl open /> Alles open</button>
          <button type="button" className="es-link" onClick={() => zetAlles(false)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><UitklapPijl open={false} /> Alles dicht</button>
        </div>
      )}

      {weergave === "team" && teams.map((team) => {
        const open = isOpen(team);
        const rijen = alleenAandacht ? team.rijen.filter(aandacht) : team.rijen;
        const goed = team.rijen.filter((r) => r.vraag_type === "foto_opdracht" ? r.foto_status === "goedgekeurd" : r.is_correct).length;
        const fout = team.rijen.filter((r) => r.vraag_type === "foto_opdracht" ? r.foto_status === "afgekeurd" : !r.is_correct).length;
        const bijna = team.rijen.filter((r) => r.bijna_goed).length;
        const fotoWacht = team.rijen.filter((r) => r.foto_status === "wacht").length;
        return (
        <div key={team.sessie_id} className="pr-gem-card" style={{ marginBottom: 0 }}>
         <div className="pr-gem-card-inner antw-kaart" style={{ flexDirection: "column", alignItems: "stretch" }}>
          {/* Kop: tik om in of uit te klappen; dicht = alleen de telling */}
          <button type="button" className="antw-kop" onClick={() => setOpenTeams((o) => ({ ...o, [team.sessie_id]: !open }))} aria-expanded={open}>
            <span className="pr-gem-avatar" style={{ width: 40, height: 40, fontSize: "1.5rem" }}>{team.icon ?? "👫"}</span>
            <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "#fff" }}>{team.naam}</span>
              {team.rijen.length === 0
                ? <span className="antw-nog-niets" style={{ marginLeft: 0 }}>nog geen vragen beantwoord</span>
                : <span className="antw-telling">
                    <span style={{ color: "#4ADE80" }}>✓ {goed}</span> <span style={{ color: "#F87171" }}>✗ {fout}</span>
                    {bijna > 0 && <span style={{ color: "#FBBF24" }}> 🤏 {bijna} bijna goed</span>}
                    {fotoWacht > 0 && <span style={{ color: "#FBBF24" }}> 📸 {fotoWacht} te keuren</span>}
                  </span>}
            </span>
            <span className={`pr-gem-chip ${team.status === "voltooid" ? "pr-gem-chip--green" : "pr-gem-chip--cyan"}`}>
              {team.status === "voltooid" ? "🏁 Gefinisht" : "Onderweg"}
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "#FFE680" }}>{team.score} pt</span>
            {team.rijen.length > 0 && <UitklapPijl open={open} />}
          </button>
          {open && rijen.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rijen.map((r) => (
                <AntwoordRegel key={r.voortgang_id} rij={r} bezig={bezig}
                  onGoedkeuren={() => actie(r.voortgang_id, () => fetch(`/api/admin/antwoorden/${r.voortgang_id}`, { method: "POST" }))}
                  onFoto={(status, punten) => keurFoto(r.foto_id!, r.voortgang_id, status, punten)}
                />
              ))}
            </div>
          )}
         </div>
        </div>
        );
      })}
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
    : r.stem_open ? "#A78BFA" : r.is_correct ? "#4ADE80" : r.bijna_goed ? "#FBBF24" : "#F87171";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 10, background: r.bijna_goed ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.04)", borderLeft: `3px solid ${kleur}` }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: "0.82rem" }}>
        <div style={{ color: "var(--muted)", fontSize: "0.72rem" }}>{r.punt_naam}</div>
        <div style={{ color: "var(--ink)", fontWeight: 600 }}>{r.vraag_tekst}</div>
        {isFoto ? (
          r.foto_pad && <FotoMini pad={r.foto_pad} />
        ) : (
          <div style={{ marginTop: 3 }}>
            <span style={{ color: kleur, fontWeight: 700 }}>{r.stem_open ? "🗳️" : r.is_correct ? "✓" : r.bijna_goed ? "🤏" : "✗"} {r.antwoord ?? "—"}</span>
            {r.stem_open && <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}> · gestemd, stemming nog open</span>}
            {!r.is_correct && !r.stem_open && r.juiste_antwoord && (
              <span style={{ color: "var(--muted)" }}> · goed: {r.juiste_antwoord}</span>
            )}
            {r.bijna_goed && <span style={{ color: "#FBBF24", fontSize: "0.72rem" }}> · bijna goed (tikfout?)</span>}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, color: "var(--ink)", fontSize: "0.85rem" }}>
          {isFoto && r.foto_status === "wacht" ? `max ${r.max_punten}` : `${r.punten} / ${r.max_punten}`}
        </span>
        {!isFoto && r.kan_goedkeuren && (
          <button className={`rl-knop${r.bijna_goed ? " rl-knop--groen" : ""}`} disabled={bezig === r.voortgang_id} onClick={onGoedkeuren}
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

// Klein voorbeeld van de foto; tik voor groot
function FotoMini({ pad }: { pad: string }) {
  const src = useFotoUrl(pad);
  if (!src) return <div style={{ color: "var(--muted)", fontSize: "0.75rem", marginTop: 4 }}>Foto laden…</div>;
  return (
    <a href={src} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Ingestuurde foto" style={{ marginTop: 6, maxWidth: 220, maxHeight: 160, borderRadius: 8, objectFit: "cover", display: "block" }} />
    </a>
  );
}
