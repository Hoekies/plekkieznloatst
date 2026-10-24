// Eén vaste kleur per speler, overal hetzelfde: kaartrand, lijn op de live kaart, bolletje in de
// lijst en de tijdlijn. De kleur hangt af van de plek van de speler in de (op id gesorteerde) lijst
// van alle spelers, zodat twee spelers nooit dezelfde kleur krijgen zolang er genoeg kleuren zijn.
const SPELER_KLEUREN = [
  "#F97316", "#22D3EE", "#A78BFA", "#F472B6", "#FACC15", "#4ADE80",
  "#60A5FA", "#FB7185", "#2DD4BF", "#E879F9", "#FDBA74", "#A3E635",
];

export function maakKleurMap(spelerIds: string[]): Map<string, string> {
  const gesorteerd = [...new Set(spelerIds)].sort();
  return new Map(gesorteerd.map((id, i) => [id, SPELER_KLEUREN[i % SPELER_KLEUREN.length]]));
}
