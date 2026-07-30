import type { RouteModus } from "@/types/database";

// Eén bron voor hoe een speltype er overal in het adminpaneel uitziet.
export const MODUS_INFO: Record<RouteModus, {
  label: string;
  omschrijving: string;
  kleur: string;
  tint: string;
}> = {
  sequentieel: {
    label: "Sequentieel",
    omschrijving: "Vaste route, punten op volgorde",
    kleur: "#93C5FD",
    tint: "rgba(59,130,246,0.16)",
  },
  verspreid: {
    label: "Verspreid",
    omschrijving: "Rondje, elk team start op een eigen plek",
    kleur: "#67E8F9",
    tint: "rgba(6,182,212,0.16)",
  },
  mist: {
    label: "Mist",
    omschrijving: "Gebied vrijspelen door te lopen",
    kleur: "#FDBA74",
    tint: "rgba(249,115,22,0.16)",
  },
};

// Getekend i.p.v. emoji: emoji-ondersteuning verschilt per toestel (🌫️ viel op Windows
// terug op een leeg blokje), deze iconen zien er overal identiek uit.
export function ModusIcoon({ modus, size = 20 }: { modus: RouteModus; size?: number }) {
  if (modus === "mist") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
        <path d="M3 8h13M6 12h15M3 16h11M17.5 16H21" />
      </svg>
    );
  }
  if (modus === "verspreid") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={1.8} strokeDasharray="3 3" opacity={0.55} />
        <circle cx="12" cy="4" r="2.4" fill="currentColor" />
        <circle cx="19" cy="16" r="2.4" fill="currentColor" />
        <circle cx="5" cy="16" r="2.4" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 17l3-3.5M14 9.5l3-3" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" opacity={0.55} />
      <circle cx="5" cy="19" r="2.6" fill="currentColor" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
      <circle cx="19" cy="5" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function ModusTegel({ modus, size = 44 }: { modus: RouteModus; size?: number }) {
  const info = MODUS_INFO[modus];
  return (
    <div style={{
      width: size, height: size, borderRadius: size <= 30 ? 8 : 12, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: info.tint, border: `1px solid ${info.kleur}55`, color: info.kleur,
    }}>
      <ModusIcoon modus={modus} size={Math.round(size * 0.52)} />
    </div>
  );
}
