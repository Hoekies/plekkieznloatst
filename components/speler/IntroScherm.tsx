"use client";

import { useEffect, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { spelUitleg } from "@/lib/spelmodus-uitleg";
import type { RouteModus } from "@/types/database";
import { ontgrendelAudio, speelPuntBereikt } from "@/lib/sounds";
import { TEAM_ICONEN, ICONEN_IN_BEELD, schud, willekeurigIcoon } from "@/lib/team-iconen";
import { vraagKompas } from "@/lib/kompas";

type Fase = "profiel" | "melding" | "permissie" | "gereed" | "geweigerd" | "starten";

interface Props {
  modus: RouteModus | null;
  // Het spel viel weg door de beheerder: eigen spel gestopt/gereset, of de hele route gestopt
  melding?: "spel" | "route" | null;
  // 🎨 Huisstijl van de route: welkomstfoto als achtergrond en het logo van de organisatie
  welkomFoto?: string | null;
  huisLogo?: string | null;
}


export default function IntroScherm({ modus, melding = null, welkomFoto = null, huisLogo = null }: Props) {
  const router = useRouter();
  const [toonMelding, setToonMelding] = useState(!!melding);

  // Melding wegklikken; ook ?gestopt uit de adresbalk, zodat hij na verversen niet terugkomt
  function sluitMelding() {
    setToonMelding(false);
    router.replace("/speler");
  }
  const uitleg = spelUitleg(modus);
  const [fase, setFase] = useState<Fase>("profiel");
  const [fout, setFout] = useState("");
  const [teamnaam, setTeamnaam] = useState("");
  // Typt de speler de teamnaam (toetsenbord open)? Dan het logo weg en het venster bovenaan,
  // zodat het veld en de iconen boven het toetsenbord blijven
  const [typt, setTypt] = useState(false);
  // Het zichtbare stuk boven het toetsenbord (iOS schuift de pagina zelf omhoog): het venster komt daar
  // in het midden, in plaats van helemaal bovenaan onder de statusbalk
  const [zicht, setZicht] = useState<{ top: number; hoogte: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!typt || !vv) { setZicht(null); return; }
    const zet = () => setZicht({ top: vv.offsetTop, hoogte: vv.height });
    zet();
    vv.addEventListener("resize", zet); vv.addEventListener("scroll", zet);
    return () => { vv.removeEventListener("resize", zet); vv.removeEventListener("scroll", zet); };
  }, [typt]);
  const [gekozenIcono, setGekozenIcono] = useState<string | null>(null);
  const [gebruikteIconen, setGebruikteIconen] = useState<string[]>([]);
  // 🎭 Welke iconen er nu in beeld staan: een willekeurige keuze uit mensen, dieren en dingen (lib/team-iconen.ts)
  const [inBeeld, setInBeeld] = useState<string[]>([]);
  function nieuweKeuze(gebruikt: string[], houd: string | null) {
    const vrij = schud(TEAM_ICONEN.filter((i) => !gebruikt.includes(i) && i !== houd));
    setInBeeld(schud([...(houd ? [houd] : []), ...vrij.slice(0, ICONEN_IN_BEELD - (houd ? 1 : 0))]));
  }
  const [profielFout, setProfielFout] = useState("");
  const [profielBezig, setProfielBezig] = useState(false);

  // Haal reeds gebruikte iconen op en kies meteen een willekeurig vrij icoon
  useEffect(() => {
    let actief = true;
    (async () => {
      try {
        const res = await fetch("/api/speler/iconen");
        const data = res.ok ? await res.json() : { gebruikt: [] };
        if (!actief) return;
        const gebruikt: string[] = data.gebruikt ?? [];
        setGebruikteIconen(gebruikt);
        const icoon = willekeurigIcoon(gebruikt);
        setGekozenIcono(icoon);
        nieuweKeuze(gebruikt, icoon);
      } catch {
        if (!actief) return;
        const icoon = willekeurigIcoon();
        setGekozenIcono(icoon);
        nieuweKeuze([], icoon);
      }
    })();
    return () => { actief = false; };
  }, []);

  async function vraagLocatiePermissie() {
    if (!navigator?.geolocation) {
      setFase("geweigerd");
      return;
    }
    try {
      await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
        })
      );
      // Locatie gevonden: meteen starten (geen extra "Ga op pad"-scherm); bij een fout komt dat scherm met opnieuw proberen
      startSpel();
    } catch {
      setFase("geweigerd");
    }
  }

  async function startSpel() {
    setFase("starten");
    setFout("");
    try {
      const res = await fetch("/api/speler/sessie", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.fout ?? "Starten mislukt. Probeer opnieuw.");
        setFase("gereed");
        return;
      }
      router.push("/speler/kaart");
    } catch {
      setFout("Geen verbinding. Controleer je internet en probeer opnieuw.");
      setFase("gereed");
    }
  }

  async function slaProfielOp() {
    if (!teamnaam.trim() || !gekozenIcono) return;
    setProfielBezig(true);
    setProfielFout("");
    try {
      const res = await fetch("/api/speler/profiel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamnaam: teamnaam.trim(), icon: gekozenIcono }),
      });
      if (!res.ok) {
        const data = await res.json();
        setProfielFout(data.fout ?? "Opslaan mislukt.");
        if (res.status === 409) {
          setGebruikteIconen((prev) => [...prev, gekozenIcono]);
        }
        return;
      }
      setFase("melding");
    } catch {
      setProfielFout("Geen verbinding. Probeer opnieuw.");
    } finally {
      setProfielBezig(false);
    }
  }

  return (
    <div className={`pr-stage${welkomFoto ? " intro--foto" : ""}${huisLogo ? " intro--huislogo" : ""}`} style={{
      position: "fixed", zIndex: 200, left: 0, right: 0,
      ...(zicht ? { top: zicht.top, height: zicht.hoogte } : { top: 0, bottom: 0 }),
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: typt ? "flex-start" : "center",
      overflowY: "auto",
    }}>
      {/* Kaartafbeelding */}
      <img
        src={welkomFoto ?? "/intro-map.svg"}
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          // Eigen foto: bijna volle kracht, het belangrijkste deel (gezichten, onderwerp) bovenin
          objectFit: "cover", objectPosition: welkomFoto ? "center top" : undefined, opacity: welkomFoto ? 0.95 : 0.4,
          pointerEvents: "none",
        }}
      />

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        // Met een eigen foto: bovenin helder, naar onderen in de paarse speltint, zodat het venster leesbaar blijft
        background: welkomFoto
          ? "linear-gradient(to bottom, rgba(var(--o0),0) 0%, rgba(var(--o0),0.25) 30%, rgba(var(--o0),0.75) 58%, rgba(var(--o0),0.95) 100%)"
          : "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.82) 100%)",
        pointerEvents: "none",
      }} />

      {/* Zwevende sparkles + orbs (niet over een eigen foto heen) */}
      {!welkomFoto && <>
        <div className="pr-sparkle" style={{ width: 6, height: 6, top: "10%", left: "14%" }} />
        <div className="pr-sparkle" style={{ width: 4, height: 4, top: "20%", left: "80%", animationDelay: "1.2s" }} />
        <div className="pr-sparkle" style={{ width: 8, height: 8, top: "65%", left: "8%", animationDelay: "2s" }} />
        <span className="pr-orb" style={{ top: "8%", right: "10%", animationDelay: "0.5s" }}>⭐</span>
        <span className="pr-orb" style={{ top: "72%", left: "6%", animationDelay: "1.4s" }}>👻</span>
      </>}

      {/* Content */}
      <div style={{
        position: "relative",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 0,
        padding: "16px 28px",
        textAlign: "center",
        maxWidth: 380, width: "100%",
        // Tijdens het typen: midden in het zichtbare stuk (auto-marges: past het niet, dan blijft de bovenkant zichtbaar)
        ...(zicht ? { marginTop: "auto", marginBottom: "auto" } : {}),
      }}>
        {/* Logo */}
        {!typt && !huisLogo && <div className="pr-logo-glow" style={{ width: 200, height: 200 }} />}
        <div className="pr-logo-wrap" style={typt ? { display: "none" } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={huisLogo ?? "/spellogo/vierkant.webp"} alt={huisLogo ? "Logo" : "PointRush"} style={{
            width: "clamp(110px, 36vw, 170px)", objectFit: "contain", display: "block",
            filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.5)) drop-shadow(0 0 24px rgba(255,217,59,0.2))",
          }} />
        </div>

        {/* Profiel: teamnaam en icoon kiezen */}
        {fase === "profiel" && (
          <div className="pr-panel">
            <div className="pr-panel-inner" style={{ paddingTop: 24 }}>
              <label className="pr-field-label2">Teamnaam</label>
              <input
                className="pr-field-input2"
                placeholder="Bijv. Team Turbo"
                value={teamnaam}
                onChange={(e) => setTeamnaam(e.target.value)}
                maxLength={30}
                // "Klaar" op het toetsenbord sluit het toetsenbord; geen woordsuggesties of autocorrectie
                enterKeyHint="done"
                onFocus={() => setTypt(true)}
                onBlur={() => setTypt(false)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                autoCapitalize="words"
              />

              <label className="pr-field-label2" style={{ marginTop: 4 }}>Kies een icoon</label>
              {/* Vast raster van 4 bij 4 (15 iconen + 🔀), op elke telefoon hetzelfde */}
              <div className="icoon-raster">
                {inBeeld.map((icoon) => {
                  const inGebruik = gebruikteIconen.includes(icoon) && icoon !== gekozenIcono;
                  const geselecteerd = gekozenIcono === icoon;
                  return (
                    <button
                      key={icoon}
                      disabled={inGebruik}
                      onClick={() => setGekozenIcono(icoon)}
                      title={inGebruik ? "Al gekozen door een ander team" : undefined}
                      className={`pr-icon-chip${geselecteerd ? " pr-icon-chip--selected" : ""}${inGebruik ? " pr-icon-chip--disabled" : ""}`}
                    >
                      {icoon}
                    </button>
                  );
                })}
                {/* 🔀 Andere iconen laten zien (het gekozen icoon blijft staan) */}
                <button type="button" className="pr-icon-chip pr-icon-chip--schud" onClick={() => nieuweKeuze(gebruikteIconen, gekozenIcono)}
                  title="Andere iconen" aria-label="Andere iconen laten zien">🔀</button>
              </div>

              {profielFout && <p style={{ color: "#FCA5A5", fontSize: "0.85rem", margin: "0 0 14px" }}>{profielFout}</p>}
              <button
                className="btn-premium--compact"
                disabled={!teamnaam.trim() || !gekozenIcono || profielBezig}
                onClick={slaProfielOp}>
                {profielBezig ? "Opslaan…" : "DOORGAAN →"}
              </button>
            </div>
          </div>
        )}

        {/* Melding: GPS en geluid */}
        {fase === "melding" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
            <div className="pr-panel">
              <div className="pr-panel-inner" style={{ paddingTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Uitleg van de spelsoort die nu actief is */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left" }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{uitleg.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--pr-gold)", fontSize: "0.95rem", lineHeight: 1.35, marginBottom: 8 }}>
                      {uitleg.samenvatting}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
                      {uitleg.regels.map((regel) => (
                        <li key={regel} style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", lineHeight: 1.45 }}>
                          {regel}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {([["📍", "GPS locatie", uitleg.gpsUitleg], ["🔔", "Geluid", uitleg.geluidUitleg]] as const).map(([icoon, titel, tekst]) => (
                  <Fragment key={titel}>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left" }}>
                      <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{icoon}</span>
                      <div>
                        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff", fontSize: "0.95rem", marginBottom: 3 }}>{titel}</div>
                        <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem", lineHeight: 1.5 }}>{tekst}</div>
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>
            {/* Meteen een geluidje en een tril: zo merkt de speler of het geluid aan staat (en het geluid
                is ontgrendeld, wat op de iPhone een tik nodig heeft) */}
            <button className="btn-premium--compact" onClick={() => {
              ontgrendelAudio(); speelPuntBereikt(); vraagKompas();
              try { navigator.vibrate?.([120, 80, 120]); } catch { /* trillen niet mogelijk */ }
              setFase("permissie"); vraagLocatiePermissie();
            }}>
              OK, BEGREPEN →
            </button>
          </div>
        )}

        {/* Permissie ophalen */}
        {fase === "permissie" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 24 }}>
            <div className="loading-spinner" style={{ borderTopColor: "var(--pr-gold)" }} />
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", margin: 0 }}>
              Locatietoegang controleren…
            </p>
          </div>
        )}

        {/* Gereed om te starten */}
        {fase === "gereed" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", marginTop: 24 }}>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.95rem", margin: 0 }}>
              Locatie gevonden. Druk op de knop om te starten.
            </p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", margin: 0 }}>
              🔔 Hoorde je net een geluidje? Dan staat je geluid goed. Niets gehoord? Zet je telefoon niet op stil.
            </p>
            {fout && (
              <p style={{ color: "#FCA5A5", fontSize: "0.85rem", margin: 0 }}>{fout}</p>
            )}
            <button className="btn-premium--compact" onClick={startSpel}>
              GA OP PAD 🚀
            </button>
          </div>
        )}

        {/* Bezig met starten */}
        {fase === "starten" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 24 }}>
            <div className="loading-spinner" style={{ borderTopColor: "var(--pr-gold)" }} />
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.9rem", margin: 0 }}>
              Spel wordt gestart…
            </p>
          </div>
        )}

        {/* Locatie geweigerd */}
        {fase === "geweigerd" && (
          <div className="pr-panel">
            <div className="pr-panel-inner" style={{ paddingTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ color: "#FCA5A5", fontFamily: "var(--font-display)", fontWeight: 700, margin: 0, fontSize: "0.95rem" }}>
                Locatietoegang geweigerd
              </p>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.83rem", margin: 0, lineHeight: 1.55 }}>
                Dit spel kan niet gespeeld worden zonder locatietoegang.
                Sta locatietoegang toe in je browserinstellingen en laad de pagina opnieuw.
              </p>
              <button
                className="btn btn-ghost"
                style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: 4 }}
                onClick={() => window.location.reload()}>
                Pagina herladen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Melding: het spel is gestopt door de beheerder */}
      {toonMelding && melding && (
        <div onClick={sluitMelding} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(12,3,34,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 360 }}>
            <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "24px 20px 20px" }}>
              <div style={{ fontSize: "2.8rem", lineHeight: 1 }}>{melding === "route" ? "🛑" : "⏹️"}</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem", color: "#fff" }}>
                {melding === "route" ? "De route is gestopt" : "Je spel is gestopt"}
              </div>
              <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5, color: "rgba(255,255,255,0.85)" }}>
                {melding === "route"
                  ? "De beheerder heeft het spel beëindigd. Wacht tot er een nieuwe route klaarstaat."
                  : "De beheerder heeft je spel gestopt. Je kunt hieronder opnieuw beginnen."}
              </p>
              <button type="button" className="btn-premium--compact" onClick={sluitMelding} autoFocus style={{ marginTop: 6 }}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
