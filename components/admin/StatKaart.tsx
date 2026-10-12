// Goudomrande tegel met een getal of naam, zoals bovenaan het dashboard
export default function StatKaart({ label, waarde, badge, badgeKlas }: { label: string; waarde: string; badge: string; badgeKlas: string }) {
  return (
    <div className="pr-gem-panel">
      <span className={`pr-corner-chip pr-badge ${badgeKlas}`}>{badge}</span>
      <div className="pr-gem-panel-inner">
        <div className="pr-gem-label">{label}</div>
        <div className="pr-gem-value">{waarde}</div>
      </div>
    </div>
  );
}
