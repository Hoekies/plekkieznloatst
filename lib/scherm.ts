// 📱 Wanneer krijgt het scherm de telefoonindeling? Smaller dan 769 px, óf een liggende telefoon (lager dan
// 500 px op een aanraakscherm). Zelfde regel als de @media-regels in styles/globals.css.
export const TELEFOON_MQ = "(max-width: 768px), (max-height: 500px) and (pointer: coarse)";

export function isTelefoon(): boolean {
  return typeof window !== "undefined" && window.matchMedia(TELEFOON_MQ).matches;
}
