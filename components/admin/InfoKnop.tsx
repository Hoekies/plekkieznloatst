"use client";

import { useEffect, useRef, useState } from "react";

// Knop ⓘ naast Uitloggen: handleiding voor de beheerder, instructiekaarten en Ko-fi
// klein = voorbeeldje in het paneel (snel), src = de kaart zelf om te openen of te printen
const KAARTEN = [
  { titel: "Spelers (A5)", src: "/handleiding.jpg", klein: "/kaarten/klein-spelers.webp" },
  { titel: "Route op volgorde", src: "/kaarten/route-op-volgorde.webp", klein: "/kaarten/klein-route-op-volgorde.webp" },
  { titel: "Verspreide route", src: "/kaarten/verspreid.webp", klein: "/kaarten/klein-verspreid.webp" },
];

export default function InfoKnop() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sluiten bij klikken ernaast of Esc
  useEffect(() => {
    if (!open) return;
    const klik = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", klik);
    window.addEventListener("keydown", toets);
    return () => { document.removeEventListener("mousedown", klik); window.removeEventListener("keydown", toets); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="btn btn-outline header-knop info-knop" onClick={() => setOpen((v) => !v)}
        aria-expanded={open} title="Uitleg, instructiekaarten en Ko-fi">
        <span className="info-knop-i" aria-hidden>i</span>
      </button>
      {open && (
        <div className="info-paneel">
          <a href="/admin/uitleg" className="info-regel" onClick={() => setOpen(false)}>
            <span style={{ fontSize: "1.6rem" }}>📖</span>
            <span>
              <strong>Handleiding voor de beheerder</strong>
              <span className="info-sub">Alles over routes, groepen, items en het spel</span>
            </span>
          </a>

          <div className="info-kop">🃏 Instructiekaarten</div>
          <div className="info-kaarten">
            {KAARTEN.map((k) => (
              <a key={k.src} href={k.src} target="_blank" rel="noopener noreferrer" className="info-kaart" title={`${k.titel} — openen om te bekijken of op te slaan`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={k.klein} alt={k.titel} loading="lazy" />
                <span>{k.titel}</span>
              </a>
            ))}
          </div>

          <a href="https://ko-fi.com/hoekies" target="_blank" rel="noopener noreferrer" className="info-kofi" title="Steun het project op Ko-fi">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ko-fi.png" alt="Ko-fi — Steun het project" />
          </a>
        </div>
      )}
    </div>
  );
}
