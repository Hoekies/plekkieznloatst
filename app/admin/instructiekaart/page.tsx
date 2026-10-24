"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { elementNaarPng, downloadBestand } from "@/lib/delen";

// 🃏 Instructiekaart voor spelers: A5 staand, dubbel te vouwen. De stippellijn in het midden is de vouwlijn;
// geen blok loopt eroverheen. Boven: inloggen en de kaart. Onder: items en tips. De tekst volgt de
// spelersuitleg in de app (kort en in gewone woorden); het logo is dat van het seizoen.
const STAPPEN: [string, string][] = [
  ["📷", "Scan de QR-code op je kaartje: je bent meteen ingelogd"],
  ["🦊", "Kies een teamnaam en een icoon"],
  ["📍", "Zet locatie en geluid aan"],
  ["🚀", "Druk op “Op pad!”"],
];

const KAART: [string, string][] = [
  ["🔵", "Blauw punt = hier moet je heen"],
  ["🟠", "Start: loop 25 m langs de oranje stippellijn"],
  ["❗", "Oranje ! = je bent er: beantwoord de vraag"],
  ["✅", "Groen = punt gehaald"],
  ["🧩", "Puzzelwoord? Elke goede vraag = een letter"],
  ["ⓘ", "Oranje i-knop = uitleg van alles"],
];

const ITEMS: [string, string, string][] = [
  ["ster", "Ster", "meteen punten erbij"],
  ["verdubbeling", "Verdubbeling", "volgende goede antwoord telt dubbel"],
  ["radar", "Radar", "2 minuten de andere teams zien"],
  ["bom", "Bom", "ander team verliest punten"],
  ["spook", "Spook", "hun volgende punt verdwijnt even"],
  ["dief", "Dief", "pik punten van een ander team"],
  ["banaan", "Banaan", "hun volgende twee punten ruilen"],
  ["wissel", "Wissel", "ruil je score met een ander team"],
  ["vraagteken", "Vraagteken", "een gok: punten erbij of eraf"],
  ["plekzooi", "Plek zooi", "onzichtbare val: even stilstaan"],
];

const TIPS: [string, string][] = [
  ["🔔", "Klokslag? Een ander team valt je aan!"],
  ["⚠️", "Punt niet te bereiken? Tik op “Niet bereikbaar?”"],
  ["📡", "Geen bereik? Gewoon doorspelen"],
  ["🔴", "Rood puntenvlak = jullie staan in de min"],
];

