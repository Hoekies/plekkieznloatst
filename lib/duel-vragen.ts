// ⚔️ Vragen voor een duel: algemene, snelle meerkeuzevragen (niet uit de route, zodat niemand een vraag van de
// route alvast ziet). goed = index van het goede antwoord.
export type DuelVraag = { vraag: string; keuzes: string[]; goed: number };

export const DUEL_VRAGEN: DuelVraag[] = [
  { vraag: "Hoeveel poten heeft een spin?", keuzes: ["6", "8", "10", "12"], goed: 1 },
  { vraag: "Wat is de hoofdstad van België?", keuzes: ["Antwerpen", "Gent", "Brussel", "Luik"], goed: 2 },
  { vraag: "Welke kleur krijg je als je blauw en geel mengt?", keuzes: ["Groen", "Paars", "Oranje", "Bruin"], goed: 0 },
  { vraag: "Hoeveel minuten zitten er in 2 uur?", keuzes: ["100", "120", "140", "160"], goed: 1 },
  { vraag: "Welk dier is het grootste?", keuzes: ["Olifant", "Giraf", "Blauwe vinvis", "Nijlpaard"], goed: 2 },
  { vraag: "Hoeveel provincies heeft Nederland?", keuzes: ["10", "11", "12", "13"], goed: 2 },
  { vraag: "Wat is 7 × 8?", keuzes: ["54", "56", "58", "64"], goed: 1 },
  { vraag: "Welke planeet staat het dichtst bij de zon?", keuzes: ["Venus", "Aarde", "Mars", "Mercurius"], goed: 3 },
  { vraag: "Hoeveel spelers staan er bij voetbal per team op het veld?", keuzes: ["9", "10", "11", "12"], goed: 2 },
  { vraag: "In welk jaar begon de Tweede Wereldoorlog?", keuzes: ["1914", "1939", "1940", "1945"], goed: 1 },
  { vraag: "Wat is de langste rivier van Nederland?", keuzes: ["Maas", "Rijn", "IJssel", "Waal"], goed: 0 },
  { vraag: "Hoeveel dagen heeft een schrikkeljaar?", keuzes: ["364", "365", "366", "367"], goed: 2 },
  { vraag: "Welke vogel kan achteruit vliegen?", keuzes: ["Kolibrie", "Mus", "Meeuw", "Uil"], goed: 0 },
  { vraag: "Wat is de hoofdstad van Frankrijk?", keuzes: ["Lyon", "Parijs", "Marseille", "Nice"], goed: 1 },
  { vraag: "Hoeveel zijden heeft een zeshoek?", keuzes: ["5", "6", "7", "8"], goed: 1 },
  { vraag: "Welk fruit is geel en krom?", keuzes: ["Appel", "Peer", "Banaan", "Kiwi"], goed: 2 },
  { vraag: "Wat meet een thermometer?", keuzes: ["Wind", "Temperatuur", "Regen", "Luchtdruk"], goed: 1 },
  { vraag: "Hoeveel is de helft van 150?", keuzes: ["65", "70", "75", "80"], goed: 2 },
  { vraag: "Welk instrument heeft 88 toetsen?", keuzes: ["Gitaar", "Piano", "Viool", "Trompet"], goed: 1 },
  { vraag: "Welke kleur heeft een smaragd?", keuzes: ["Rood", "Blauw", "Groen", "Geel"], goed: 2 },
  { vraag: "Hoeveel weken heeft een jaar ongeveer?", keuzes: ["48", "50", "52", "54"], goed: 2 },
  { vraag: "Wat is het hoogste punt van Nederland?", keuzes: ["Vaalserberg", "Holterberg", "Tankenberg", "Sint-Pietersberg"], goed: 0 },
  { vraag: "Welk dier is een zoogdier?", keuzes: ["Haai", "Dolfijn", "Zalm", "Kwal"], goed: 1 },
  { vraag: "Hoeveel continenten zijn er?", keuzes: ["5", "6", "7", "8"], goed: 2 },
  { vraag: "Wat is 100 gedeeld door 4?", keuzes: ["20", "25", "30", "40"], goed: 1 },
  { vraag: "Welke maand heeft de minste dagen?", keuzes: ["Januari", "Februari", "April", "November"], goed: 1 },
  { vraag: "Waar maken bijen honing van?", keuzes: ["Bladeren", "Nectar", "Water", "Stuifmeel"], goed: 1 },
  { vraag: "Wat is de hoofdstad van Duitsland?", keuzes: ["München", "Hamburg", "Berlijn", "Keulen"], goed: 2 },
  { vraag: "Hoeveel hoeken heeft een driehoek?", keuzes: ["2", "3", "4", "5"], goed: 1 },
  { vraag: "Welk getal komt na 99?", keuzes: ["100", "101", "110", "999"], goed: 0 },
];

// Hoe lang een duel open staat, en hoe lang twee teams na een duel niet opnieuw een duel krijgen
export const DUEL_SECONDEN = 60;
export const DUEL_PAUZE_MIN = 10;
export const DUEL_PUNTEN_KEUZES = [10, 25, 50] as const;
