// Versienummer en laatste update (moment van bouwen), klein onderin het beheermenu en in Info & uitleg.
// "0.8.0" wordt getoond als "v0.8"; "0.8.3" als "v0.8.3".
export function versieTekst(): { versie: string; datum: string } {
  const ruw = process.env.NEXT_PUBLIC_VERSIE ?? "0.0.0";
  const versie = `v${ruw.replace(/\.0$/, "")}`;
  const bouw = process.env.NEXT_PUBLIC_BOUWDATUM;
  const datum = bouw
    ? new Date(bouw).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "onbekend";
  return { versie, datum };
}

export default function VersieRegel() {
  const { versie, datum } = versieTekst();
  return (
    <div className="versie-regel" title={`PointRush ${versie}, bijgewerkt op ${datum}`}>
      PointRush <strong>{versie}</strong> · bijgewerkt {datum}
    </div>
  );
}
