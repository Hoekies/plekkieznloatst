import type { RouteModus } from "@/types/database";

// Spelersuitleg per spelsoort. Los van MODUS_INFO in components/admin/RouteModus.tsx:
// dat is de korte omschrijving voor de admin, dit is de uitleg voor wie gaat spelen.
export interface SpelUitleg {
  emoji: string;
  samenvatting: string;
  regels: string[];
  gpsUitleg: string;
  geluidUitleg: string;
}

const PUNTEN_GPS = "Nodig om te zien wanneer je bij een punt bent.";
const PUNTEN_GELUID = "Zet je volume aan: je hoort een signaal bij punten en aanvallen.";

export function spelUitleg(modus: RouteModus | null): SpelUitleg {
  if (modus === "verspreid") {
    return {
      emoji: "🎲",
      samenvatting: "Loop langs alle punten en verzamel zoveel mogelijk punten.",
      regels: [
        "Bij elk punt een vraag: goed antwoord = punten.",
        "Pak onderweg items op en zet ze in tegen andere teams.",
        "Tijd telt niet — alleen bij een gelijke score wint het snelste team.",
      ],
      gpsUitleg: PUNTEN_GPS,
      geluidUitleg: PUNTEN_GELUID,
    };
  }

  // sequentieel (en de terugval als er nog geen route actief is)
  return {
    emoji: "🎯",
    samenvatting: "Loop van punt naar punt en verzamel zoveel mogelijk punten.",
    regels: [
      "Het volgende punt verschijnt pas als het vorige klaar is.",
      "Bij elk punt een vraag: goed antwoord = punten.",
      "Pak onderweg items op en zet ze in tegen andere teams.",
      "Tijd telt niet — alleen bij een gelijke score wint het snelste team.",
    ],
    gpsUitleg: PUNTEN_GPS,
    geluidUitleg: PUNTEN_GELUID,
  };
}
