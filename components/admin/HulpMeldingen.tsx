"use client";

import { useEffect, useRef, useState } from "react";
import { speelDong } from "@/lib/sounds";

type Melding = { id: string; sessie_id: string; team: string; punt: string | null; sinds: string };

const POLL_MS = 5000;

function minutenGeleden(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? "net" : `${min} min geleden`;
}

// Op elk admin-scherm: een team meldt dat zijn volgende punt niet bereikbaar is
export default function HulpMeldingen() {
  const [meldingen, setMeldingen] = useState<Melding[]>([]);
  const [bezig, setBezig] = useState<string | null>(null);
  const gezienRef = useRef<Set<string>>(new Set());

  async function haalOp() {
    try {
      const res = await fetch("/api/admin/hulp");
      if (!res.ok) return;
      const lijst: Melding[] = await res.json();
      const nieuw = lijst.some((m) => !gezienRef.current.has(m.id));
      lijst.forEach((m) => gezienRef.current.add(m.id));
      if (nieuw) speelDong();
      setMeldingen(lijst);
    } catch { /* verbindingsfout */ }
  }

  useEffect(() => {
    haalOp();
    const timer = setInterval(haalOp, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  // Knipperende tabtitel zolang er iets openstaat, ook als het tabblad op de achtergrond staat
  useEffect(() => {
    if (meldingen.length === 0) return;
    const origineel = document.title;
    let aan = false;
    const timer = setInterval(() => {
      aan = !aan;
      document.title = aan ? `⚠️ (${meldingen.length}) Hulp nodig!` : origineel;
    }, 1000);
    return () => { clearInterval(timer); document.title = origineel; };
  }, [meldingen.length]);

  async function vrijgeven(m: Melding) {
    setBezig(m.id);
    const res = await fetch(`/api/admin/sessies/${m.sessie_id}/punt-vrijgeven`, { method: "POST" });
    if (!res.ok) {
      const { fout } = await res.json().catch(() => ({ fout: null }));
      alert(fout ?? "Vrijgeven mislukt");
    }
    setBezig(null);
    haalOp();
  }

  async function negeren(m: Melding) {
    setBezig(m.id);
    await fetch(`/api/admin/hulp/${m.id}`, { method: "PATCH" });
    setBezig(null);
    haalOp();
  }

  if (meldingen.length === 0) return null;

  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 3000,
      display: "flex", flexDirection: "column", gap: 10,
      width: "min(360px, calc(100vw - 32px))",
    }}>
      {meldingen.map((m) => (
        <div key={m.id} role="alert" style={{
          background: "linear-gradient(160deg, #c2410c 0%, #9a3412 100%)",
          border: "2px solid #ffd93b", borderRadius: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 24px rgba(255,138,0,0.6)",
          padding: "12px 14px", color: "#fff",
          animation: "pr-hulp-puls 1.6s ease-in-out infinite",
        }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", marginBottom: 2 }}>
            ⚠️ {m.team} kan een punt niet bereiken
          </div>
          <div style={{ fontSize: "0.82rem", opacity: 0.9, marginBottom: 10 }}>
            {m.punt ? <>Punt: <strong>{m.punt}</strong> · </> : null}{minutenGeleden(m.sinds)}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-premium--cyan" style={{ fontSize: "0.78rem", padding: "7px 12px", flex: 1 }}
              disabled={bezig === m.id} onClick={() => vrijgeven(m)}>
              ⏭️ Punt vrijgeven
            </button>
            <button className="btn btn-ghost" style={{ fontSize: "0.78rem", padding: "7px 12px", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
              disabled={bezig === m.id} onClick={() => negeren(m)}>
              Negeren
            </button>
          </div>
        </div>
      ))}
      <style>{`@keyframes pr-hulp-puls { 0%,100% { transform: scale(1) } 50% { transform: scale(1.02) } }`}</style>
    </div>
  );
}
