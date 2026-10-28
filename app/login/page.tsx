"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { inlogUitHash } from "@/lib/qr-inlog";
import VolledigSchermKnop from "@/components/shared/VolledigSchermKnop";
import AutoVolledigScherm from "@/components/shared/AutoVolledigScherm";
import AppInstallatie from "@/components/shared/AppInstallatie";
import LinkInloggen from "@/components/shared/LinkInloggen";

function LoginForm() {
  const params = useSearchParams();
  const fout = params.get("fout");
  const foutTekst =
    fout === "ongeldig"
      ? "Ongeldige naam of wachtwoord. Probeer het opnieuw."
      : fout === "leeg"
      ? "Vul je naam en wachtwoord in."
      : fout === "uitgeschakeld"
      ? "Dit account is uitgeschakeld. Neem contact op met de spelleider."
      : fout === "apparaat"
      ? "Dit account is al actief op een ander apparaat. Probeer het opnieuw zodra die sessie is afgesloten."
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
      if (Date.now() > inlog.tot) { setQrVerlopen(true); (form.elements.namedItem("wachtwoord") as HTMLInputElement).focus(); return; }
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

      <div className="pr-logo-glow" />
      <div className="pr-logo-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/spellogo/vierkant.webp"
          alt="PointRush"
          className="login-logo"
          style={{ display: "block", filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.55)) drop-shadow(0 0 30px rgba(255,217,59,0.25))" }}
        />
      </div>

      <div className="pr-panel">
        <div className="pr-panel-inner">
          <form ref={formRef} action="/api/auth/inloggen" method="post" style={{ display: "flex", flexDirection: "column" }}>

            <label htmlFor="naam" className="pr-field-label2">
              Naam
            </label>
            <input
              id="naam"
              name="naam"
              className="pr-field-input2"
              type="text"
              placeholder="bijv. speler1"
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

            {foutTekst && (
              <div style={{
                background: "rgba(239, 68, 68, 0.18)",
                border: "1.5px solid rgba(239, 68, 68, 0.4)",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: "0.82rem",
                color: "#FCA5A5",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                marginBottom: 14,
              }}>
                <span>⚠️</span>
                <span>{foutTekst}</span>
              </div>
            )}

            <button type="submit" className="btn-premium--compact">
              INLOGGEN →
            </button>
          </form>
          {/* In de geïnstalleerde app: inloggen met een link uit WhatsApp */}
          <LinkInloggen />
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
