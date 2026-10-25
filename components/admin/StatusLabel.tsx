// Status van een team, overal in dezelfde vorm en kleur (dashboard, antwoorden, spelersvenster)
export type TeamStatus = "onderweg" | "uitgelogd" | "gefinisht" | "gepauzeerd" | "niet-gestart" | "vervallen";

const STIJL: Record<TeamStatus, { label: string; icoon: string; cls: string }> = {
  onderweg:       { label: "Onderweg",     icoon: "⚡", cls: "pr-gem-chip--cyan" },
  uitgelogd:      { label: "Uitgelogd",    icoon: "💤", cls: "pr-gem-chip--gray" },
  gefinisht:      { label: "Gefinisht",    icoon: "🏁", cls: "pr-gem-chip--green" },
  gepauzeerd:     { label: "Gepauzeerd",   icoon: "⏸️", cls: "pr-gem-chip--geel" },
  "niet-gestart": { label: "Niet gestart", icoon: "⏳", cls: "pr-gem-chip--gray" },
  vervallen:      { label: "Vervallen",    icoon: "✖️", cls: "pr-gem-chip--gray" },
};

// Uit de sessie: status van het spel en of het team nog ingelogd is
export function teamStatus(sessie: string | null | undefined, ingelogd = true): TeamStatus {
  if (sessie === "voltooid") return "gefinisht";
  if (sessie === "vervallen") return "vervallen";
  if (sessie === "actief") return ingelogd ? "onderweg" : "uitgelogd";
  return "niet-gestart";
}

export default function StatusLabel({ status }: { status: TeamStatus }) {
  const s = STIJL[status];
  return <span title={s.label} className={`pr-gem-chip status-label ${s.cls}`}><span aria-hidden>{s.icoon}</span><span className="status-label-tekst"> {s.label}</span></span>;
}
