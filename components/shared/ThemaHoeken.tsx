import { FINISH_THEMAS, type FinishThemaSleutel } from "@/lib/finish-thema";

// 🎉 De versiering van een thema in de vier hoeken van een kaartje of gedeelde pagina
export default function ThemaHoeken({ thema, emoji = null }: { thema?: FinishThemaSleutel | null; emoji?: string | null }) {
  if (!thema) return null;
  const v = FINISH_THEMAS[thema].versiering;
  return (
    <>
      {[emoji ?? v[0], emoji ?? v[1], v[2], v[3]].map((e, i) => <span key={i} className={`thema-hoek thema-hoek--${i}`} aria-hidden>{e}</span>)}
    </>
  );
}
