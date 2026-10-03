import { formateerTijd } from "@/lib/geo";
import type { LeaderboardEntry } from "@/lib/types";

const MEDAILLE = ["🥇", "🥈", "🥉"];

function formateerAfstand(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// Eén regel in de tussenstand en de eindstand: grote medaille (of plaatsnummer),
// het teamicoon, de naam en een groot puntenaantal.
// compact (tussenstand): geen plaats, tijd of afstand — alleen team en punten
export default function StandRij({ entry, eenheid = "punten", compact = false }: {
  entry: LeaderboardEntry; eenheid?: string; compact?: boolean;
}) {
  const isEigen = entry.is_eigen_team;
  const medaille = MEDAILLE[entry.rank - 1];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px 10px 10px", borderRadius: 14,
      background: isEigen ? "rgba(0,217,255,0.14)" : "rgba(255,255,255,0.06)",
      border: `2px solid ${isEigen ? "#00d9ff" : "rgba(255,255,255,0.1)"}`,
    }}>
      {/* Plaats */}
      {!compact && <div style={{ width: 46, flexShrink: 0, display: "flex", justifyContent: "center" }}>
        {medaille ? (
          <span style={{ fontSize: "2.5rem", lineHeight: 1, filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.45))" }}>{medaille}</span>
        ) : (
          <span style={{
            width: 38, height: 38, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.25)",
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "#e8f0ff",
          }}>{entry.rank}</span>
        )}
      </div>}

      {/* Teamicoon */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isEigen ? "rgba(0,217,255,0.2)" : "rgba(255,255,255,0.08)",
        fontSize: "1.6rem", lineHeight: 1,
      }}>
        {entry.icon ?? "👥"}
      </div>

      {/* Naam + tijd/afstand */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.08rem",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: isEigen ? "#00d9ff" : "#fff",
        }}>
          {entry.display_name}{isEigen && " (jij)"}
        </div>
        {!compact && (
          <div style={{ fontSize: "0.8rem", color: "#9fb3d1", marginTop: 2, display: "flex", gap: 10, fontVariantNumeric: "tabular-nums" }}>
            <span>⏱ {formateerTijd(entry.tijd_seconden)}</span>
            {entry.distance_meters > 0 && <span>📍 {formateerAfstand(entry.distance_meters)}</span>}
          </div>
        )}
      </div>

      {/* Score */}
      <div style={{ flexShrink: 0, textAlign: "right", lineHeight: 1 }}>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.7rem",
          color: isEigen ? "#00d9ff" : "#fff", fontVariantNumeric: "tabular-nums",
        }}>{entry.score}</div>
        <div style={{ fontSize: "0.7rem", color: "#9fb3d1", marginTop: 3 }}>{eenheid}</div>
      </div>
    </div>
  );
}
