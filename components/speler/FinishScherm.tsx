"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formateerTijd, afstandTekst } from "@/lib/geo";
import type { LeaderboardEntry, SpelerLocatie } from "@/lib/types";
import type { SpeciaalItem } from "@/types/database";
import type { RouteWaarden } from "./SpeciaalItemLegende";
import SpeciaalItemPopup from "./SpeciaalItemPopup";
import StandRij from "./StandRij";
import Oorkonde from "./Oorkonde";
import PuzzelWoord from "./PuzzelWoord";
import { strooiConfetti } from "@/lib/confetti";
import Podium from "./Podium";
import UitslagOnthulling from "./UitslagOnthulling";
import BonusVraag from "./BonusVraag";
import KoFiKnop from "@/components/shared/KoFiKnop";
import UitslagDelen from "@/components/shared/UitslagDelen";
import { FINISH_THEMAS, huidigFinishThema, type FinishThemaSleutel } from "@/lib/finish-thema";

interface Props {
  groepNaam: string;
  // Voor de oorkonde
  teamIcoon: string | null;
  // 📸 Goedgekeurde groepsfoto bij de finish (anders het icoon)
  teamFoto?: string | null;
  routeNaam: string | null;
  score: number;
  tijdSeconden: number;
  distanceMeters: number;
  initLeaderboard: LeaderboardEntry[];
  // De eindstand is pas te zien als de beheerder de uitslag vrijgeeft (na het keuren van foto's)
  uitslagVrij: boolean;
  wachtendeFotos: number;
  // Route staat "items na de finish" toe en de uitslag is nog niet vrij
  itemsNaFinish: boolean;
  waarden: RouteWaarden;
  // Eigen logo van de organisatie (huisstijl): op de oorkonde en de uitslag
  huisLogo?: string | null;
  // 🎃 Seizoen of feestdag van vandaag (door de server gekozen, zodat server en browser hetzelfde tonen)
  themaSleutel?: FinishThemaSleutel;
  // Eigen emoji van een vrij thema (beheer → Seizoenen): komt in de vlaggetjes
  themaEmoji?: string | null;
}

const POLL_INTERVAL_MS = 10000;

