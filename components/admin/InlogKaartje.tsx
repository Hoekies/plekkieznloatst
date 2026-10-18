"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";
import { toonMelding } from "@/components/admin/Melding";

import { waLink } from "@/lib/telefoon";

// telefoon: bekend nummer van het team; dan opent WhatsApp meteen die chat (waar dat kan)
export type Inlog = { login: string; wachtwoord: string; naam?: string | null; helper?: boolean; telefoon?: string | null };

export const SITE = "https://plekkieznloatst.vercel.app";

export function waTekst(i: Inlog) {
  if (i.helper) return `Hoi! Je bent helper bij PointRush 🎯\n${SITE}\n\nNaam: *${i.login}*\nWachtwoord: *${i.wachtwoord}*\n\nJe kunt foto's keuren en punten vrijgeven. Bedankt! René`;
  return `Hoi! Log in op PointRush 🎯\n${SITE}\n\nLoginnaam: *${i.login}*\nWachtwoord: *${i.wachtwoord}*\n\nVeel plezier! René`;
}

// Het inlogkaartje zelf: logo, QR-code naar de app, loginnaam en wachtwoord
export function InlogKaartje({ inlog, kaartRef }: { inlog: Inlog; kaartRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div className="kaartje" ref={kaartRef}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-breed.png" alt="PointRush" className="kaartje-logo" />
      <div className="kaartje-midden">
        <div className="kaartje-qr"><QRCodeCanvas value={SITE} size={96} /></div>
        <div className="kaartje-velden">
          <div className="kaartje-veld"><small>{inlog.helper ? "Naam" : "Loginnaam"}</small><b>{inlog.login}</b></div>
          <div className="kaartje-veld kaartje-veld--ww"><small>Wachtwoord</small><b>{inlog.wachtwoord}</b></div>
        </div>
      </div>
      <div className="kaartje-voet">Scan de code of ga naar <strong>{SITE.replace("https://", "")}</strong></div>
    </div>
  );
}

// Kaartjes één voor één omzetten naar een afbeelding (niet allemaal tegelijk)
let wachtrij: Promise<unknown> = Promise.resolve();
function naarAfbeelding(el: HTMLElement, naam: string): Promise<File | null> {
  const taak = wachtrij.then(async () => {
    const { default: html2canvas } = await import("html2canvas-pro");
    await document.fonts?.ready;
    await Promise.all([...el.querySelectorAll("img")].map((img) => img.decode().catch(() => undefined)));
    const canvas = await html2canvas(el, { scale: 3, backgroundColor: null, logging: false });
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    return blob ? new File([blob], naam, { type: "image/png" }) : null;
  }).catch(() => null);
  wachtrij = taak;
  return taak;
}

// Het kaartje als afbeelding, met de link als bijschrift. Op de telefoon neemt WhatsApp die meestal
// mee; op de computer laat WhatsApp de tekst weg, dan kan de link er los achteraan (reserveknop).
// Geeft terug of de reserveknop zinvol is.
async function versturen(inlog: Inlog, beeld: File | null): Promise<"link" | "klaar" | "geannuleerd"> {
  const tekst = waTekst(inlog);
  if (beeld && navigator.canShare?.({ files: [beeld] })) {
    try {
      await navigator.share({ files: [beeld], text: SITE });
      return "link";
    } catch (e) { if ((e as Error).name === "AbortError") return "geannuleerd"; }
  }
  // Geen deelmenu met afbeeldingen: kaartje downloaden en WhatsApp openen met de tekst (link erin)
  if (beeld) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(beeld);
    a.download = beeld.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toonMelding("Kaartje gedownload: voeg het in WhatsApp toe bij het bericht", "info");
  }
  window.open(waLink(tekst, inlog.telefoon), "_blank");
  return "klaar";
}

// Reserve: alleen de link naar de app (loginnaam en wachtwoord staan al op het kaartje).
// Via het deelmenu: de chat van net staat daar bovenaan.
async function stuurLink(telefoon?: string | null) {
  const tekst = SITE;
  // Nummer bekend: meteen naar die chat
  if (telefoon) { window.open(waLink(tekst, telefoon), "_blank"); return true; }
  if (navigator.share) {
    try { await navigator.share({ text: tekst }); return true; }
    catch (e) { if ((e as Error).name === "AbortError") return false; }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(tekst)}`, "_blank");
  return true;
}

// Kaartje met daaronder de enige verstuurknop: het kaartje als afbeelding, met de link als tekst erbij
export default function KaartjeVersturen({ inlog }: { inlog: Inlog }) {
  const ref = useRef<HTMLDivElement>(null);
  const [beeld, setBeeld] = useState<File | null>(null);
  // Na het kaartje: "link" = reserveknop voor de link tonen
  const [stap, setStap] = useState<"kaartje" | "link" | "klaar">("kaartje");

  useEffect(() => {
    let gestopt = false;
    setBeeld(null);
    setStap("kaartje");
    if (ref.current) naarAfbeelding(ref.current, `inlog-${inlog.login}.png`).then((f) => { if (!gestopt) setBeeld(f); });
    return () => { gestopt = true; };
  }, [inlog.login, inlog.wachtwoord, inlog.helper]);

  return (
    <div className="kaartje-blok">
      <InlogKaartje inlog={inlog} kaartRef={ref} />
      <div className="kaartje-acties">
        <button type="button" className="wa-knop" disabled={!beeld}
          onClick={async () => { const r = await versturen(inlog, beeld); if (r !== "geannuleerd") setStap(r); }}
          title="Het kaartje versturen, met de link eronder">
          <WhatsAppLogo /> {!beeld ? "Even geduld…" : stap === "kaartje" ? "WhatsApp" : "✓ Verstuurd · nog een keer"}
        </button>
      </div>
      {/* Reserve: op de computer laat WhatsApp de link onder het kaartje weg */}
      {stap === "link" && (
        <button type="button" className="kaartje-link-los" onClick={async () => { if (await stuurLink(inlog.telefoon)) setStap("klaar"); }}
          title="Alleen de link naar de app versturen (kies dezelfde chat, die staat bovenaan)">
          Link ontbreekt? Stuur hem erachteraan
        </button>
      )}
    </div>
  );
}
