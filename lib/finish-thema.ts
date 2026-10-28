import { huidigThema, THEMAS } from "./seizoenen";

// Dezelfde thema's en periodes als de seizoenslogo's. De finish werkt ook zonder uploads.
export const FINISH_THEMAS = {
  lente: { naam: "Lente", emoji: "🌷", kleuren: ["#F9A8D4", "#86EFAC", "#FDE68A"], basis: "#244338", versiering: ["🌸", "🌷", "🍃", "🦋"], tekst: "Een bloeiende prestatie, jullie zijn binnen!" },
  zomer: { naam: "Zomer", emoji: "☀️", kleuren: ["#FDE047", "#67E8F9", "#FDBA74"], basis: "#16465A", versiering: ["☀️", "🌴", "🌺", "🍋"], tekst: "Een zonnige finish, goed gedaan!" },
  herfst: { naam: "Herfst", emoji: "🍂", kleuren: ["#FDBA74", "#FCD34D", "#FCA5A5"], basis: "#542B24", versiering: ["🍂", "🍁", "🌰", "🍃"], tekst: "Door weer en wind naar de finish!" },
  winter: { naam: "Winter", emoji: "❄️", kleuren: ["#BAE6FD", "#E0E7FF", "#67E8F9"], basis: "#203C62", versiering: ["❄️", "❅", "✨", "❄️"], tekst: "Een ijzersterke prestatie, jullie zijn binnen!" },
  halloween: { naam: "Halloween", emoji: "🎃", kleuren: ["#FDBA74", "#C4B5FD", "#BEF264"], basis: "#351B49", versiering: ["🎃", "👻", "🦇", "✨"], tekst: "Griezelig goed gespeeld, jullie zijn binnen!" },
  sinterklaas: { naam: "Sinterklaas", emoji: "🎁", kleuren: ["#FDE68A", "#FCA5A5", "#FDBA74"], basis: "#601D36", versiering: ["🎁", "⭐", "🍫", "🎀"], tekst: "Wie zo goed speelt, verdient een feestje!" },
  kerst: { naam: "Kerst", emoji: "🎄", kleuren: ["#FDE68A", "#86EFAC", "#FCA5A5"], basis: "#193E36", versiering: ["🎄", "❄️", "⭐", "🎁"], tekst: "Een schitterende finish, goed gedaan!" },
  oudnieuw: { naam: "Oud & nieuw", emoji: "🎆", kleuren: ["#FDE68A", "#E0E7FF", "#F0ABFC"], basis: "#25234D", versiering: ["🎆", "✨", "🎇", "⭐"], tekst: "Knallend over de finish!" },
  valentijn: { naam: "Valentijn", emoji: "💘", kleuren: ["#FDA4AF", "#FBCFE8", "#F0ABFC"], basis: "#572440", versiering: ["💕", "💘", "🌹", "💗"], tekst: "Samen gespeeld, samen gefinisht!" },
  carnaval: { naam: "Carnaval", emoji: "🎭", kleuren: ["#FDE047", "#86EFAC", "#FCA5A5"], basis: "#44216A", versiering: ["🎭", "🎊", "🎉", "✨"], tekst: "De finish is binnen, tijd voor een feestje!" },
  pasen: { naam: "Pasen", emoji: "🐣", kleuren: ["#FDE68A", "#C4B5FD", "#86EFAC"], basis: "#38432A", versiering: ["🐣", "🥚", "🌷", "🐰"], tekst: "Een eitje? Jullie hebben het gedaan!" },
  koningsdag: { naam: "Koningsdag", emoji: "👑", kleuren: ["#FDBA74", "#FDE68A", "#FB923C"], basis: "#593020", versiering: ["👑", "🧡", "🇳🇱", "🎉"], tekst: "Een koninklijke prestatie, goed gedaan!" },
} as const;

export type FinishThemaSleutel = keyof typeof FINISH_THEMAS;

// Ook rond middernacht op een UTC-server de Nederlandse kalenderdag gebruiken.
// 📌 Een vastgezet thema (beheer → Seizoenen) gaat voor de datum.
export function huidigFinishThema(datum = new Date(), vast: string | null = null): FinishThemaSleutel {
  if (vast && vast in FINISH_THEMAS) return vast as FinishThemaSleutel;
  const delen = new Intl.DateTimeFormat("en", { timeZone: "Europe/Amsterdam", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(datum);
  const getal = (soort: string) => Number(delen.find((d) => d.type === soort)?.value);
  const dag = new Date(getal("year"), getal("month") - 1, getal("day"));
  const thema = huidigThema(dag, new Set(THEMAS.map((t) => t.sleutel)));
  return thema && thema.sleutel in FINISH_THEMAS ? thema.sleutel as FinishThemaSleutel : "winter";
}
