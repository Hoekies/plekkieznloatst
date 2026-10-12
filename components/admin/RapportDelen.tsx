"use client";

import { useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import { deeltekstAlles, deeltekstTeam } from "@/lib/deeltekst";

// Rapport als PDF-bestand maken en delen (WhatsApp via het deelmenu van telefoon of computer).
// Eerst "PDF maken", daarna "Versturen": het deelmenu mag alleen direct na een klik openen,
// en het maken van de PDF duurt een paar seconden.
type Doel = { sleutel: string; titel: string; bestand: string; selectors: string[] };

async function maakPdf(elementen: HTMLElement[]): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const B = 210, H = 297, MARGE = 10;  // vervolgpagina's: wat ruimte boven en onder
  let eerste = true;
  for (const el of elementen) {
    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, backgroundColor: "#1c0c45", logging: false,
      // Zoomknoppen van de kaart horen niet in de PDF
      ignoreElements: (n) => n.classList?.contains("leaflet-control-container") ?? false,
    });
    const pxPerMm = canvas.width / B;
    const schaal = canvas.width / el.getBoundingClientRect().width;
    // Plekken waar geknipt mag worden: vóór een blok, kop, tabelregel of item (nooit door een kaart heen)
    const elTop = el.getBoundingClientRect().top;
    const knippunten = [...el.querySelectorAll<HTMLElement>(".rapport-blok, h2, h3, tr, .rapport-item")]
      .map((n) => Math.round((n.getBoundingClientRect().top - elTop) * schaal))
      .filter((y) => y > 0)
      .sort((x, y) => x - y);

    let y = 0, eersteStuk = true;
    while (y < canvas.height - 2) {
      const boven = eersteStuk ? 0 : MARGE;
      const ruimte = Math.floor((H - boven - (eersteStuk ? 0 : MARGE)) * pxPerMm);
      let eind = Math.min(canvas.height, y + ruimte);
      if (eind < canvas.height) {
        // Laatste knippunt dat nog op deze pagina past (en niet te vroeg, anders blijft de pagina leeg)
        const knip = [...knippunten].reverse().find((k) => k <= eind && k > y + ruimte * 0.25);
        if (knip) eind = knip;
      }
      const stuk = document.createElement("canvas");
      stuk.width = canvas.width;
      stuk.height = eind - y;
      stuk.getContext("2d")!.drawImage(canvas, 0, -y);
      if (!eerste) pdf.addPage();
      eerste = false;
      pdf.setFillColor(28, 12, 69);
      pdf.rect(0, 0, B, H, "F");
      pdf.addImage(stuk.toDataURL("image/jpeg", 0.85), "JPEG", 0, boven, B, stuk.height / pxPerMm);
      y = eind;
      eersteStuk = false;
    }
  }
  return pdf.output("blob");
}

