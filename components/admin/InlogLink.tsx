"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import { waLink, toonTelefoon } from "@/lib/telefoon";

const DUUR: { uren: number; label: string }[] = [
  { uren: 4, label: "4 uur" },
  { uren: 12, label: "½ dag" },
  { uren: 24, label: "1 dag" },
  { uren: 48, label: "2 dagen" },
];

export function tijdTekst(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function waLinkTekst(url: string, geldigTot: string) {
  return `Hoi! Tik op de link om PointRush te openen 🎯 Je hoeft niet in te loggen.\n${url}\n\nDe link werkt tot ${tijdTekst(geldigTot)}.\n\nVeel plezier! René`;
}

// "🔗 Link zonder wachtwoord": het team logt in met alleen een link, voor een gekozen tijd.
// Daarna wordt het team uitgelogd. De link werkt binnen die tijd vaker (één telefoon per team).
export default function InlogLinkSectie({ spelerId, toegangTot, telefoon, onGewijzigd }: {
  spelerId: string; toegangTot?: string | null; telefoon?: string | null; onGewijzigd?: () => void;
}) {
  const [uren, setUren] = useState(12);
  const [bezig, setBezig] = useState(false);
  const [link, setLink] = useState<{ url: string; geldig_tot: string } | null>(null);
  const actief = !!toegangTot && new Date(toegangTot).getTime() > Date.now();

  async function maak() {
    setBezig(true);
    const res = await fetch(`/api/admin/groepen/${spelerId}/link`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uren }),
    });
    const data = await res.json().catch(() => ({}));
    setBezig(false);
    if (!res.ok) { toonMelding(data.fout ?? "Link maken mislukt", "fout"); return; }
    setLink({ url: data.url, geldig_tot: data.geldig_tot });
  }

  async function intrekken() {
    const res = await fetch(`/api/admin/groepen/${spelerId}/link`, { method: "DELETE" });
    if (!res.ok) { toonMelding((await res.json().catch(() => ({}))).fout ?? "Intrekken mislukt", "fout"); return; }
    toonMelding("Links ingetrokken: het team wordt binnen een halve minuut uitgelogd", "ok");
    setLink(null);
    onGewijzigd?.();
  }

  if (link) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <div style={{ fontSize: "0.82rem", color: "var(--muted)", textAlign: "center" }}>
          Werkt tot <strong style={{ color: "#FFE680" }}>{tijdTekst(link.geldig_tot)}</strong>. Scannen kan ook:
        </div>
        <div className="kaartje-qr"><QRCodeCanvas value={link.url} size={140} /></div>
        <div className="kaartje-acties" style={{ width: "100%", gap: 8 }}>
          <a className="wa-knop" href={waLink(waLinkTekst(link.url, link.geldig_tot), telefoon)} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, height: 44 }} title={telefoon ? `Naar ${toonTelefoon(telefoon)}` : undefined}>
            <WhatsAppLogo /> WhatsApp
          </a>
          <button type="button" className="rl-knop" style={{ height: 44 }}
            onClick={() => navigator.clipboard?.writeText(link.url).then(() => toonMelding("Link gekopieerd", "ok")).catch(() => toonMelding("Kopiëren lukte niet", "fout"))}>
            📋 Kopiëren
          </button>
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)", textAlign: "center" }}>Verstuur hem nu: de link is later niet meer te zien.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
        Het team opent de app met alleen deze link, zonder loginnaam en wachtwoord. Na de gekozen tijd wordt het team uitgelogd.
      </div>
      {actief && (
        <div className="link-actief">
          <span style={{ flex: 1, minWidth: 0 }}>🔗 Ingelogd via een link tot <strong>{tijdTekst(toegangTot!)}</strong></span>
          <BevestigKnop venster icoon="🔗" titel="Links intrekken en het team uitloggen?" vraag="" ja="Ja, intrekken"
            onBevestig={intrekken} className="rl-knop rl-knop--rood">Intrekken</BevestigKnop>
        </div>
      )}
      <div>
        <label className="form-label">Hoe lang geldig?</label>
        <div className="punten-snel">
          {DUUR.map((d) => (
            <button key={d.uren} type="button" className={`rl-knop${uren === d.uren ? " rl-knop--cyan" : ""}`} onClick={() => setUren(d.uren)}>{d.label}</button>
          ))}
        </div>
      </div>
      <button type="button" className="rl-knop rl-knop--cyan" style={{ height: 44, fontWeight: 800 }} disabled={bezig} onClick={maak}>
        {bezig ? "Bezig…" : "🔗 Link maken"}
      </button>
    </div>
  );
}
