"use client";

import { useState } from "react";
import type { SpeciaalItem } from "@/types/database";
import { ITEM_INFO as UITLEG, type RouteWaarden } from "./SpeciaalItemLegende";

type Fase = "bevestig" | "kies_team" | "bezig" | "bevestigd" | "fout";

interface AndereSpeler {
  session_id: string;
  teamnaam: string;
}

interface Props {
  item: SpeciaalItem;
  // Huidige plek van het team: het item komt op die plek in het verslag en op de routekaart
  plek?: { lat: number; lng: number } | null;
  waarden: RouteWaarden;
  andereSessies: AndereSpeler[];
  onVerwerkt: (itemId: string, eigenNotificatie?: string) => void;
  onSluit?: () => void;
}

const ITEM_INFO: Record<string, { emoji: string; kleur: string; label: string }> = {
  spook:        { emoji: "👻", kleur: "#7C3AED", label: "Spook" },
  bom:          { emoji: "💣", kleur: "#DC2626", label: "Bom" },
  ster:         { emoji: "⭐", kleur: "#D97706", label: "Ster" },
  verdubbeling: { emoji: "🔴", kleur: "#B91C1C", label: "Verdubbeling" },
  wissel:       { emoji: "🔄", kleur: "#1D4ED8", label: "Wissel" },
  dief:         { emoji: "🦹", kleur: "#7C2D12", label: "Dief" },
  radar:        { emoji: "📡", kleur: "#0369A1", label: "Radar" },
  banaan:       { emoji: "🍌", kleur: "#CA8A04", label: "Banaan" },
  plekzooi:     { emoji: "⛔", kleur: "#991B1B", label: "Plek zooi" },
  vraagteken:   { emoji: "❓", kleur: "#7C3AED", label: "Vraagteken" },
};

const TYPES_ZONDER_DOEL = new Set(["ster", "verdubbeling", "radar", "vraagteken"]);

export default function SpeciaalItemPopup({ item, plek, waarden, andereSessies, onVerwerkt, onSluit }: Props) {
  const startFase: Fase = TYPES_ZONDER_DOEL.has(item.type) ? "bevestig" : "kies_team";
  const [fase, setFase] = useState<Fase>(startFase);
  const [foutMelding, setFoutMelding] = useState("");

  const info = ITEM_INFO[item.type] ?? { emoji: "?", kleur: "#555", label: item.type };
  const beschrijving = UITLEG[item.type]?.beschrijving(waarden) ?? "";

  async function pasEffectToe(targetSessionId?: string) {
    setFase("bezig");
    try {
      const body: Record<string, string | number> = { special_item_id: item.id };
      if (targetSessionId) body.target_session_id = targetSessionId;
      if (plek) { body.latitude = plek.lat; body.longitude = plek.lng; }

      const res = await fetch("/api/speler/speciaal/effect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFoutMelding(data.fout ?? "Er ging iets mis.");
        setFase("fout");
        return;
      }
      setFase("bevestigd");
      setTimeout(() => onVerwerkt(item.id, data.eigen_notificatie ?? undefined), 4000);
    } catch {
      setFoutMelding("Verbindingsfout. Probeer het opnieuw.");
      setFase("fout");
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: "#fff",
        color: "#0A1B36",
        borderRadius: "18px",
        padding: "28px 24px",
        maxWidth: "400px",
        width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "56px", lineHeight: 1, marginBottom: "10px" }}>{info.emoji}</div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: info.kleur }}>{info.label}</h2>
          <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#555", lineHeight: 1.4 }}>{beschrijving}</p>
        </div>

        {/* Fase: bevestig (voor items zonder doelkeuze) */}
        {fase === "bevestig" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => pasEffectToe()}
              style={{
                padding: "14px",
                borderRadius: "10px",
                border: "none",
                background: info.kleur,
                color: "#fff",
                fontWeight: 700,
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Nu gebruiken!
            </button>
            <button
              onClick={() => onSluit ? onSluit() : onVerwerkt(item.id)}
              style={{
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                background: "#fff",
                color: "#888",
                fontWeight: 500,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Later gebruiken
            </button>
          </div>
        )}

        {/* Fase: kies team */}
        {fase === "kies_team" && (
          <div>
            <p style={{ margin: "0 0 12px", fontWeight: 600, textAlign: "center", fontSize: "15px" }}>
              Kies een tegenstander:
            </p>
            {andereSessies.length === 0 ? (
              <p style={{ textAlign: "center", color: "#888", fontSize: "14px" }}>
                Er zijn nu geen tegenstanders actief.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {andereSessies.map((s) => (
                  <button
                    key={s.session_id}
                    onClick={() => pasEffectToe(s.session_id)}
                    style={{
                      padding: "13px 16px",
                      borderRadius: "10px",
                      border: `2px solid ${info.kleur}`,
                      background: "#fff",
                      color: info.kleur,
                      fontWeight: 700,
                      fontSize: "16px",
                      cursor: "pointer",
                    }}
                  >
                    {s.teamnaam}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => onSluit ? onSluit() : onVerwerkt(item.id)}
              style={{
                marginTop: 12, padding: "10px", width: "100%",
                borderRadius: "10px", border: "1px solid #ddd",
                background: "#fff", color: "#888",
                fontWeight: 500, fontSize: "14px", cursor: "pointer",
              }}
            >
              Later gebruiken
            </button>
          </div>
        )}

        {/* Fase: bezig */}
        {fase === "bezig" && (
          <p style={{ textAlign: "center", color: "#555", marginTop: 4 }}>Effect wordt toegepast…</p>
        )}

        {/* Fase: bevestigd */}
        {fase === "bevestigd" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: "16px", color: "#16A34A", margin: 0 }}>
              {item.type === "ster" ? "Punten bijgeschreven!" :
               item.type === "verdubbeling" ? "Verdubbeling actief!" :
               item.type === "radar" ? "Radar actief voor 2 minuten!" :
               item.type === "vraagteken" ? "Het lot heeft gesproken! 🎲" :
               "Effect toegepast!"}
            </p>
            <p style={{ fontSize: "13px", color: "#888", marginTop: 4 }}>Dit venster sluit automatisch.</p>
          </div>
        )}

        {/* Fase: fout */}
        {fase === "fout" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#DC2626", fontWeight: 600, marginTop: 0 }}>{foutMelding}</p>
            <button
              onClick={() => setFase(startFase)}
              style={{
                padding: "10px 20px", borderRadius: "10px",
                border: "none", background: "#EF4444", color: "#fff",
                fontWeight: 700, cursor: "pointer", fontSize: "14px",
              }}
            >
              Opnieuw proberen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
