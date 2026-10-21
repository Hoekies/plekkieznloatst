// Tijdens het laden: grijze blokjes in de vorm van de inhoud (rustiger dan "Laden…", het scherm springt minder)
export default function LaadBlokjes({ aantal = 3, hoogte = 64, gap = 10 }: { aantal?: number; hoogte?: number; gap?: number }) {
  return (
    <div className="laad-blokjes" style={{ gap }} role="status" aria-label="Laden">
      {Array.from({ length: aantal }, (_, i) => (
        <div key={i} className="laad-blokje" style={{ height: hoogte, opacity: 1 - i * 0.18 }} />
      ))}
    </div>
  );
}
