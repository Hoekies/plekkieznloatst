"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Venster "Wat verstuur je?": vóór het versturen via WhatsApp kies je zelf wat er meegaat
// (tekst, uitleg beginscherm, afbeeldingen). Bestanden worden bij het openen alvast geladen:
// het deelmenu van de telefoon mag alleen direct na een klik openen.

const TEMPLATE_KEY = "pointrush_deel_template";
const KEUZE_KEY = "pointrush_deel_keuze";
export const TEMPLATE_DEFAULT = "Hoi! Log in op PointRush via deze link 🎯\nhttps://plekkieznloatst.vercel.app";
const SITE = "https://plekkieznloatst.vercel.app";

const BEGINSCHERM_UITLEG = [
  "📲 Zet PointRush als app op je beginscherm (dat kan gewoon vanuit de link in WhatsApp):",
  "• Android (Chrome): tik op ⋮ rechtsboven → \"Toevoegen aan startscherm\" of \"App installeren\"",
  "• iPhone (Safari): tik op de deelknop (vierkantje met pijl omhoog) → \"Zet op beginscherm\"",
].join("\n");

const AFBEELDINGEN = [
  { sleutel: "spelers", titel: "Spelershandleiding", src: "/handleiding.jpg", klein: "/kaarten/klein-spelers.webp", bestand: "PointRush-handleiding.jpg" },
  { sleutel: "volgorde", titel: "Speluitleg route op volgorde", src: "/kaarten/route-op-volgorde.jpg", klein: "/kaarten/klein-route-op-volgorde.webp", bestand: "PointRush-route-op-volgorde.jpg" },
  { sleutel: "verspreid", titel: "Speluitleg verspreide route", src: "/kaarten/verspreid.jpg", klein: "/kaarten/klein-verspreid.webp", bestand: "PointRush-verspreide-route.jpg" },
] as const;

type Keuze = { tekst: boolean; beginscherm: boolean; afbeeldingen: string[] };
const STANDAARD: Keuze = { tekst: true, beginscherm: true, afbeeldingen: ["spelers"] };

