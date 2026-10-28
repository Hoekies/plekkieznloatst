// 👆 Knopnamen uit de handleiding, zoals de hulpkolom ze op het scherm zoekt én de zelftest ze controleert
// (één regel voor beide, zodat een groene zelftest ook betekent dat het aanwijzen werkt).
// "A / B", "A → B" en "A en B" zijn losse namen; tekst tussen haakjes telt niet mee; emoji en tekens ook niet.

export const normaliseerNaam = (t: string | null | undefined) => (t ?? "").toLowerCase()
  .replace(/&amp;/g, "&").replace(/\(.*?\)/g, " ")
  .replace(/[\p{Extended_Pictographic}️‍]/gu, "").replace(/[+·…:"“”'‘’()]/g, " ").replace(/\s+/g, " ").trim();

export function hulpNamen(tekst: string): string[] {
  return tekst.split(/\s(?:\/|→|en)\s/).map(normaliseerNaam).filter((n) => n.length >= 3);
}
