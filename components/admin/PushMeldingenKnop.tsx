"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toonMelding } from "@/components/admin/Melding";

// Menu-item "🔔 Meldingen": pushmeldingen op dit toestel aan- of uitzetten (nieuwe foto, hulpvraag).
// Werkt ook als de app dicht is, en komt via de telefoon ook op een horloge.
const PUBLIEK = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

type Stand = "laden" | "aan" | "uit" | "geblokkeerd" | "niet-mogelijk" | "iphone-beginscherm" | "geen-sleutel";

function sleutelBytes(basis64: string): Uint8Array<ArrayBuffer> {
  const opgevuld = (basis64 + "=".repeat((4 - (basis64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = new Uint8Array(new ArrayBuffer(atob(opgevuld).length));
  Array.from(atob(opgevuld)).forEach((c, i) => { bytes[i] = c.charCodeAt(0); });
  return bytes;
}

function toestelNaam(): string {
  const ua = navigator.userAgent;
  return /iPhone/i.test(ua) ? "iPhone" : /iPad/i.test(ua) ? "iPad" : /Android/i.test(ua) ? "Android" : /Mac/i.test(ua) ? "Mac" : /Windows/i.test(ua) ? "Windows" : "Toestel";
}

export default function PushMeldingenKnop() {
  const [stand, setStand] = useState<Stand>("laden");
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const alsApp = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
      // Sleutel ontbreekt in deze versie van de app: in Vercel zetten en opnieuw bouwen (Redeploy)
      if (!PUBLIEK) { setStand("geen-sleutel"); return; }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // iPhone: pushmeldingen alleen als PointRush op het beginscherm staat
        setStand(ios && !alsApp ? "iphone-beginscherm" : "niet-mogelijk");
        return;
      }
      if (Notification.permission === "denied") { setStand("geblokkeerd"); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      const abo = await reg?.pushManager.getSubscription();
      setStand(abo ? "aan" : "uit");
    })().catch(() => setStand("niet-mogelijk"));
  }, []);

  async function zetAan() {
    setBezig(true);
    try {
      const toestemming = await Notification.requestPermission();
      if (toestemming !== "granted") { setStand(toestemming === "denied" ? "geblokkeerd" : "uit"); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const abo = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: sleutelBytes(PUBLIEK) });
      const res = await fetch("/api/admin/push", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...abo.toJSON(), toestel: toestelNaam() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).fout ?? "Aanmelden mislukt");
      setStand("aan");
      toonMelding("Meldingen staan aan op dit toestel", "ok");
    } catch (e) {
      toonMelding(e instanceof Error ? e.message : "Meldingen aanzetten mislukt", "fout");
    } finally {
      setBezig(false);
    }
  }

  async function zetUit() {
    setBezig(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const abo = await reg?.pushManager.getSubscription();
      if (abo) {
        await fetch("/api/admin/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: abo.endpoint }) });
        await abo.unsubscribe();
      }
      setStand("uit");
      toonMelding("Meldingen staan uit op dit toestel", "ok");
    } finally {
      setBezig(false);
    }
  }

  async function test() {
    setBezig(true);
    const res = await fetch("/api/admin/push", { method: "PUT" });
    const data = await res.json().catch(() => ({}));
    toonMelding(res.ok ? "Testmelding verstuurd: die komt zo binnen" : data.fout ?? "Testmelding mislukt", res.ok ? "ok" : "fout");
    setBezig(false);
  }

  const label = stand === "aan" ? "aan" : stand === "laden" ? "" : "uit";
  return (
    <>
      <button type="button" className="admin-nav-link" onClick={() => setOpen(true)} title="Pushmeldingen bij een nieuwe foto of hulpvraag">
        <span aria-hidden>{stand === "aan" ? "🔔" : "🔕"}</span> Meldingen
        {/* Klein bolletje i.p.v. tekst: past altijd in de smalle menuknop (groen = aan) */}
        {label && <span className={`menu-status menu-status--${stand === "aan" ? "aan" : "uit"}`} title={`Meldingen ${label}`} aria-label={`Meldingen ${label}`} />}
      </button>
      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 420 }}>
            <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div className="pr-gem-label">Op dit toestel</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>{stand === "aan" ? "🔔 Meldingen staan aan" : "🔕 Meldingen staan uit"}</div>
                </div>
                <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} title="Sluiten">✕</button>
              </div>
              <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.5, color: "var(--text)" }}>
                Bij een <strong>nieuwe foto</strong> of een <strong>hulpvraag</strong>, ook als de app dicht is (en op je horloge).
              </p>
              {stand === "iphone-beginscherm" && (
                <div className="melding melding-fout" style={{ margin: 0 }}>Op een iPhone werken meldingen alleen als PointRush op je beginscherm staat: Safari → deelknop → Zet op beginscherm. Open hem daarna vanaf het beginscherm en zet hier de meldingen aan.</div>
              )}
              {stand === "geblokkeerd" && (
                <div className="melding melding-fout" style={{ margin: 0 }}>Meldingen zijn geblokkeerd voor deze site. Zet ze aan in de instellingen van je browser of telefoon (bij PointRush → Meldingen) en probeer het opnieuw.</div>
              )}
              {stand === "geen-sleutel" && (
                <div className="melding melding-fout" style={{ margin: 0 }}>De sleutel voor meldingen ontbreekt in deze versie van de app. Zet NEXT_PUBLIC_VAPID_PUBLIC_KEY en VAPID_PRIVATE_KEY in Vercel en bouw de app opnieuw (Deployments → ⋯ → Redeploy).</div>
              )}
              {stand === "niet-mogelijk" && (
                <div className="melding melding-fout" style={{ margin: 0 }}>Deze browser ondersteunt geen pushmeldingen.</div>
              )}
              <div className="melding-knoppen">
                {stand === "uit" && <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, padding: "0 18px", fontWeight: 800 }} disabled={bezig} onClick={zetAan}>🔔 Aanzetten</button>}
                {stand === "aan" && <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, padding: "0 18px", fontWeight: 800 }} disabled={bezig} onClick={test}>📨 Test sturen</button>}
                {stand === "aan" && <button type="button" className="rl-knop rl-knop--rood" style={{ height: 44, padding: "0 18px", fontWeight: 800 }} disabled={bezig} onClick={zetUit}>🔕 Uitzetten</button>}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
