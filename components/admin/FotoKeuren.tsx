"use client";

import { useEffect, useState } from "react";
import LaadBlokjes from "@/components/shared/LaadBlokjes";
import Venster, { VensterKop, vensterHoogte } from "@/components/shared/Venster";
import Icoon from "@/components/admin/Icoon";
import { verversBeheerStatus } from "@/components/admin/useBeheerStatus";

type Inzending = {
  id: string;
  foto_pad: string;
  teamnaam: string;
  punt_naam: string;
  max_punten: number;
  session_id: string;
  created_at: string;
};

const OPEN = "pr-foto-keuren";

// 📸 Keurvenster openen, vanaf elke beheerpagina (kopknop, spelstrook, spelleider, pushmelding)
export function openFotoKeuren() {
  window.dispatchEvent(new Event(OPEN));
}

// 📸 Foto's keuren: één venster voor het hele beheer, één foto tegelijk, groot in beeld. Na een keuze komt vanzelf
// de volgende. Sneltoetsen: G = goed, F = afkeuren, S = overslaan (komt achteraan). Staat één keer in de layout.
export default function FotoKeurVenster() {
  const [open, setOpen] = useState(false);
  const [inzendingen, setInzendingen] = useState<Inzending[] | null>(null);
  const [bezig, setBezig] = useState(false);
  const [puntenMap, setPuntenMap] = useState<Record<string, number>>({});
  // 💬 Opmerking voor het team (komt als bericht in hun app)
  const [opmerkingMap, setOpmerkingMap] = useState<Record<string, string>>({});

  async function haalOp() {
    const res = await fetch("/api/admin/foto").catch(() => null);
    if (res?.ok) setInzendingen((await res.json()).inzendingen ?? []);
    else setInzendingen((i) => i ?? []);
  }

  useEffect(() => {
    const opener = () => { setOpen(true); setInzendingen(null); haalOp(); };
    window.addEventListener(OPEN, opener);
    // Geopend vanuit de pushmelding "Nieuwe foto"
    if (new URLSearchParams(window.location.search).get("keuren") === "1") {
      opener();
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => window.removeEventListener(OPEN, opener);
  }, []);

  const inz = inzendingen?.[0];
  const punten = inz ? puntenMap[inz.id] ?? inz.max_punten : 0;

  async function beoordeel(status: "goedgekeurd" | "afgekeurd") {
    if (!inz || bezig) return;
    setBezig(true);
    try {
      await fetch(`/api/admin/foto/${inz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, punten, opmerking: opmerkingMap[inz.id] ?? "" }),
      });
      setInzendingen((prev) => (prev ?? []).filter((i) => i.id !== inz.id));
      verversBeheerStatus();
    } catch { /* verbindingsfout */ } finally {
      setBezig(false);
    }
  }
  function overslaan() {
    setInzendingen((prev) => (prev && prev.length > 1 ? [...prev.slice(1), prev[0]] : prev));
  }

  // ⌨️ G / F / S (niet tijdens typen in een veld)
  useEffect(() => {
    if (!open) return;
    function toets(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).closest("input, textarea")) return;
      const k = e.key.toLowerCase();
      if (k === "g") beoordeel("goedgekeurd");
      else if (k === "f") beoordeel("afgekeurd");
      else if (k === "s") overslaan();
    }
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  });

  if (!open) return null;
  return (
    <Venster onSluit={() => setOpen(false)} breedte={560} maxHoogte={96} donker={0.85} rand={12}>
      <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: vensterHoogte(96, 6), overflowY: "auto", padding: "16px 16px 14px" }}>
        <VensterKop label={<>📸 Foto&apos;s keuren{inzendingen?.length ? ` · nog ${inzendingen.length}` : ""}</>} titel={inz ? inz.teamnaam : inzendingen ? "Alles gekeurd" : "…"} onSluit={() => setOpen(false)} />

        {inzendingen === null ? (
          <LaadBlokjes aantal={2} hoogte={120} />
        ) : !inz ? (
          <p style={{ color: "var(--text)", textAlign: "center", margin: "12px 0" }}>Geen foto&apos;s die op keuring wachten. 🎉</p>
        ) : (
          <>
            <div style={{ fontSize: "0.84rem", color: "var(--text)" }}>
              📍 {inz.punt_naam} · {new Date(inz.created_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <FotoViewer key={inz.id} pad={inz.foto_pad} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
              <span style={{ fontSize: "0.86rem", color: "var(--text)" }}>Punten</span>
              <input type="number" min={0} max={inz.max_punten} className="form-input" style={{ width: 90, textAlign: "center", fontWeight: 800 }}
                value={punten} onChange={(e) => setPuntenMap((m) => ({ ...m, [inz.id]: Number(e.target.value) }))} />
              <span style={{ fontSize: "0.86rem", color: "var(--muted)" }}>/ {inz.max_punten}</span>
            </div>
            <input className="form-input" value={opmerkingMap[inz.id] ?? ""} maxLength={110}
              onChange={(e) => setOpmerkingMap((m) => ({ ...m, [inz.id]: e.target.value }))}
              placeholder="💬 Opmerking voor het team (mag leeg), bijv. Jullie staan er niet allemaal op" />
            <div className="keur-knoppen">
              <button type="button" className="rl-knop rl-knop--rood" disabled={bezig} onClick={() => beoordeel("afgekeurd")} title="Afkeuren (sneltoets F)"><Icoon naam="fout" /> Afkeuren</button>
              {inzendingen.length > 1 && <button type="button" className="rl-knop keur-overslaan" disabled={bezig} onClick={overslaan} title="Later keuren (sneltoets S)"><Icoon naam="volgende" /> Later</button>}
              <button type="button" className="rl-knop rl-knop--groen" disabled={bezig} onClick={() => beoordeel("goedgekeurd")} title="Goedkeuren (sneltoets G)">
                {bezig ? "Opslaan…" : <><Icoon naam="klaar" />{` Goed (+${punten})`}</>}
              </button>
            </div>
            <div className="keur-sneltoetsen alleen-pc">Sneltoetsen: <kbd>G</kbd> goed · <kbd>F</kbd> afkeuren · <kbd>S</kbd> later</div>
          </>
        )}
      </div>
    </Venster>
  );
}

// Laadt de foto via een signed URL
function FotoViewer({ pad }: { pad: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/foto/sign?pad=${encodeURIComponent(pad)}`)
      .then((r) => r.json())
      .then((d) => setSrc(d.url))
      .catch(() => { /* geen preview */ });
  }, [pad]);

  return (
    <div className="keur-foto">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Ingediende foto" style={{ width: "100%", maxHeight: vensterHoogte(55), objectFit: "contain", display: "block" }} />
      ) : (
        <div style={{ width: "100%" }}><LaadBlokjes aantal={1} hoogte={260} /></div>
      )}
    </div>
  );
}
