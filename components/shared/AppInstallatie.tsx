"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { detecteerInAppBrowser } from "@/components/shared/InAppBrowserWaarschuwing";

// Registreert de service worker (nodig om als app te installeren) en vraagt bij het openen of je
// PointRush als app wilt installeren.
// - Android: een website mag het installeren niet zelf starten, de speler tikt op "Installeren".
// - iPhone: Apple kent geen installatievraag; we leggen uit hoe je hem op het beginscherm zet.
// "Later" wordt een week onthouden; op Android blijft de knop op het inlogscherm beschikbaar.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const LATER_KEY = "pointrush_installeren_later";
const WEEK = 7 * 24 * 60 * 60 * 1000;

function onlangsLater(): boolean {
  try { return Date.now() - Number(localStorage.getItem(LATER_KEY) ?? 0) < WEEK; } catch { return false; }
}

// iPhone/iPad in de browser (dus nog niet vanaf het beginscherm geopend)
function iPhoneInBrowser(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const alsApp = (navigator as Navigator & { standalone?: boolean }).standalone === true
    || window.matchMedia("(display-mode: standalone)").matches;
  return ios && !alsApp && !detecteerInAppBrowser();
}

export default function AppInstallatie({ toonKnop = false }: { toonKnop?: boolean }) {
  const [verzoek, setVerzoek] = useState<InstallEvent | null>(null);
  const [vraag, setVraag] = useState<"android" | "iphone" | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => { /* niet erg */ });
    if (toonKnop && iPhoneInBrowser() && !onlangsLater()) setVraag("iphone");
    const vang = (e: Event) => {
      e.preventDefault();
      setVerzoek(e as InstallEvent);
      if (toonKnop && !onlangsLater()) setVraag("android");
    };
    const klaar = () => { setVerzoek(null); setVraag(null); };
    window.addEventListener("beforeinstallprompt", vang);
    window.addEventListener("appinstalled", klaar);
    return () => { window.removeEventListener("beforeinstallprompt", vang); window.removeEventListener("appinstalled", klaar); };
  }, [toonKnop]);

  async function installeer() {
    if (!verzoek) return;
    setVraag(null);
    await verzoek.prompt();
    await verzoek.userChoice.catch(() => null);
    setVerzoek(null);
  }
  function later() {
    setVraag(null);
    try { localStorage.setItem(LATER_KEY, String(Date.now())); } catch { /* geen opslag */ }
  }

  if (!toonKnop) return null;
  return (
    <>
      {verzoek && (
        <button type="button" className="app-installeer-knop" data-geen-volledig onClick={installeer}>
          📲 Installeer als app — volledig scherm, zonder balken
        </button>
      )}
      {vraag && createPortal(
        <div onClick={later} data-geen-volledig style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(12,3,34,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 360, position: "relative" }}>
            <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "22px 20px 18px" }}>
              <div style={{ fontSize: "2.6rem", lineHeight: 1 }}>📲</div>
              {vraag === "android" ? (
                <>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", color: "#fff" }}>PointRush als app installeren?</div>
                  <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.45, color: "rgba(255,255,255,0.8)" }}>
                    Dan staat hij tussen je apps en speel je op het volledige scherm, zonder balken.
                  </p>
                  <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
                    <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, padding: "0 20px", fontWeight: 800 }} onClick={installeer}>Installeren</button>
                    <button type="button" className="rl-knop" style={{ height: 44, padding: "0 20px" }} onClick={later}>Later</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", color: "#fff" }}>Zet PointRush op je beginscherm</div>
                  <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.45, color: "rgba(255,255,255,0.8)" }}>
                    Dan opent hij als een app, zonder de balken van de browser.
                  </p>
                  <ol className="ios-stappen">
                    <li>Tik op de deelknop <DeelIcoon /> <span style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem" }}>(Safari: onderin · Chrome: bovenin naast het adres)</span></li>
                    <li>Scroll omlaag en kies <strong>Zet op beginscherm</strong></li>
                    <li>Tik op <strong>Voeg toe</strong> en open PointRush daarna vanaf je beginscherm</li>
                  </ol>
                  <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
                    <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, padding: "0 20px", fontWeight: 800 }} onClick={later}>Begrepen</button>
                    <button type="button" className="rl-knop" style={{ height: 44, padding: "0 20px" }} onClick={later}>Later</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// De deelknop van Safari: vierkantje met een pijl omhoog
function DeelIcoon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5AC8FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      aria-label="deelknop" style={{ verticalAlign: "-4px", marginLeft: 2 }}>
      <path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" />
      <polyline points="8 6 12 2 16 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}
