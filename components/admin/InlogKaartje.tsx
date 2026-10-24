"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";
import { toonMelding } from "@/components/admin/Melding";

import { waLink } from "@/lib/telefoon";
import { elementNaarPng, deelOfDownload } from "@/lib/delen";

// telefoon: bekend nummer van het team; dan opent WhatsApp meteen die chat (waar dat kan)
// link: link om direct in te loggen (zonder wachtwoord), met tot wanneer hij werkt
export type Inlog = {
  login: string; wachtwoord: string; naam?: string | null; helper?: boolean; telefoon?: string | null;
  link?: { url: string; geldig_tot: string } | null;
};

function totTekst(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const SITE = "https://plekkieznloatst.vercel.app";

// Het hele bericht: wat het team moet doen, met de directe link (als die er is), de site en de inlog
function waTekst(i: Inlog) {
  if (i.helper) return `Hoi! Je bent helper bij PointRush 🎯\n${SITE}\n\nNaam: *${i.login}*\nWachtwoord: *${i.wachtwoord}*\n\nJe kunt foto's keuren en punten vrijgeven. Bedankt! René`;
  if (i.link) {
    return [
      "Hoi! Doe mee met PointRush 🎯",
      "",
      `Ga naar ${SITE} en log in met:`,
      `Loginnaam: *${i.login}*`,
      `Wachtwoord: *${i.wachtwoord}*`,
      "",
      "📱 Staat PointRush als app op je telefoon? Kopieer dan de link hieronder en tik in de app op 🔗 Inloggen met link.",
      "",
      `👉 *Direct inloggen* (werkt tot ${totTekst(i.link.geldig_tot)}):`,
      i.link.url,
      "",
      "Veel plezier! René",
    ].join("\n");
  }
  return `Hoi! Doe mee met PointRush 🎯\n\nGa naar ${SITE} en log in met:\nLoginnaam: *${i.login}*\nWachtwoord: *${i.wachtwoord}*\n\nVeel plezier! René`;
}

// Eigen logo van de actieve route (huisstijl), één keer opgehaald voor alle kaartjes
let huisLogoBelofte: Promise<string | null> | null = null;
function useHuisLogo(): string | null {
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    huisLogoBelofte ??= fetch("/api/admin/huisstijl").then((r) => (r.ok ? r.json() : null)).then((d) => d?.logo ?? null).catch(() => null);
    let weg = false;
    huisLogoBelofte.then((l) => { if (!weg) setLogo(l); });
    return () => { weg = true; };
  }, []);
  return logo;
}

// Het inlogkaartje zelf: logo, QR-code, loginnaam en wachtwoord. Met een inloglink logt de QR-code
// meteen in (zonder typen); zonder link opent hij de inlogpagina.
function InlogKaartje({ inlog, kaartRef }: { inlog: Inlog; kaartRef?: React.Ref<HTMLDivElement> }) {
  const huisLogo = useHuisLogo();
  return (
    <div className="kaartje" ref={kaartRef}>
      <div className="kaartje-logos">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spellogo/breed.png" alt="PointRush" className="kaartje-logo" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {huisLogo && <img src={huisLogo} alt="" crossOrigin="anonymous" className="kaartje-huislogo" />}
      </div>
      <div className="kaartje-midden">
        <div className="kaartje-qr"><QRCodeCanvas value={inlog.link?.url ?? SITE} size={96} /></div>
        <div className="kaartje-velden">
          <div className="kaartje-veld"><small>{inlog.helper ? "Naam" : "Loginnaam"}</small><b>{inlog.login}</b></div>
          <div className="kaartje-veld kaartje-veld--ww"><small>Wachtwoord</small><b>{inlog.wachtwoord}</b></div>
        </div>
      </div>
      <div className="kaartje-voet">
        {inlog.link
          ? <>📷 Scan de code: je bent meteen ingelogd (tot {totTekst(inlog.link.geldig_tot)})</>
          : <>Scan de code of ga naar <strong>{SITE.replace("https://", "")}</strong></>}
      </div>
    </div>
  );
}

// Kaartjes één voor één omzetten naar een afbeelding (niet allemaal tegelijk)
let wachtrij: Promise<unknown> = Promise.resolve();
function naarAfbeelding(el: HTMLElement, naam: string): Promise<File | null> {
  const taak = wachtrij.then(async () => {
    return elementNaarPng(el, naam, 3);
  }).catch(() => null);
  wachtrij = taak;
  return taak;
}

// Het kaartje als afbeelding, met het hele bericht als bijschrift. Op de telefoon neemt WhatsApp dat
// meestal mee; op de computer laat WhatsApp de tekst weg, dan kan het bericht er los achteraan.
// Geeft terug of de reserveknop zinvol is.
async function versturen(inlog: Inlog, beeld: File | null): Promise<"link" | "klaar" | "geannuleerd"> {
  const tekst = waTekst(inlog);
  // Computer: WhatsApp maakt van "plaatje + tekst" via het deelmenu twee losse berichten. Daarom: kaartje op het
  // klembord en de chat openen met de tekst al ingevuld. Plak je het kaartje (Ctrl+V), dan wordt de tekst het
  // bijschrift eronder: één bericht, net als op de telefoon.
  const computer = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && window.matchMedia("(pointer: fine)").matches;
  if (beeld && computer && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ [beeld.type]: beeld })]);
      window.open(waLink(tekst, inlog.telefoon), "_blank");
      toonMelding("Kaartje gekopieerd: plak het in de chat met Ctrl+V, de tekst komt er als bijschrift onder", "info");
      return "klaar";
    } catch { /* klembord niet toegestaan: dan via het deelmenu */ }
  }
  if (beeld) {
    const uitkomst = await deelOfDownload(beeld, tekst);
    if (uitkomst === "gedeeld") return "link";
    if (uitkomst === "geannuleerd") return "geannuleerd";
    // Geen deelmenu met afbeeldingen: kaartje gedownload; WhatsApp openen met de tekst (link erin)
    toonMelding("Kaartje gedownload: voeg het in WhatsApp toe bij het bericht", "info");
  }
  window.open(waLink(tekst, inlog.telefoon), "_blank");
  return "klaar";
}

// Reserve: het bericht los erachteraan (via het deelmenu staat de chat van net bovenaan)
async function stuurLink(inlog: Inlog) {
  const tekst = waTekst(inlog);
  const telefoon = inlog.telefoon;
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
  }, [inlog.login, inlog.wachtwoord, inlog.helper, inlog.link?.url]);

  return (
    <div className="kaartje-blok">
      <InlogKaartje inlog={inlog} kaartRef={ref} />
      <div className="kaartje-acties">
        <button type="button" className="wa-knop" disabled={!beeld}
          onClick={async () => { const r = await versturen(inlog, beeld); if (r !== "geannuleerd") setStap(r); }}
          title="Het kaartje versturen, met het bericht (links en inlog) als bijschrift eronder">
          <WhatsAppLogo /> {!beeld ? "Even geduld…" : stap === "kaartje" ? "WhatsApp" : "✓ Verstuurd · nog een keer"}
        </button>
      </div>
      {/* Reserve: op de computer laat WhatsApp de tekst onder het kaartje weg */}
      {stap === "link" && (
        <button type="button" className="kaartje-link-los" onClick={async () => { if (await stuurLink(inlog)) setStap("klaar"); }}
          title="Het bericht met de links en de inlog los versturen (kies dezelfde chat, die staat bovenaan)">
          Tekst ontbreekt? Stuur het bericht erachteraan
        </button>
      )}
    </div>
  );
}
