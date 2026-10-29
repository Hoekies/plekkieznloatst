import { formateerTijd, afstandTekst } from "@/lib/geo";
import type { LeaderboardEntry } from "@/lib/types";

const MEDAILLE = ["🥇", "🥈", "🥉"];

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
      display: "flex", alignItems: "center", gap: "clamp(6px, 2.5vw, 12px)",
      padding: "10px 14px 10px 10px", borderRadius: 14,
      background: isEigen ? "rgba(0,217,255,0.14)" : "rgba(255,255,255,0.06)",
      border: `2px solid ${isEigen ? "#00d9ff" : "rgba(255,255,255,0.1)"}`,
    }}>
      {/* Plaats */}
      {!compact && <div style={{ width: "min(46px, 10vw)", flexShrink: 0, display: "flex", justifyContent: "center" }}>
        {medaille ? (
          <span style={{ fontSize: "clamp(1.6rem, 7.5vw, 2.5rem)", lineHeight: 1, filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.45))" }}>{medaille}</span>
        ) : (
          <span style={{
            width: 38, height: 38, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.25)",
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "#e8f0ff",
          }}>{entry.rank}</span>
        )}
      </div>}

      {/* Teamfoto (goedgekeurde finishfoto) of anders het teamicoon */}
      <div style={{
        width: "min(44px, 11vw)", height: "min(44px, 11vw)", borderRadius: "50%", flexShrink: 0, overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isEigen ? "rgba(0,217,255,0.2)" : "rgba(255,255,255,0.08)",
        fontSize: "1.6rem", lineHeight: 1,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {entry.foto ? <img src={entry.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : entry.icon ?? "👥"}
      </div>

      {/* Naam + tijd/afstand */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Naam op maximaal twee regels (lange namen bleven anders onherkenbaar); "jij" los ervan */}
        <div title={entry.display_name} style={{
          fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.2,
          overflow: "hidden", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          color: isEigen ? "#00d9ff" : "#fff",
        }}>
          {isEigen && <span style={{ fontSize: "0.7rem", padding: "1px 6px", marginRight: 6, borderRadius: 6, background: "#00d9ff", color: "#06243a", verticalAlign: "middle" }}>JIJ</span>}
          {entry.display_name}
        </div>
        {!compact && (
          <div style={{ fontSize: "0.8rem", color: "#9fb3d1", marginTop: 2, display: "flex", flexWrap: "wrap", gap: "0 10px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            <span>⏱ {formateerTijd(entry.tijd_seconden)}</span>
            {entry.distance_meters > 0 && <span>📍 {afstandTekst(entry.distance_meters)}</span>}
          </div>
        )}
        {/* 🏆 De titel van dit team (eindstand) */}
        {!compact && entry.prijs && <div className="stand-prijs" title={entry.prijs.uitleg}>{entry.prijs.emoji} {entry.prijs.titel}</div>}
      </div>

      {/* Score */}
      <div style={{ flexShrink: 0, textAlign: "right", lineHeight: 1 }}>
        <div style={{
          fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "clamp(1.1rem, 5.5vw, 1.7rem)",
          color: isEigen ? "#00d9ff" : "#fff", fontVariantNumeric: "tabular-nums",
        }}>{entry.score}</div>
        {!compact && <div style={{ fontSize: "0.7rem", color: "#9fb3d1", marginTop: 3 }}>{eenheid}</div>}
      </div>
    </div>
  );
}
