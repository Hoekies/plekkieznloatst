// Compacte strook bovenaan een pagina (Dashboard, Spelers, Antwoorden). Elk vakje heeft dezelfde
// opbouw: links het icoon, rechts de waarde (getal of naam) met een klein woord eronder.
export type StatVak = { icoon: string; waarde: string | number; label: string; letOp?: boolean; titel?: string };

export default function StatStrook({ vakken }: { vakken: StatVak[] }) {
  return (
    <div className="stat-strook">
      {vakken.map((v) => (
        <div key={v.label} className={`stat-vak${v.letOp ? " stat-vak--let-op" : ""}`} title={v.titel ?? `${v.waarde} ${v.label}`}>
          <span className="stat-vak-icoon" aria-hidden>{v.icoon}</span>
          <span className="stat-vak-tekst">
            <span className="stat-vak-waarde">{v.waarde}</span>
            <span className="stat-vak-label">{v.label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
