import type { RouteModus } from "@/types/database";

// Spelersuitleg per spelsoort. Los van MODUS_INFO in components/admin/RouteModus.tsx:
// dat is de korte omschrijving voor de admin, dit is de uitleg voor wie gaat spelen.
export interface SpelUitleg {
  emoji: string;
  titel: string;
  samenvatting: string;
  regels: string[];
  gpsUitleg: string;
  geluidUitleg: string;
}

interface Opties {
  mistM2PerSter?: number;
  heeftVragen?: boolean;
}

const PUNTEN_GPS = "Dit spel gebruikt je GPS-locatie om te bepalen wanneer je een routepunt bereikt. Locatietoegang is vereist om te spelen.";
const PUNTEN_GELUID = "Bij het bereiken van punten en het beantwoorden van vragen worden geluiden afgespeeld. Zet je volume aan voor de beste ervaring.";

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
      titel: "Mist verjagen",
      samenvatting: "Loop rond en speel zo veel mogelijk mist vrij.",
      regels,
      gpsUitleg: "Dit spel gebruikt je GPS-locatie om bij te houden waar je loopt en welke mist je daarmee vrijspeelt. Locatietoegang is vereist om te spelen.",
      geluidUitleg: "Bij het verdienen van een badge en het beantwoorden van vragen worden geluiden afgespeeld. Zet je volume aan voor de beste ervaring.",
    };
  }

  if (modus === "verspreid") {
    return {
      emoji: "🎲",
      titel: "Verspreide route",
      samenvatting: "Iedereen loopt hetzelfde rondje, maar niemand start op dezelfde plek.",
      regels: [
        "Alle teams lopen hetzelfde rondje, maar jullie beginnen allemaal bij een ander punt.",
        "Bij elk punt krijg je een vraag. Een goed antwoord levert punten op.",
        "Onderweg liggen items verstopt. Pak ze op en zet ze in tegen de andere teams.",
        "Je hoeft niet te racen naar hetzelfde punt — je eigen volgorde staat vast.",
      ],
      gpsUitleg: PUNTEN_GPS,
      geluidUitleg: PUNTEN_GELUID,
    };
  }

  // sequentieel (en de terugval als er nog geen route actief is)
  return {
    emoji: "🎯",
    titel: "Route op volgorde",
    samenvatting: "Volg de route van punt naar punt en beantwoord onderweg de vragen.",
    regels: [
      "Loop de punten in vaste volgorde af. Het volgende punt verschijnt pas als het vorige klaar is.",
      "Bij elk punt krijg je een vraag. Een goed antwoord levert punten op.",
      "Onderweg liggen items verstopt. Pak ze op en zet ze in tegen de andere teams.",
    ],
    gpsUitleg: PUNTEN_GPS,
    geluidUitleg: PUNTEN_GELUID,
  };
}
