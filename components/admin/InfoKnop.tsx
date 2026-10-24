"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import VersieRegel from "@/components/admin/VersieRegel";
import KoFiKnop from "@/components/shared/KoFiKnop";
import { useSluitMetEsc } from "@/components/shared/Venster";

// Menu-item "Info & uitleg": handleiding voor de beheerder, instructiekaarten en Ko-fi in een venster
// klein = voorbeeldje in het venster (snel), src = de kaart zelf om te openen of te printen
// papier = formaat bij 🖨️ Printen
const KAARTEN = [
  { titel: "Spelers (A5)", src: "/handleiding.jpg", klein: "/kaarten/klein-spelers.webp", papier: "A5" },
  { titel: "Route op volgorde", src: "/kaarten/route-op-volgorde.webp", klein: "/kaarten/klein-route-op-volgorde.webp", papier: "A5" },
  { titel: "Verspreide route", src: "/kaarten/verspreid.webp", klein: "/kaarten/klein-verspreid.webp", papier: "A5" },
];

// 🖨️ Kaart printen: een eigen venster met alleen de kaart, staand op het juiste papier, zonder marges;
// de kaart past zo groot mogelijk op het vel. Printen start zodra het plaatje geladen is.
function printKaart(src: string, titel: string, papier: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${titel}</title>
<style>@page { size: ${papier} portrait; margin: 0; } html, body { margin: 0; height: 100%; background: #fff; }
body { display: flex; align-items: center; justify-content: center; } img { max-width: 100%; max-height: 100vh; object-fit: contain; }</style>
</head><body><img src="${new URL(src, window.location.origin).href}" alt=""></body></html>`);
  w.document.close();
  const img = w.document.querySelector("img");
  const print = () => { w.focus(); w.print(); };
  if (img?.complete) print(); else img?.addEventListener("load", print);
}

export default function InfoKnop() {
  const [open, setOpen] = useState(false);

  useSluitMetEsc(() => setOpen(false), open);

  return (
    <>
      <button type="button" className="admin-nav-link" onClick={() => setOpen(true)} title="Handleiding, instructiekaarten en Ko-fi">
        <span aria-hidden>ℹ️</span> Info &amp; uitleg
      </button>
      {open && createPortal(
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="info-paneel info-paneel--venster" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ flex: 1, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "#fff" }}>ℹ️ Info &amp; uitleg</span>
              <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} title="Sluiten">✕</button>
            </div>

            <a href="/admin/uitleg" className="info-regel" onClick={() => setOpen(false)}>
              <span style={{ fontSize: "1.6rem" }}>📖</span>
              <span>
                <strong>Handleiding voor de beheerder</strong>
                <span className="info-sub">Alles over routes, spelers, items en het spel</span>
              </span>
            </a>

            <div className="info-kop">🃏 Instructiekaarten</div>
            <div className="info-kaarten">
              {KAARTEN.map((k) => (
                <div key={k.src} className="info-kaart-vak">
                  <a href={k.src} target="_blank" rel="noopener noreferrer" className="info-kaart" title={`${k.titel} — openen om te bekijken of op te slaan`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={k.klein} alt={k.titel} loading="lazy" />
                    <span>{k.titel}</span>
                  </a>
                  <button type="button" className="rl-knop info-kaart-print" onClick={() => printKaart(k.src, k.titel, k.papier)} title={`Printen op ${k.papier}`}>🖨️ Printen</button>
                </div>
              ))}
            </div>

            <div className="info-kofi"><KoFiKnop /></div>
            <VersieRegel />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
