"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { inlogUitHash } from "@/lib/qr-inlog";
import VolledigSchermKnop from "@/components/shared/VolledigSchermKnop";
import AutoVolledigScherm from "@/components/shared/AutoVolledigScherm";
import AppInstallatie from "@/components/shared/AppInstallatie";
import LinkInloggen from "@/components/shared/LinkInloggen";
import { strooiConfetti } from "@/lib/confetti";

function LoginForm() {
  const params = useSearchParams();
  const fout = params.get("fout");
  // Na een mislukte poging staat de naam al ingevuld; klopte de naam wel, dan alleen het wachtwoord opnieuw
  const vorigeNaam = params.get("naam") ?? "";
  const alleenWachtwoord = fout === "wachtwoord" && !!vorigeNaam;
  const foutTekst =
    fout === "wachtwoord"
      ? "Het wachtwoord klopt niet. Vul alleen het wachtwoord opnieuw in."
      : fout === "ongeldig"
      ? "Ongeldige naam of wachtwoord. Probeer het opnieuw."
      : fout === "leeg"
      ? "Vul je naam en wachtwoord in."
      : fout === "uitgeschakeld"
      ? "Dit account is uitgeschakeld. Neem contact op met de spelleider."
      : fout === "apparaat"
      ? "Dit team speelt al op een andere telefoon (of in een andere browser of de app). Log daar uit, of vraag de spelleider om de QR-code om in te loggen."
      : fout === "uitgelogd"
      ? "Je bent door de beheerder uitgelogd."
      : fout === "link-verlopen"
      ? "Deze link werkt niet meer (verlopen of ingetrokken). Vraag de spelleider om een nieuwe."
      : fout === "verlopen"
      ? "De tijd van je toegang is om. Vraag de spelleider om een nieuwe link."
      : null;

  const [toonWachtwoord, setToonWachtwoord] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [qrVerlopen, setQrVerlopen] = useState(false);
  // ⌨️ Naam en wachtwoord typen staat ingeklapt: scannen is de snelste weg. Open na een fout met naam of wachtwoord
  const [typOpen, setTypOpen] = useState(fout === "wachtwoord" || fout === "ongeldig" || fout === "leeg");

  // 📷 QR-code van het inlogkaartje: loginnaam en wachtwoord staan achter het #-teken → invullen en
  // meteen inloggen, zolang de code geldig is (48 uur). Daarna alleen de loginnaam invullen.
  // Het #-deel gaat eerst uit de adresbalk, zodat het wachtwoord niet in de geschiedenis blijft.
  useEffect(() => {
    const probeer = () => {
      const inlog = inlogUitHash(window.location.hash);
      const form = formRef.current;
      if (!inlog || !form) return;
      history.replaceState(null, "", window.location.pathname + window.location.search);
      (form.elements.namedItem("naam") as HTMLInputElement).value = inlog.login;
      setTypOpen(true);
      if (Date.now() > inlog.tot) { setQrVerlopen(true); setTimeout(() => (form.elements.namedItem("wachtwoord") as HTMLInputElement | null)?.focus(), 0); return; }
      (form.elements.namedItem("wachtwoord") as HTMLInputElement).value = inlog.wachtwoord;
      form.requestSubmit();
    };
    probeer();
    window.addEventListener("hashchange", probeer);
    return () => window.removeEventListener("hashchange", probeer);
  }, []);

  return (
    // Vanaf boven (niet gecentreerd): als het toetsenbord opent, schuift het logo niet onder de statusbalk
    <div className="pr-stage login-scherm" style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "16px",
      position: "relative",
      overflowY: "auto",
    }}>
      <div style={{ position: "absolute", top: "max(16px, env(safe-area-inset-top))", right: 16, zIndex: 5 }}>
        <VolledigSchermKnop />
      </div>

      {/* Zwevende sparkles */}
      <div className="pr-sparkle" style={{ width: 6, height: 6, top: "12%", left: "18%" }} />
      <div className="pr-sparkle" style={{ width: 4, height: 4, top: "22%", left: "75%", animationDelay: "1.2s" }} />
      <div className="pr-sparkle" style={{ width: 8, height: 8, top: "68%", left: "12%", animationDelay: "2s" }} />
      <div className="pr-sparkle" style={{ width: 5, height: 5, top: "75%", left: "82%", animationDelay: "0.6s" }} />

      {/* Zwevende decor-icoontjes */}
      <span className="pr-orb" style={{ top: "10%", left: "8%", animationDelay: "0.3s" }}>👻</span>
      <span className="pr-orb" style={{ top: "14%", right: "8%", animationDelay: "1.1s" }}>⭐</span>
      <span className="pr-orb" style={{ top: "78%", left: "9%", animationDelay: "0.8s" }}>💣</span>
      <span className="pr-orb" style={{ top: "80%", right: "10%", animationDelay: "1.6s" }}>🍌</span>

      {/* 🗺️ Vage stippelroute op de achtergrond, met een pinnetje dat erover loopt */}
      <svg className="login-route" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <path id="login-pad" d="M -20 640 C 80 560, 40 470, 140 430 S 300 470, 330 360 S 220 220, 300 150 S 420 60, 440 20"
          fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="4" strokeDasharray="2 14" strokeLinecap="round" />
        <g className="login-route-pin">
          <circle r="9" fill="#FFD23F" stroke="#fff" strokeWidth="3" />
          <animateMotion dur="14s" repeatCount="indefinite" rotate="0"><mpath href="#login-pad" /></animateMotion>
        </g>
      </svg>

      <div className="pr-logo-glow" />
      <div className="pr-logo-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/spellogo/vierkant.webp"
          alt="PointRush"
          className="login-logo login-logo--stuiter"
          style={{ display: "block", filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.55)) drop-shadow(0 0 30px rgba(255,217,59,0.25))" }}
        />
      </div>

      {/* 🎫 Het paneel ziet eruit als het inlogkaartje: stempel, scanknop bovenaan, een scheurlijn, typen eronder */}
      <div className="pr-panel login-ticket">
        <div className="pr-panel-inner">
          <span className="login-stempel" aria-hidden>PointRush</span>
          {foutTekst && (
            <div className="login-fout" role="alert">
              <span>⚠️</span>
              <span>{foutTekst}</span>
            </div>
          )}
          <LinkInloggen />
          <div className="login-scheur" aria-hidden />
          {!typOpen && (
            <button type="button" className="login-typ-knop" onClick={() => setTypOpen(true)}>⌨️ Of typ je naam en wachtwoord</button>
          )}
          {/* Altijd in de pagina (de QR van het kaartje vult hem in en verstuurt hem), ingeklapt tot je wilt typen */}
          <form ref={formRef} action="/api/auth/inloggen" method="post" className={`login-form${typOpen ? "" : " login-form--dicht"}`}
            onSubmit={() => strooiConfetti({ aantal: 70, duurMs: 1400, knal: true })}>

            <label htmlFor="naam" className="pr-field-label2">
              Naam
            </label>
            <input
              id="naam"
              name="naam"
              className="pr-field-input2"
              type="text"
              placeholder="bijv. speler1"
              defaultValue={vorigeNaam}
              required
              autoComplete="username"
              // Geen automatische hoofdletter (iPhone) of autocorrectie: de loginnaam is altijd kleine letters
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />

            <label htmlFor="wachtwoord" className="pr-field-label2">
              Wachtwoord
            </label>
            <div style={{ position: "relative", marginBottom: 14 }}>
              <input
                id="wachtwoord"
                name="wachtwoord"
                className="pr-field-input2"
                type={toonWachtwoord ? "text" : "password"}
                placeholder="••••••••"
                autoFocus={alleenWachtwoord}
                required
                autoComplete="current-password"
                // Ook als het wachtwoord zichtbaar is: geen automatische hoofdletter of autocorrectie
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={{ paddingRight: "44px", marginBottom: 0 }}
              />
              <button
                type="button"
                onClick={() => setToonWachtwoord((v) => !v)}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.45)", fontSize: "1.1rem", lineHeight: 1, padding: 0,
                }}
                className="wachtwoord-oog" aria-label={toonWachtwoord ? "Verberg wachtwoord" : "Toon wachtwoord"}
              >
                {toonWachtwoord ? "🙈" : "👁️"}
              </button>
            </div>

            {qrVerlopen && !foutTekst && (
              <div style={{ background: "rgba(245,158,11,0.15)", border: "1.5px solid rgba(252,211,77,0.45)", borderRadius: 12, padding: "8px 12px", fontSize: "0.82rem", color: "#FDE68A", marginBottom: 14 }}>
                ⏱️ De QR-code werkt niet meer (48 uur geldig). Vul het wachtwoord van je kaartje in.
              </div>
            )}

            <button type="submit" className="btn-premium--compact login-ga">
              🚀 GA SPELEN!
            </button>
          </form>
        </div>
      </div>

      {/* Android: als app installeren, dan opent PointRush voortaan volledig scherm */}
      <AppInstallatie toonKnop />

    </div>
  );
}

export default function LoginPagina() {
  return (
    <Suspense>
      <AutoVolledigScherm />
      <LoginForm />
    </Suspense>
  );
}
