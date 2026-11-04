// 🔗 Hoe lang een inloglink of de QR-code op een kaartje werkt: de knoppen in het beheer.
// De server controleert de uren met LINK_UREN (lib/inlog-link.ts).
export const LINK_DUUR: { uren: number; label: string }[] = [
  { uren: 4, label: "4 uur" },
  { uren: 24, label: "1 dag" },
  { uren: 72, label: "3 dagen" },
  { uren: 120, label: "5 dagen" },
];
