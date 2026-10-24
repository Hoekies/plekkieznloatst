"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/qr-inlog";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";
import Venster, { VensterKop } from "@/components/shared/Venster";
import { metVersie } from "@/lib/versie";
import Icoon from "@/components/admin/Icoon";

// Venster "Wat verstuur je?": vóór het versturen via WhatsApp kies je zelf wat er meegaat
// (tekst, uitleg beginscherm, afbeeldingen). Bestanden worden bij het openen alvast geladen:
// het deelmenu van de telefoon mag alleen direct na een klik openen.

const TEMPLATE_KEY = "pointrush_deel_template";
const KEUZE_KEY = "pointrush_deel_keuze";
const TEMPLATE_DEFAULT = "Hoi! Log in op PointRush via deze link 🎯\nhttps://plekkieznloatst.vercel.app\n\n🔑 Je loginnaam en wachtwoord krijg je zo in een apart bericht.\n\nVeel plezier! René";
// Vorige standaardteksten: wie die nog onthouden had, krijgt vanzelf de nieuwe
const OUDE_DEFAULTS = [
  "Hoi! Log in op PointRush via deze link 🎯\nhttps://plekkieznloatst.vercel.app",
  "Hoi! Log in op PointRush via deze link 🎯\nhttps://plekkieznloatst.vercel.app\nVeel plezier! René",
];

// Stap voor stap, vriendelijk uitgelegd. *tekst* wordt in WhatsApp vetgedrukt
const BEGINSCHERM_UITLEG = [
  "📲 *Zet PointRush als app op je telefoon*",
  "Dan open je het spel straks met één tik, op het hele scherm. Zo doe je dat:",
  "",
  "*iPhone*",
  "1. Tik op de link hierboven: PointRush opent in je browser.",
  "2. Tik op de deelknop (vierkantje met pijltje omhoog; in Safari onderin, in Chrome bovenin).",
  "3. Tik op *Zet op beginscherm* → *Voeg toe*.",
  "",
  "*Android*",
  "1. Tik op de link hierboven: PointRush opent in je browser.",
  "2. Tik op *Installeren* in het venster dat verschijnt.",
  "3. Zie je dat niet? Tik op het menu (⋮ of ☰) en kies *App installeren* of *Toevoegen aan startscherm*.",
  "",
  "Klaar! PointRush staat nu tussen je apps 🎉",
].join("\n");

// De spelerskaart (uitleg van het spel) die mee kan als afbeelding
const KAART = { titel: "Spelerskaart", src: metVersie("/handleiding.jpg"), klein: metVersie("/kaarten/klein-spelers.webp"), bestand: "PointRush-spelerskaart.jpg" };

type Keuze = { tekst: boolean; beginscherm: boolean; kaart: boolean };
const STANDAARD: Keuze = { tekst: true, beginscherm: true, kaart: true };

