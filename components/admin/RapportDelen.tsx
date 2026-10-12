"use client";

import { useState } from "react";
import { toonMelding } from "@/components/admin/Melding";

// Rapport als PDF-bestand maken en delen (WhatsApp via het deelmenu van telefoon of computer).
// Eerst "PDF maken", daarna "Versturen": het deelmenu mag alleen direct na een klik openen,
// en het maken van de PDF duurt een paar seconden.
type Doel = { sleutel: string; titel: string; bestand: string; selectors: string[] };

async function maakPdf(elementen: HTMLElement[]): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const B = 210, H = 297;
  let eerste = true;
  for (const el of elementen) {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#1c0c45", logging: false });
    // Hoger dan een A4? Dan in stukken over meerdere pagina's
    const perPagina = Math.floor((canvas.width * H) / B);
    for (let y = 0; y < canvas.height; y += perPagina) {
      const stuk = document.createElement("canvas");
      stuk.width = canvas.width;
      stuk.height = Math.min(perPagina, canvas.height - y);
      stuk.getContext("2d")!.drawImage(canvas, 0, -y);
      if (!eerste) pdf.addPage();
      eerste = false;
      pdf.setFillColor(28, 12, 69);
      pdf.rect(0, 0, B, H, "F");
      pdf.addImage(stuk.toDataURL("image/jpeg", 0.85), "JPEG", 0, 0, B, (stuk.height * B) / canvas.width);
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
    const tekst = `🏁 PointRush — ${routeNaam}${d.sleutel === "alles" ? "" : ` · ${d.titel}`}`;
    if (navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f], text: tekst }); } catch { /* geannuleerd */ }
      return;
    }
    // Geen deelmenu met bestanden (bijv. Firefox): downloaden en WhatsApp openen om het bij te voegen
    download(f);
    window.open(`https://wa.me/?text=${encodeURIComponent(tekst + " (PDF is gedownload, voeg hem toe als bijlage)")}`, "_blank");
  }

  const rij = (d: Doel, groot = false) => (
    <div key={d.sleutel} style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {!groot && <span style={{ minWidth: 150, fontWeight: 700, color: "#fff", fontSize: "0.85rem" }}>{d.titel}</span>}
      {!klaar[d.sleutel] ? (
        <button className={`rl-knop${groot ? " rl-knop--cyan" : ""}`} disabled={bezig !== null} onClick={() => maak(d)}>
          {bezig === d.sleutel ? "⏳ PDF maken…" : groot ? "📄 PDF maken (hele rapport)" : "📄 PDF maken"}
        </button>
      ) : (
        <>
          <button className="rl-knop rl-knop--cyan" onClick={() => verstuur(d)} title="Opent het deelmenu: kies WhatsApp">📲 Versturen{groot ? " (hele rapport)" : ""}</button>
          <button className="rl-knop" onClick={() => download(klaar[d.sleutel])} title="PDF opslaan">⬇️ Opslaan</button>
        </>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {rij(doelen[0], true)}
        <button className={`rl-knop${perTeam ? " rl-knop--cyan" : ""}`} onClick={() => setPerTeam((v) => !v)} aria-expanded={perTeam}>
          👥 PDF per team
        </button>
      </div>
      {perTeam && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Per team: de eindstand, het eigen verslag met kaart en het dankwoord.</span>
          {doelen.slice(1).map((d) => rij(d))}
        </div>
      )}
      <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
        Wacht tot de kaarten geladen zijn. Bij 📲 Versturen kies je WhatsApp in het deelmenu.
      </span>
    </div>
  );
}