export default function RapportDelen({ routeNaam, teams }: { routeNaam: string; teams: { sessie_id: string; naam: string; icon: string | null }[] }) {
  const [bezig, setBezig] = useState<string | null>(null);
  const [klaar, setKlaar] = useState<Record<string, File>>({});
  const [perTeam, setPerTeam] = useState(false);

  const veilig = (t: string) => t.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const doelen: Doel[] = [
    { sleutel: "alles", titel: "Hele rapport", bestand: `PointRush-${veilig(routeNaam)}.pdf`, selectors: ["[data-rapport]"] },
    ...teams.map((t) => ({
      sleutel: t.sessie_id,
      titel: `${t.icon ?? "👥"} ${t.naam}`,
      bestand: `PointRush-${veilig(routeNaam)}-${veilig(t.naam)}.pdf`,
      // Per team: de eindstand, hun eigen verslag en het dankwoord
      selectors: ['[data-rapport="eindstand"]', `[data-rapport-team="${t.sessie_id}"]`, '[data-rapport="slot"]'],
    })),
  ];

  async function maak(d: Doel) {
    setBezig(d.sleutel);
    try {
      const elementen = d.selectors.flatMap((s) => [...document.querySelectorAll<HTMLElement>(s)]);
      const blob = await maakPdf(elementen);
      setKlaar((k) => ({ ...k, [d.sleutel]: new File([blob], d.bestand, { type: "application/pdf" }) }));
    } catch {
      toonMelding("PDF maken mislukt. Wacht tot de kaarten geladen zijn en probeer het opnieuw.", "fout");
    } finally {
      setBezig(null);
    }
  }

  function download(f: File) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url; a.download = f.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function verstuur(d: Doel) {
    const f = klaar[d.sleutel];
    if (!f) return;
    // Een leuke tekst erbij; per team afhankelijk van hun plek in de eindstand (teams staan op volgorde)
    const plek = teams.findIndex((t) => t.sessie_id === d.sleutel) + 1;
    const tekst = d.sleutel === "alles"
      ? deeltekstAlles(routeNaam)
      : deeltekstTeam(routeNaam, teams[plek - 1]?.naam ?? "jullie", plek, teams.length);
    if (navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f], text: tekst }); } catch { /* geannuleerd */ }
      return;
    }
    // Geen deelmenu met bestanden (bijv. Firefox): downloaden en WhatsApp openen om het bij te voegen
    download(f);
    window.open(`https://wa.me/?text=${encodeURIComponent(tekst + " (PDF is gedownload, voeg hem toe als bijlage)")}`, "_blank");
  }

  // Knoppen voor één PDF: eerst maken, daarna versturen of opslaan
  const knoppen = (d: Doel, label: string) => !klaar[d.sleutel] ? (
    <button className="rl-knop rl-knop--cyan" disabled={bezig !== null} onClick={() => maak(d)}>
      {bezig === d.sleutel ? "⏳ PDF maken…" : `📄 ${label}`}
    </button>
  ) : (
    <>
      <button className="rl-knop rl-knop--goud" onClick={() => verstuur(d)} title="Opent het deelmenu: kies WhatsApp">📲 Versturen</button>
      <button className="rl-knop" onClick={() => download(klaar[d.sleutel])} title="PDF opslaan">⬇️ Opslaan</button>
    </>
  );

  return (
    <div className="pr-gem-panel" style={{ width: "100%" }}>
      <span className="pr-corner-chip pr-badge pr-badge--orange">📤</span>
      <div className="pr-gem-panel-inner rapport-delen">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="pr-gem-label">Rapport delen</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#fff" }}>Als PDF via WhatsApp</div>
          </div>
          <button className="rl-knop" onClick={() => window.print()} title="Afdrukken via de browser">🖨️ Afdrukken</button>
        </div>

        {/* Hele rapport */}
        <div className="rapport-delen-rij">
          <span className="pr-gem-avatar" style={{ width: 46, height: 46, fontSize: "1.8rem" }}>🏆</span>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff" }}>Hele rapport</div>
            <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>Eindstand, alle teams en het dankwoord</div>
          </div>
          {knoppen(doelen[0], "PDF maken")}
        </div>

        {/* Per team */}
        <button className={`rl-knop${perTeam ? " rl-knop--cyan" : ""}`} style={{ alignSelf: "flex-start" }} onClick={() => setPerTeam((v) => !v)} aria-expanded={perTeam}>
          👥 PDF per team {perTeam ? "▾" : "▸"}
        </button>
        {perTeam && doelen.slice(1).map((d) => {
          const team = teams.find((t) => t.sessie_id === d.sleutel);
          return (
            <div key={d.sleutel} className="rapport-delen-rij">
              <span className="pr-gem-avatar" style={{ width: 46, height: 46, fontSize: "1.8rem" }}>{team?.icon ?? "👥"}</span>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "#fff" }}>{team?.naam}</div>
                <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>Eindstand, eigen verslag met kaart en dankwoord</div>
              </div>
              {knoppen(d, "PDF maken")}
            </div>
          );
        })}

        <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
          Wacht tot de kaarten geladen zijn. Bij 📲 Versturen kies je WhatsApp in het deelmenu.
        </div>
      </div>
    </div>
  );
}
