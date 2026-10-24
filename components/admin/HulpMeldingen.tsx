"use client";

import { useEffect, useRef, useState } from "react";
import { speelDong } from "@/lib/sounds";
import { useBeheerStatus, verversBeheerStatus, type HulpMelding } from "@/components/admin/useBeheerStatus";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";


function minutenGeleden(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  return min < 1 ? "net" : `${min} min geleden`;
}

// Op elk admin-scherm: een team meldt dat zijn volgende punt niet bereikbaar is. De meldingen komen uit de
// gedeelde bron (useBeheerStatus); de knipperende tabtitel regelt TabTeller.
export default function HulpMeldingen() {
  const { hulp: meldingen } = useBeheerStatus();
  const [bezig, setBezig] = useState<string | null>(null);
  const gezienRef = useRef<Set<string>>(new Set());

  // Nieuwe hulpvraag: een dong
  useEffect(() => {
    const nieuw = meldingen.some((m) => !gezienRef.current.has(m.id));
    meldingen.forEach((m) => gezienRef.current.add(m.id));
    if (nieuw) speelDong();
  }, [meldingen]);
  const haalOp = () => verversBeheerStatus(false);

  async function vrijgeven(m: HulpMelding) {
    setBezig(m.id);
    const res = await fetch(`/api/admin/sessies/${m.sessie_id}/punt-vrijgeven`, { method: "POST" });
    if (!res.ok) {
      const { fout } = await res.json().catch(() => ({ fout: null }));
      toonMelding(uitlegBijStatus(res.status, "Vrijgeven", fout), "fout");
    }
    setBezig(null);
    haalOp();
  }

  async function negeren(m: HulpMelding) {
    setBezig(m.id);
    await fetch(`/api/admin/hulp/${m.id}`, { method: "PATCH" });
    setBezig(null);
    haalOp();
  }

  if (meldingen.length === 0) return null;

  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 3000,
      display: "flex", flexDirection: "column", gap: 12,
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
          <div style={{ fontSize: "0.82rem", opacity: 0.9, marginBottom: 12 }}>
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
    </div>
  );
}