export default function WhatsAppVenster({ onSluit }: { onSluit: () => void }) {
  const [tekst, setTekst] = useState(TEMPLATE_DEFAULT);
  const [keuze, setKeuze] = useState<Keuze>(STANDAARD);
  const [kaartBestand, setKaartBestand] = useState<File | null>(null);

  // Laatste tekst en keuze onthouden (per browser)
  useEffect(() => {
    try {
      const opgeslagen = localStorage.getItem(TEMPLATE_KEY);
      setTekst(!opgeslagen || OUDE_DEFAULTS.includes(opgeslagen) ? TEMPLATE_DEFAULT : opgeslagen);
      const k = localStorage.getItem(KEUZE_KEY);
      if (k) { const { tekst: t = true, beginscherm = true, kaart = true } = JSON.parse(k); setKeuze({ tekst: t, beginscherm, kaart }); }
    } catch { /* geen opslag */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(KEUZE_KEY, JSON.stringify(keuze)); } catch { /* geen opslag */ } }, [keuze]);

  // De spelerskaart alvast ophalen
  useEffect(() => {
    fetch(KAART.src).then((r) => (r.ok ? r.blob() : null)).then((blob) => {
      if (blob) setKaartBestand(new File([blob], KAART.bestand, { type: "image/jpeg" }));
    }).catch(() => { /* dan gaat de link mee */ });
  }, []);

  const bericht = [keuze.tekst ? tekst.trim() : "", keuze.beginscherm ? BEGINSCHERM_UITLEG : ""].filter(Boolean).join("\n\n");
  const files = keuze.kaart && kaartBestand ? [kaartBestand] : [];
  const niksGekozen = !bericht && !keuze.kaart;

  function verstuur() {
    // Met afbeeldingen: het deelmenu van telefoon of computer (kies daar WhatsApp)
    if (files.length && navigator.canShare?.({ files })) {
      navigator.share({ text: bericht || undefined, files }).then(onSluit).catch(() => { /* geannuleerd */ });
      return;
    }
    const links = keuze.kaart ? `🖼️ ${KAART.titel}: ${SITE}${KAART.src}` : "";
    // Alleen tekst: ook via het deelmenu. Via een wa.me-link maakt WhatsApp op de computer
    // van emoji's als 🎯 een vraagteken; via het deelmenu blijven ze heel.
    if (navigator.share) {
      navigator.share({ text: [bericht, links].filter(Boolean).join("\n\n") }).then(onSluit).catch((e) => {
        if ((e as Error).name !== "AbortError") window.open(`https://wa.me/?text=${encodeURIComponent([bericht, links].filter(Boolean).join("\n\n"))}`, "_blank");
      });
      return;
    }
    // Geen deelmenu: WhatsApp met de tekst en links naar de afbeeldingen
    window.open(`https://wa.me/?text=${encodeURIComponent([bericht, links].filter(Boolean).join("\n\n"))}`, "_blank");
    onSluit();
  }

  const schakel = (aan: boolean) => ({
    padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, textAlign: "left" as const,
    border: `1px solid ${aan ? "rgba(37,211,102,0.8)" : "rgba(255,255,255,0.15)"}`,
    background: aan ? "rgba(37,211,102,0.15)" : "rgba(255,255,255,0.04)", color: "#fff",
    display: "flex", alignItems: "center", gap: 8,
  });

  return (
    <Venster onSluit={onSluit} breedte={560} maxHoogte={92}>
        <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "calc(92vh - 6px)", overflowY: "auto", padding: "18px 18px 16px" }}>
          <VensterKop label="💬 Versturen via WhatsApp" titel="Wat verstuur je?" onSluit={onSluit} />

          {/* Tekst */}
          <button type="button" style={schakel(keuze.tekst)} onClick={() => setKeuze((k) => ({ ...k, tekst: !k.tekst }))}>
            {keuze.tekst ? <Icoon naam="goed" /> : <Icoon naam="vierkant" />} <Icoon naam="mail" /> Berichttekst
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
            {keuze.beginscherm ? <Icoon naam="goed" /> : <Icoon naam="vierkant" />} <Icoon naam="delen" /> Uitleg: app op het beginscherm zetten
          </button>

          {/* De spelerskaart als afbeelding erbij */}
          <button type="button" style={schakel(keuze.kaart)} onClick={() => setKeuze((k) => ({ ...k, kaart: !k.kaart }))}>
            {keuze.kaart ? <Icoon naam="goed" /> : <Icoon naam="vierkant" />} <Icoon naam="spelerskaart" /> Spelerskaart (uitleg van het spel)
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={KAART.klein} alt="" style={{ marginLeft: "auto", height: 44, aspectRatio: "2 / 3", objectFit: "cover", borderRadius: 4, opacity: keuze.kaart ? 1 : 0.45 }} />
          </button>

          {/* Voorbeeld */}
          <div className="pr-gem-label" style={{ marginTop: 4 }}>Voorbeeld</div>
          <div style={{ padding: "10px 12px", borderRadius: 12, background: "#0b3b2e", border: "1px solid rgba(37,211,102,0.4)", color: "#e9fbe9", fontSize: "0.82rem", lineHeight: 1.45, whiteSpace: "pre-line" }}>
            {keuze.kaart && <div style={{ marginBottom: bericht ? 6 : 0, color: "#a7f3d0" }}>🖼️ {KAART.titel}</div>}
            {bericht ? metVet(bericht) : (keuze.kaart ? "" : "Kies hierboven wat je wilt versturen.")}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button type="button" className="wa-knop" style={{ height: 44, padding: "0 20px" }} disabled={niksGekozen} onClick={verstuur}>
              <WhatsAppLogo /> Versturen
            </button>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Met afbeeldingen opent het deelmenu: kies daar WhatsApp. Kan je browser geen afbeeldingen delen, dan gaan er links naar de afbeeldingen mee.
          </div>
        </div>
    </Venster>
  );
}

// *tekst* vetgedrukt tonen, zoals WhatsApp dat doet
function metVet(tekst: string) {
  return tekst.split(/(\*[^*\r\n]+\*)/g).map((deel, i) =>
    /^\*[^*\r\n]+\*$/.test(deel) ? <strong key={i}>{deel.slice(1, -1)}</strong> : <span key={i}>{deel}</span>);
}
