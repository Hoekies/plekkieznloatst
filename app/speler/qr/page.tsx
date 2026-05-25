"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function QrScanFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const puntId = params.get("p");
  const secret = params.get("s");

  const [fase, setFase] = useState<"bezig" | "fout">("bezig");
  const [foutTekst, setFoutTekst] = useState("");

  useEffect(() => {
    if (!puntId || !secret) {
      setFoutTekst("Ongeldige QR-code.");
      setFase("fout");
      return;
    }

    fetch("/api/speler/voortgang/bereik", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route_point_id: puntId, qr_secret: secret }),
    }).then(async (res) => {
      if (res.ok) {
        router.replace("/speler/kaart");
      } else {
        const data = await res.json().catch(() => ({}));
        setFoutTekst(data.fout ?? "QR-code ongeldig of punt al bereikt.");
        setFase("fout");
      }
    }).catch(() => {
      setFoutTekst("Geen verbinding. Controleer je internet en probeer opnieuw.");
      setFase("fout");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: "var(--game-gradient)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div className="glass-card" style={{ padding: "32px 28px", maxWidth: 360, width: "100%", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="KaartKapers" style={{ width: "100%", maxWidth: 200, marginBottom: 24 }} />

        {fase === "bezig" && (
          <>
            <div className="loading-spinner" style={{ borderTopColor: "#06B6D4", margin: "0 auto 16px" }} />
            <p style={{ color: "rgba(255,255,255,0.8)", margin: 0 }}>Punt ontgrendelen…</p>
          </>
        )}

        {fase === "fout" && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 14, padding: "18px 20px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <p style={{ color: "#FCA5A5", fontWeight: 700, margin: 0 }}>❌ Niet gelukt</p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", margin: 0 }}>{foutTekst}</p>
            <button className="btn btn-ghost" style={{ fontSize: "0.85rem", marginTop: 4 }}
              onClick={() => router.push("/speler/kaart")}>
              Terug naar de kaart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function QrPagina() {
  return (
    <Suspense>
      <QrScanFlow />
    </Suspense>
  );
}
