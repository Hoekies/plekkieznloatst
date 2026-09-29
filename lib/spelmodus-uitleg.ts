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

interface Opties {
  mistM2PerSter?: number;
  heeftVragen?: boolean;
}

const PUNTEN_GPS = "Nodig om te zien wanneer je bij een punt bent.";
const PUNTEN_GELUID = "Zet je volume aan: je hoort een signaal bij punten en aanvallen.";

export function spelUitleg(modus: RouteModus | null, opties: Opties = {}): SpelUitleg {
  if (modus === "mist") {
    const regels = [
      "Je kaart zit helemaal onder de mist. Door rond te lopen speel je die vrij.",
      opties.mistM2PerSter
        ? `Elke ${opties.mistM2PerSter.toLocaleString("nl-NL")} m² die je vrijspeelt levert een ster op.`
        : "Hoe meer je vrijspeelt, hoe meer sterren je verdient.",
      "Alleen wandeltempo telt mee — rennen of fietsen speelt geen mist vrij.",
      "Verdien badges voor elk dorp of elke wijk die je verkent.",
    ];
    if (opties.heeftVragen) {
      regels.push("Kom je langs een vraag, dan verschijnt die vanzelf. Goed antwoord = extra punten.");
    }
    return {
      emoji: "☁️",
      samenvatting: "Loop rond en speel zo veel mogelijk mist vrij.",
      regels,
      gpsUitleg: "Dit spel gebruikt je GPS-locatie om bij te houden waar je loopt en welke mist je daarmee vrijspeelt. Locatietoegang is vereist om te spelen.",
      geluidUitleg: "Bij het verdienen van een badge en het beantwoorden van vragen worden geluiden afgespeeld. Zet je volume aan voor de beste ervaring.",
    };
  }

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
