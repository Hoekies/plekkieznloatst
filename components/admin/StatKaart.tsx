"use client";

import SchuifTekst from "@/components/admin/SchuifTekst";

// Goudomrande tegel met een getal of naam, zoals bovenaan het dashboard.
// Past de waarde niet (bijv. een lange routenaam), dan schuift de tekst heen en weer.
export default function StatKaart({ label, waarde, badge, badgeKlas }: { label: string; waarde: string; badge: string; badgeKlas: string }) {
  return (
    <div className="pr-gem-panel">
      <span className={`pr-corner-chip pr-badge ${badgeKlas}`}>{badge}</span>
      <div className="pr-gem-panel-inner">
        <div className="pr-gem-label">{label}</div>
        <SchuifTekst tekst={waarde} className="pr-gem-value" style={{ textOverflow: "clip" }} />
      </div>
    </div>
  );
}