export default function WhatsAppVenster({ onSluit }: { onSluit: () => void }) {
  const [tekst, setTekst] = useState(TEMPLATE_DEFAULT);
  const [keuze, setKeuze] = useState<Keuze>(STANDAARD);
  const [bestanden, setBestanden] = useState<Record<string, File>>({});

  // Laatste tekst en keuze onthouden (per browser)
  useEffect(() => {
    try {
      setTekst(localStorage.getItem(TEMPLATE_KEY) ?? TEMPLATE_DEFAULT);
      const k = localStorage.getItem(KEUZE_KEY);
      if (k) setKeuze({ ...STANDAARD, ...JSON.parse(k) });
    } catch { /* geen opslag */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(KEUZE_KEY, JSON.stringify(keuze)); } catch { /* geen opslag */ } }, [keuze]);

  // Alle afbeeldingen alvast ophalen
  useEffect(() => {
    for (const a of AFBEELDINGEN) {
      fetch(a.src).then((r) => (r.ok ? r.blob() : null)).then((blob) => {
        if (blob) setBestanden((b) => ({ ...b, [a.sleutel]: new File([blob], a.bestand, { type: "image/jpeg" }) }));
      }).catch(() => { /* dan gaat de link mee */ });
    }
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") onSluit(); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [onSluit]);

  const gekozen = AFBEELDINGEN.filter((a) => keuze.afbeeldingen.includes(a.sleutel));
  const bericht = [keuze.tekst ? tekst.trim() : "", keuze.beginscherm ? BEGINSCHERM_UITLEG : ""].filter(Boolean).join("\n\n");
  const files = gekozen.map((a) => bestanden[a.sleutel]).filter((f): f is File => !!f);
  const niksGekozen = !bericht && !gekozen.length;

  function wissel(a: string) {
    setKeuze((k) => ({ ...k, afbeeldingen: k.afbeeldingen.includes(a) ? k.afbeeldingen.filter((x) => x !== a) : [...k.afbeeldingen, a] }));
  }

  function verstuur() {
    // Met afbeeldingen: het deelmenu van telefoon of computer (kies daar WhatsApp)
    if (files.length && navigator.canShare?.({ files })) {
      navigator.share({ text: bericht || undefined, files }).then(onSluit).catch(() => { /* geannuleerd */ });
      return;
    }
    // Zonder deelmenu met bestanden: WhatsApp met de tekst en links naar de afbeeldingen
    const links = gekozen.map((a) => `🖼️ ${a.titel}: ${SITE}${a.src}`).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent([bericht, links].filter(Boolean).join("\n\n"))}`, "_blank");
    onSluit();
  }

  const schakel = (aan: boolean) => ({
    padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, textAlign: "left" as const,
    border: `1px solid ${aan ? "rgba(37,211,102,0.8)" : "rgba(255,255,255,0.15)"}`,
    background: aan ? "rgba(37,211,102,0.15)" : "rgba(255,255,255,0.04)", color: "#fff",
    display: "flex", alignItems: "center", gap: 8,
  });

  return createPortal(
    <div onClick={onSluit} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 560, maxHeight: "92vh" }}>
        <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "calc(92vh - 6px)", overflowY: "auto", padding: "18px 18px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div className="pr-gem-label">Versturen via WhatsApp</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>Wat verstuur je?</div>
            </div>
            <button type="button" className="editor-paneel-sluit" onClick={onSluit} title="Sluiten">✕</button>
          </div>

          {/* Tekst */}
          <button type="button" style={schakel(keuze.tekst)} onClick={() => setKeuze((k) => ({ ...k, tekst: !k.tekst }))}>
            {keuze.tekst ? "✅" : "⬜"} ✉️ Berichttekst
          </button>
          {keuze.tekst && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <textarea className="form-textarea" spellCheck lang="nl" rows={3} value={tekst} style={{ width: "100%", fontSize: "0.86rem" }}
                onChange={(e) => { setTekst(e.target.value); try { localStorage.setItem(TEMPLATE_KEY, e.target.value); } catch { /* geen opslag */ } }} />
              <button type="button" onClick={() => { setTekst(TEMPLATE_DEFAULT); try { localStorage.setItem(TEMPLATE_KEY, TEMPLATE_DEFAULT); } catch { /* */ } }}
                style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--muted)", fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline" }}>
                Standaardtekst terugzetten
              </button>
            </div>
          )}

          <button type="button" style={schakel(keuze.beginscherm)} onClick={() => setKeuze((k) => ({ ...k, beginscherm: !k.beginscherm }))}>
            {keuze.beginscherm ? "✅" : "⬜"} 📲 Uitleg: app op het beginscherm zetten
          </button>

          {/* Afbeeldingen */}
          <div className="pr-gem-label" style={{ marginTop: 4 }}>Afbeeldingen</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {AFBEELDINGEN.map((a) => {
              const aan = keuze.afbeeldingen.includes(a.sleutel);
              return (
                <button key={a.sleutel} type="button" onClick={() => wissel(a.sleutel)}
                  style={{ ...schakel(aan), flexDirection: "column", alignItems: "stretch", padding: 6, gap: 4, fontSize: "0.72rem", textAlign: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.klein} alt="" style={{ width: "100%", aspectRatio: "2 / 3", objectFit: "cover", borderRadius: 6, opacity: aan ? 1 : 0.45 }} />
                  <span>{aan ? "✅ " : ""}{a.titel}</span>
                </button>
              );
            })}
          </div>

          {/* Voorbeeld */}
          <div className="pr-gem-label" style={{ marginTop: 4 }}>Voorbeeld</div>
          <div style={{ padding: "10px 12px", borderRadius: 12, background: "#0b3b2e", border: "1px solid rgba(37,211,102,0.4)", color: "#e9fbe9", fontSize: "0.82rem", lineHeight: 1.45, whiteSpace: "pre-line" }}>
            {gekozen.length > 0 && <div style={{ marginBottom: bericht ? 6 : 0, color: "#a7f3d0" }}>🖼️ {gekozen.map((a) => a.titel).join(" · ")}</div>}
            {bericht || (gekozen.length ? "" : "Kies hierboven wat je wilt versturen.")}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="rl-knop" style={{ height: 44, padding: "0 18px" }} onClick={onSluit}>Annuleren</button>
            <button type="button" disabled={niksGekozen} onClick={verstuur}
              style={{ height: 44, padding: "0 20px", borderRadius: 11, border: "none", background: niksGekozen ? "rgba(37,211,102,0.35)" : "#25D366",
                color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: niksGekozen ? "default" : "pointer" }}>
              📲 Versturen
            </button>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Met afbeeldingen opent het deelmenu: kies daar WhatsApp. Kan je browser geen afbeeldingen delen, dan gaan er links naar de afbeeldingen mee.
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