export default function InstructiekaartPagina() {
  const kaartRef = useRef<HTMLDivElement>(null);
  const [bezig, setBezig] = useState(false);

  // Als afbeelding opslaan, bijvoorbeeld om via WhatsApp te sturen
  async function opslaan() {
    if (!kaartRef.current) return;
    setBezig(true);
    const f = await elementNaarPng(kaartRef.current, "PointRush-instructiekaart", 3).catch(() => null);
    setBezig(false);
    if (f) downloadBestand(f);
  }

  return (
    <>
      <style>{`
        .ik-vak { display: flex; justify-content: center; padding: 8px 0 24px; }
        .ik { width: 148mm; height: 210mm; box-sizing: border-box; position: relative; overflow: hidden; color: #f3eeff;
          background: radial-gradient(circle at 50% 0%, rgba(255,217,59,0.12), transparent 45%), linear-gradient(180deg, #3a1a73 0%, #22104f 50%, #0c0322 100%);
          font-family: var(--font); border-radius: 4mm; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          -webkit-print-color-adjust: exact; print-color-adjust: exact; display: grid; grid-template-rows: 1fr 1fr; }
        .ik-helft { box-sizing: border-box; padding: 6mm 7mm 5mm; display: flex; flex-direction: column; gap: 3mm; min-height: 0; }
        .ik-helft--onder { padding-top: 5mm; }
        /* Vouwlijn: stippellijn precies in het midden */
        .ik-vouw { position: absolute; left: 0; right: 0; top: 50%; border-top: 0.5mm dashed rgba(255,255,255,0.55); }
        .ik-vouw span { position: absolute; right: 4mm; top: -2.2mm; padding: 0 1.5mm; font-size: 2.4mm; color: rgba(255,255,255,0.7); background: #22104f; letter-spacing: 0.1em; text-transform: uppercase; }
        .ik-logo { display: block; height: 17mm; margin: 0 auto; object-fit: contain; }
        .ik-titel { align-self: center; padding: 1mm 7mm; border-radius: 999px; background: linear-gradient(180deg, #ff8a00, #e35d00);
          font-family: var(--font-display); font-weight: 800; font-size: 5.2mm; color: #fff; letter-spacing: 0.04em; box-shadow: 0 1mm 0 rgba(0,0,0,0.3); }
        .ik-rij { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; flex: 1; min-height: 0; }
        .ik-paneel { box-sizing: border-box; border: 0.35mm solid rgba(255,217,59,0.75); border-radius: 3mm; background: rgba(42,21,102,0.6);
          padding: 2.6mm 3mm; display: flex; flex-direction: column; gap: 1.6mm; min-height: 0; }
        .ik-kop { font-family: var(--font-display); font-weight: 800; font-size: 4.2mm; color: #fff; line-height: 1; }
        .ik-regel { display: flex; gap: 1.8mm; align-items: flex-start; font-size: 2.85mm; line-height: 1.3; }
        .ik-regel b { flex-shrink: 0; width: 4.2mm; height: 4.2mm; border-radius: 50%; background: #ffd93b; color: #3a1f80; font-size: 2.6mm;
          display: inline-flex; align-items: center; justify-content: center; }
        .ik-teken { flex-shrink: 0; width: 4.2mm; text-align: center; }
        .ik-items { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm 3mm; }
        .ik-item { display: flex; gap: 1.6mm; align-items: center; font-size: 2.65mm; line-height: 1.25; }
        .ik-item img { width: 6.4mm; height: 6.4mm; flex-shrink: 0; }
        .ik-item strong { display: block; font-size: 2.9mm; color: #fff; }
        .ik-sub { font-size: 2.7mm; line-height: 1.3; color: #d9cffb; }
        .ik-tips { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2mm 3mm; }
        .ik-slot { align-self: stretch; text-align: center; padding: 1.6mm; border-radius: 999px; background: linear-gradient(180deg, #ff8a00, #e35d00);
          font-family: var(--font-display); font-weight: 800; font-size: 4mm; color: #fff; letter-spacing: 0.03em; }
        @media print {
          @page { size: A5 portrait; margin: 0; }
          .admin-sidebar, .admin-mobile-topbar, .admin-uitlog-hoek, .admin-topbar { display: none !important; }
          html, body, .admin-shell, .admin-main { background: #fff !important; height: auto !important; overflow: visible !important; }
          .admin-content { padding: 0 !important; }
          .ik-vak { padding: 0; }
          .ik { border-radius: 0; box-shadow: none; }
        }
      `}</style>
      <div className="admin-topbar" style={{ gap: 12 }}>
        <Link href="/admin" className="btn btn-outline" style={{ fontSize: "0.82rem", padding: "6px 12px", flexShrink: 0 }}>← Terug</Link>
        <span className="admin-topbar-titel">Instructiekaart</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="rl-knop" onClick={opslaan} disabled={bezig}>{bezig ? "⏳ Bezig…" : "🖼️ Als afbeelding"}</button>
        <button type="button" className="rl-knop rl-knop--cyan" onClick={() => window.print()}>🖨️ Printen (A5)</button>
      </div>
      <div className="admin-content">
        <div className="ik-vak">
          <div className="ik" ref={kaartRef}>
            {/* Bovenste helft: inloggen en de kaart */}
            <div className="ik-helft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/spellogo/breed.webp" alt="PointRush" className="ik-logo" />
              <div className="ik-titel">ZO SPEEL JE!</div>
              <div className="ik-rij">
                <div className="ik-paneel">
                  <div className="ik-kop">In 4 stappen op pad</div>
                  {STAPPEN.map(([icoon, tekst], i) => (
                    <div key={tekst} className="ik-regel"><b>{i + 1}</b><span>{icoon} {tekst}</span></div>
                  ))}
                </div>
                <div className="ik-paneel">
                  <div className="ik-kop">Op de kaart</div>
                  {KAART.map(([teken, tekst]) => (
                    <div key={tekst} className="ik-regel"><span className="ik-teken">{teken}</span><span>{tekst}</span></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ik-vouw" aria-hidden><span>vouwlijn</span></div>

            {/* Onderste helft: items en tips */}
            <div className="ik-helft ik-helft--onder">
              <div className="ik-paneel">
                <div className="ik-kop">Items</div>
                <div className="ik-sub">Loop over een item om het te pakken. Tik onderin op het item om het te gebruiken.</div>
                <div className="ik-items">
                  {ITEMS.map(([type, naam, tekst]) => (
                    <div key={type} className="ik-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/items/${type}.webp`} alt="" />
                      <span><strong>{naam}</strong>{tekst}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ik-paneel">
                <div className="ik-kop">Tips</div>
                <div className="ik-tips">
                  {TIPS.map(([teken, tekst]) => (
                    <div key={tekst} className="ik-regel"><span className="ik-teken">{teken}</span><span>{tekst}</span></div>
                  ))}
                </div>
              </div>
              <div className="ik-slot">VEEL PLEZIER — EN PAK DIE PUNTEN!</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