export default function FinishScherm({ groepNaam, teamIcoon, teamFoto: beginFoto = null, routeNaam, score: initScore, tijdSeconden, distanceMeters, initLeaderboard, uitslagVrij, wachtendeFotos: beginWacht, itemsNaFinish, waarden, huisLogo = null, themaSleutel, themaEmoji = null }: Props) {
  const basisThema = FINISH_THEMAS[themaSleutel ?? huidigFinishThema()];
  const thema = themaEmoji
    ? { ...basisThema, versiering: [themaEmoji, themaEmoji, basisThema.versiering[2], basisThema.versiering[3]] as const }
    : basisThema;
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initLeaderboard);
  const [vrij, setVrij] = useState(uitslagVrij);
  const [score, setScore] = useState(initScore);
  const telOp = useTelOp(score);
  // 📸 De eigen selfie of groepsfoto bij de finish verschijnt zodra de organisatie hem goedkeurt (zonder herladen),
  // en het aantal foto's in de keuring telt mee af
  const [teamFoto, setTeamFoto] = useState<string | null>(beginFoto);
  const [wachtendeFotos, setWachtendeFotos] = useState(beginWacht);
  // Items die na de finish nog ingezet mogen worden (tot de uitslag vrij is)
  const [items, setItems] = useState<SpeciaalItem[]>([]);
  const [tegenstanders, setTegenstanders] = useState<{ session_id: string; teamnaam: string; gefinisht: boolean }[]>([]);
  const [doelNaFinish, setDoelNaFinish] = useState<string[]>([]);
  const [actiefItem, setActiefItem] = useState<SpeciaalItem | null>(null);
  const [itemMelding, setItemMelding] = useState<string | null>(null);

  async function haalItemsOp() {
    try {
      const [inv, loc] = await Promise.all([fetch("/api/speler/speciaal/inventaris"), fetch("/api/speler/locaties")]);
      if (inv.ok) setItems(await inv.json());
      if (loc.ok) {
        const { locaties, doelNaFinish: dnf } = await loc.json() as { locaties: SpelerLocatie[]; doelNaFinish?: string[] };
        setTegenstanders((locaties ?? []).map((l) => ({ session_id: l.session_id, teamnaam: l.teamnaam, gefinisht: l.gefinisht })));
        setDoelNaFinish(dnf ?? []);
      }
    } catch { /* verbindingsfout */ }
  }
  useEffect(() => {
    if (!itemsNaFinish) return;
    haalItemsOp();
    const t = setInterval(haalItemsOp, 10000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsNaFinish]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 🏆 Zodra de uitslag vrij is (ook als die binnenkomt terwijl de pagina open staat): één keer per toestel de
  // eigen plaats over het hele scherm, met confetti en fanfare voor de winnaar en een knipoog voor de rest
  const [onthulling, setOnthulling] = useState<{ plaats: number; aantal: number } | null>(null);
  useEffect(() => {
    if (!vrij || !leaderboard.length) return;
    const eigen = leaderboard.find((e) => e.is_eigen_team);
    if (!eigen) return;
    const sleutel = `pr_uitslag_gezien_${routeNaam ?? ""}_${groepNaam}_${tijdSeconden}`;
    try { if (localStorage.getItem(sleutel)) return; localStorage.setItem(sleutel, "1"); } catch { /* geen opslag: gewoon tonen */ }
    setOnthulling({ plaats: eigen.rank, aantal: leaderboard.length });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrij, leaderboard]);

  useEffect(() => {
    // 🎉 Confetti bij binnenkomst, in de kleuren van het seizoen: een knal en daarna een regen
    const kleuren = [...thema.kleuren, "#FFD23F", "#FFFFFF"];
    strooiConfetti({ aantal: 140, duurMs: 2600, knal: true, kleuren });
    const timer = setTimeout(() => strooiConfetti({ aantal: 120, duurMs: 3500, kleuren }), 900);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/speler/leaderboard");
        if (res.ok) {
          const data = await res.json();
          if (typeof data.score === "number") setScore(data.score);
          if (typeof data.vrijgegeven === "boolean") setVrij(data.vrijgegeven);
          if (typeof data.fotos_wacht === "number") setWachtendeFotos(data.fotos_wacht);
          // Elke keer een nieuwe tijdelijke link: alleen vervangen als het echt een andere foto is (anders knippert hij)
          if (typeof data.foto === "string") setTeamFoto((oud) => oud && oud.split("?")[0] === data.foto.split("?")[0] ? oud : data.foto);
          // Houd de laatste bekende staat als de server leeg teruggeeft (bijv. na reset)
          if (data.leaderboard?.length) setLeaderboard(data.leaderboard);
        }
      } catch { /* verbindingsfout */ }
    }, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(timer);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // thema ligt vast voor deze pagina (van de server)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // flexShrink 0: met overflow hidden krimpt dit vak anders tot de schermhoogte en is de rest niet te zien
  // (dan kun je niet scrollen)
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%", flexShrink: 0, position: "relative", overflow: "hidden", alignItems: "center" }}>

      {/* Inhoud */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "18px 16px 48px", width: "100%", maxWidth: 600 }}>

        {/* Twee schermen: vóór de uitslag het finishscherm (kop, cijfers, puzzelwoord, items, bonusvraag) en
            "wachten op de uitslag"; na het vrijgeven alleen de eindstand, met delen en terugkijken eronder */}
        {!vrij && <>
        {/* 🎉 Feestelijke kop in de stijl van het seizoen of de feestdag (lib/finish-thema.ts): stralen,
            geblokte finishrand, versiering van het thema, teamfoto of icoon in een gouden ring */}
        <div className="finish-held" style={{ "--thema-1": thema.kleuren[0], "--thema-2": thema.kleuren[1], "--thema-3": thema.kleuren[2], "--thema-basis": thema.basis } as React.CSSProperties}>
          <div className="finish-stralen" aria-hidden />
          <span className="finish-vlag finish-vlag--links" aria-hidden>{thema.versiering[0]}</span>
          <span className="finish-vlag finish-vlag--rechts" aria-hidden>{thema.versiering[1]}</span>
          <span className="finish-dwarrel finish-dwarrel--1" aria-hidden>{thema.versiering[2]}</span>
          <span className="finish-dwarrel finish-dwarrel--2" aria-hidden>{thema.versiering[3]}</span>
          <div className="finish-avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {teamFoto ? <img src={teamFoto} alt="" /> : <span>{teamIcoon ?? "🏆"}</span>}
          </div>
          <h1 className="finish-titel">Finish!</h1>
          <div className="finish-team" title={groepNaam}>{groepNaam}</div>
          <div className="finish-sub">{thema.tekst} 🎉</div>
        </div>

        {/* Score + tijd + afstand */}
        <div className="finish-stats">
          <StatKaart icoon="⭐" waarde={String(telOp)} label="punten" kleur="#FFD23F" />
          <StatKaart icoon="⏱️" waarde={formateerTijd(tijdSeconden)} label="speeltijd" kleur="#67E8F9" tabular />
          <StatKaart icoon="🚶" waarde={distanceMeters ? afstandTekst(distanceMeters) : "—"} label="afstand" kleur="#4ADE80" />
        </div>
        {/* Direct bij de score: is hij al definitief, en waarom wacht het team nog? */}
        {!vrij && (
          <div className="finish-status">
            ⏳ <strong>Voorlopige score</strong>
            {wachtendeFotos > 0 ? ` · ${wachtendeFotos} foto${wachtendeFotos !== 1 ? "'s" : ""} in de keuring` : " · wacht op de uitslag"}
          </div>
        )}

        {/* 🧩 Puzzelwoord raden voor bonuspunten (als de route er een heeft) */}
        <PuzzelWoord raden />
        </>}

        {/* Oorkonde, antwoorden en gelopen route pas als de spelleider de uitslag vrijgeeft: anders kan een team de
            antwoorden doorgeven aan teams die nog spelen. Tot dan een korte uitleg. */}
        {!vrij && (
          <div className="finish-na-uitslag">
            🔒 Na de uitslag: je <strong>oorkonde</strong>, alle <strong>antwoorden &amp; items</strong> en je <strong>gelopen route</strong>.
          </div>
        )}

        {/* Items na de finish: nog inzetten op teams die onderweg zijn, tot de uitslag vrij is */}
        {itemsNaFinish && !vrij && items.length > 0 && (
          <div style={{
            width: "100%", borderRadius: 16, padding: "14px 16px",
            background: "rgba(0,217,255,0.08)", border: "1px solid rgba(0,217,255,0.4)",
          }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "#67E8F9" }}>
              🎁 Je hebt nog items!
            </div>
            <p style={{ margin: "4px 0 10px", fontSize: "0.85rem", color: "var(--text)", lineHeight: 1.45 }}>
              Zet ze in op teams die nog onderweg zijn, zolang de uitslag nog niet bekend is.
              {!tegenstanders.some((t) => !t.gefinisht) && " Op dit moment is er niemand meer onderweg."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {items.map((it) => (
                <button key={it.id} onClick={() => setActiefItem(it)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px 6px 6px", borderRadius: 99,
                    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff",
                    fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                  }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/items/${it.type}.webp`} alt="" style={{ width: 30, height: 30 }} />
                  {it.name && it.name !== "Speciaal item" ? it.name : it.type.charAt(0).toUpperCase() + it.type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
        {itemMelding && (
          <div onClick={() => setItemMelding(null)} style={{
            width: "100%", borderRadius: 14, padding: "12px 14px", cursor: "pointer",
            background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.5)", color: "#BBF7D0", fontSize: "0.9rem",
          }}>
            {itemMelding} <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>(tik om te sluiten)</span>
          </div>
        )}
        {actiefItem && (
          <SpeciaalItemPopup
            item={actiefItem}
            waarden={waarden}
            andereSessies={tegenstanders.filter((t) => !t.gefinisht || doelNaFinish.includes(actiefItem.type))}
            onVerwerkt={(itemId, notificatie) => {
              setActiefItem(null);
              setItems((prev) => prev.filter((i) => i.id !== itemId));
              setItemMelding(notificatie ?? "✅ Item ingezet!");
              haalItemsOp();
            }}
            onSluit={() => setActiefItem(null)}
          />
        )}

        {/* ⚡ Bonusvraag: ook gefinishte teams doen mee, tot de uitslag vrij is */}
        {!vrij && <BonusVraag />}

        {onthulling && <UitslagOnthulling plaats={onthulling.plaats} aantal={onthulling.aantal} kleuren={[...thema.kleuren]}
          onSluit={() => { setOnthulling(null); document.getElementById("eindstand")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />}

        {/* Leaderboard; na het vrijgeven feestelijk: gouden lijst, stralen erachter, podium en de rijen schuiven binnen */}
        <div id="eindstand" className={vrij && leaderboard.length ? "eindstand-feest" : undefined} style={{ width: "100%" }}>
          {vrij && leaderboard.length > 0 && <div className="eindstand-stralen" aria-hidden />}
          <h2 className={vrij ? "eindstand-titel" : undefined} style={vrij ? undefined : { display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, marginBottom: 14, color: "#00d9ff" }}>
            <span style={{ fontSize: "2.2rem", lineHeight: 1 }}>🏆</span> {vrij ? <span className="eindstand-glans">Eindstand</span> : "Wachten op de uitslag"}
          </h2>
          {!vrij ? (
            <div style={{
              borderRadius: 16, padding: "18px 16px", textAlign: "center",
              background: "rgba(255,217,59,0.1)", border: "1px solid rgba(255,217,59,0.45)",
            }}>
              <div style={{ fontSize: "2rem", lineHeight: 1 }}>⏳</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#FFE680", marginTop: 8 }}>
                Even geduld…
              </div>
              <p style={{ margin: "6px 0 0", fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.5 }}>
                Zodra alle teams binnen zijn en de organisatie de foto&apos;s heeft gekeurd, verschijnt hier de eindstand.
                {wachtendeFotos > 0 && <><br />Jullie hebben nog {wachtendeFotos} foto{wachtendeFotos !== 1 ? "'s" : ""} in de keuring; de punten komen er dan bij.</>}
              </p>
            </div>
          ) : leaderboard.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Nog geen scores beschikbaar.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Podium stand={leaderboard} />
              <UitslagDelen routeNaam={routeNaam} huisLogo={huisLogo} knopStijl={{ width: "100%", fontSize: "0.95rem", padding: "13px 6px", borderRadius: 14, fontWeight: 800 }}
                stand={leaderboard.map((e) => ({ naam: e.display_name, icon: e.icon, foto: e.foto ?? null, score: e.score, plaats: e.rank, eigen: e.is_eigen_team }))} />
              {leaderboard.map((entry, i) => (
                <div key={`${entry.rank}-${entry.display_name}`} className={`eindstand-rij${entry.rank <= 3 ? ` eindstand-rij--${entry.rank}` : ""}`}
                  style={{ animationDelay: `${2.2 + i * 0.15}s` }}>
                  <StandRij entry={entry} />
                </div>
              ))}
            </div>
          )}
        </div>

        {vrij && <>
        {/* 📤 Onder de stand: de oorkonde delen en terugkijken */}
        <div className="finish-delen-kop">📤 Delen en terugkijken</div>
        <Oorkonde teamNaam={groepNaam} icoon={teamIcoon} foto={teamFoto} routeNaam={routeNaam} punten={score} seconden={tijdSeconden} meters={distanceMeters}
          plaats={leaderboard.find((e) => e.is_eigen_team)?.rank ?? null} aantalTeams={leaderboard.length} huisLogo={huisLogo} voorlopig={false} />

        {/* Direct onder de eindscore: antwoorden & items, en de gelopen route */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button
            className="btn btn-ghost"
            onClick={() => router.push("/speler/terugkijk")}
            style={{ flex: 1, fontSize: "0.9rem", padding: "12px 6px", borderRadius: 14 }}>
            📖 Antwoorden &amp; items
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => router.push("/speler/terugkijk/route")}
            style={{ flex: 1, fontSize: "0.9rem", padding: "12px 6px", borderRadius: 14 }}>
            🗺️ Gelopen route
          </button>
        </div>
        </>}

        {/* Live-indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: "0.75rem" }}>
          <span className="finish-live-stip" />
          {vrij ? "Eindstand wordt live bijgewerkt" : "Deze pagina ververst vanzelf"}
        </div>

        {/* Ko-fi */}
        <KoFiKnop />
      </div>
    </div>
  );
}

// ── StatKaart ──────────────────────────────────────────────────────────────────
function StatKaart({ icoon, waarde, label, kleur, tabular }: { icoon: string; waarde: string; label: string; kleur: string; tabular?: boolean }) {
  return (
    <div className="finish-stat" style={{ "--stat-kleur": kleur } as React.CSSProperties}>
      <div className="finish-stat-icoon" aria-hidden>{icoon}</div>
      <div className="finish-stat-waarde" style={{ fontVariantNumeric: tabular ? "tabular-nums" : undefined }}>{waarde}</div>
      <div className="finish-stat-label">{label}</div>
    </div>
  );
}

// Score die bij binnenkomst van 0 omhoog telt; latere wijzigingen (foto goedgekeurd) gaan meteen
function useTelOp(doel: number, ms = 1200): number {
  const [waarde, setWaarde] = useState(0);
  const eerste = useRef(true);
  useEffect(() => {
    if (!eerste.current || doel <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setWaarde(doel); return; }
    eerste.current = false;
    const start = performance.now();
    let frame = 0;
    const stap = (nu: number) => {
      const t = Math.min(1, (nu - start) / ms);
      setWaarde(Math.round(doel * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(stap);
    };
    frame = requestAnimationFrame(stap);
    return () => cancelAnimationFrame(frame);
  }, [doel, ms]);
  return waarde;
}
