import { huidigThema, nederlandseDag, THEMAS } from "./seizoenen";

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
  // Vrije thema's: feestelijk en neutraal; de eigen emoji van de beheerder komt in de vlaggetjes (FinishScherm)
  eigen1: { naam: "Eigen 1", emoji: "⭐", kleuren: ["#FDE68A", "#67E8F9", "#F0ABFC"], basis: "#2E2366", versiering: ["⭐", "⭐", "✨", "🎊"], tekst: "Goed gedaan, jullie zijn binnen!" },
  eigen2: { naam: "Eigen 2", emoji: "🎈", kleuren: ["#FCA5A5", "#FDE68A", "#86EFAC"], basis: "#3B2058", versiering: ["🎈", "🎈", "✨", "🎉"], tekst: "Wat een feest, jullie zijn binnen!" },
} as const;

export type FinishThemaSleutel = keyof typeof FINISH_THEMAS;

// Het thema waarin een spel gespeeld is: bewaard bij de start (migratie 014), anders de datum van het spel
export function spelThema(sessie: unknown): FinishThemaSleutel {
  const s = (sessie ?? {}) as { thema?: string | null; started_at?: string | null; finished_at?: string | null };
  if (s.thema && s.thema in FINISH_THEMAS) return s.thema as FinishThemaSleutel;
  const wanneer = s.started_at ?? s.finished_at;
  return huidigFinishThema(wanneer ? new Date(wanneer) : new Date());
}

// Het spellogo van een thema (zonder thema: dat van vandaag), via de eigen site zodat het ook in gemaakte afbeeldingen werkt
export function spelLogo(bestand: "vierkant.webp" | "breed.webp" | "breed.png", thema?: string | null): string {
  return thema ? `/spellogo/${bestand}?thema=${encodeURIComponent(thema)}` : `/spellogo/${bestand}`;
}

const meng = (hex: string, met: string, deel: number) => {
  const kanaal = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(kanaal(hex, i) + (kanaal(met, i) - kanaal(hex, i)) * deel).toString(16).padStart(2, "0")).join("")}`;
};

// De kleuren van een thema op een kaartje of gedeelde pagina. Als gewone kleuren (geen color-mix): ook goed in een gemaakte afbeelding.
export function themaAchtergrond(sleutel: FinishThemaSleutel): string {
  const basis = FINISH_THEMAS[sleutel].basis;
  return `radial-gradient(circle at 50% 0%, ${meng(basis, "#FFFFFF", 0.3)} 0%, ${basis} 55%, ${meng(basis, "#000000", 0.35)} 100%)`;
}
export function themaKaartStijl(sleutel?: FinishThemaSleutel | null): React.CSSProperties | undefined {
  return sleutel ? { background: themaAchtergrond(sleutel), borderColor: FINISH_THEMAS[sleutel].kleuren[0] } : undefined;
}

// Ook rond middernacht op een UTC-server de Nederlandse kalenderdag gebruiken.
// 📌 Een vastgezet thema (beheer → Seizoenen) gaat voor de datum.
export function huidigFinishThema(datum = new Date(), vast: string | null = null): FinishThemaSleutel {
  if (vast && vast in FINISH_THEMAS) return vast as FinishThemaSleutel;
  const thema = huidigThema(nederlandseDag(datum), new Set(THEMAS.map((t) => t.sleutel)));
  return thema && thema.sleutel in FINISH_THEMAS ? thema.sleutel as FinishThemaSleutel : "winter";
}
