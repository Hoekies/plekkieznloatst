import SchuifTekst from "@/components/admin/SchuifTekst";

// Compacte strook bovenaan een pagina (Dashboard, Spelers, Antwoorden). Elk vakje heeft dezelfde
// opbouw: links het icoon, rechts de waarde (getal of naam) met een klein woord eronder.
// onKlik: het vakje is een knop (bijv. foto's keuren)
type StatVak = { icoon: string; waarde: string | number; label: string; letOp?: boolean; titel?: string; onKlik?: () => void };

export default function StatStrook({ vakken }: { vakken: StatVak[] }) {
  return (
    <div className="stat-strook">
      {vakken.map((v) => {
        const inhoud = <>
          <span className="stat-vak-icoon" aria-hidden>{v.icoon}</span>
          <span className="stat-vak-tekst">
            {/* Lange namen (route, koploper) schuiven heen en weer in plaats van af te kappen */}
            <SchuifTekst tekst={String(v.waarde)} className="stat-vak-waarde" />
            <SchuifTekst tekst={v.label} className="stat-vak-label" />
          </span>
        </>;
        const cls = `stat-vak${v.letOp ? " stat-vak--let-op" : ""}${v.onKlik ? " stat-vak--knop" : ""}`;
        return v.onKlik
          ? <button key={v.label} type="button" className={cls} title={v.titel ?? `${v.waarde} ${v.label}`} onClick={v.onKlik}>{inhoud}</button>
          : <div key={v.label} className={cls} title={v.titel ?? `${v.waarde} ${v.label}`}>{inhoud}</div>;
      })}
    </div>
  );
}
