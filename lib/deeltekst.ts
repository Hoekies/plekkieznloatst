// Grappige WhatsApp-tekst bij het rapport. Per team afhankelijk van de plek in de eindstand;
// steeds een willekeurige uit een paar varianten, zodat niet iedereen hetzelfde krijgt.
const kies = <T,>(lijst: T[]) => lijst[Math.floor(Math.random() * lijst.length)];

export function deeltekstAlles(route: string): string {
  return kies([
    `🏁 PointRush — ${route}\n\nBedankt allemaal voor het spelen! 🙌 Hierbij de eindstand, met zwart op wit wie er gewonnen heeft en wie er vooral bommen gooide. 💣\n\nVerloren en nog een banaan over? Eet hem lekker op, dat troost. Of bewaar hem voor vanavond, wie weet komt hij nog van pas. 😏🍌\n\nTot de volgende keer! — Hoekies`,
    `🏁 PointRush — ${route}\n\nWat een spel! Er is gelopen, gezocht, gegokt en vooral flink dwarsgezeten. 😈 In de bijlage staat precies wie wat deed. Ontkennen heeft geen zin meer.\n\nHeb je verloren? Geen zorgen: meedoen is belangrijker dan winnen. Zeggen ze. Meestal de verliezers. 😉🍌\n\nBedankt en tot de volgende keer! — Hoekies`,
  ]);
}

export function deeltekstTeam(route: string, team: string, plek: number, aantal: number): string {
  if (plek === 1) {
    return kies([
      `🏆 Gefeliciteerd, ${team}!\n\nJullie hebben ${route} gewonnen! Hierbij het bewijs, zwart op wit (nou ja, paars). Inlijsten, op de wc hangen of elke verjaardag laten zien: alles mag. 😎\n\nDe bananen die jullie nog over hebben? Een overwinningsbanaan smaakt het lekkerst. 🍌👑\n\n— Hoekies`,
      `🏆 ${team}, jullie zijn de kampioenen!\n\nIn de bijlage jullie verslag van ${route}, met alle punten, items en de route. Zeg het maar tegen iedereen, wij hebben het bewijs. 😎\n\nBedankt voor het spelen! — Hoekies`,
    ]);
  }
  if (plek === aantal && aantal > 1) {
    return kies([
      `🍌 Bedankt voor het spelen, ${team}!\n\nLaatste geworden? Geen schande: iemand moet de anderen een goed gevoel geven, en dat hebben jullie fantastisch gedaan. 👏\n\nNog een banaan over? Bewaar hem voor vanavond, die komt vast nog van pas. 😏 In de bijlage jullie verslag, met wie jullie allemaal bekogeld heeft. Wraak mag. 💣\n\n— Hoekies`,
      `🍌 ${team}, bedankt voor het meespelen!\n\nDe laatste plek is ook een plek. En eerlijk is eerlijk: niemand heeft zoveel van de route gezien als jullie. 😅\n\nHier jullie verslag. Nog een banaan over? Eet hem op, dat troost. Of leg hem stiekem bij de winnaar op de stoep. 😈\n\n— Hoekies`,
    ]);
  }
  return kies([
    `🏁 Bedankt voor het spelen, ${team}!\n\nPlek ${plek} van de ${aantal}: geen goud, maar ook geen rode lantaarn. Lekker veilig in het midden. 😌\n\nIn de bijlage jullie verslag van ${route}, met alle bommen die jullie kregen en wie ze gooide. Volgende keer revanche? 💣🍌\n\n— Hoekies`,
    `🏁 ${team}, wat een spel!\n\nPlek ${plek}. Niet slecht, niet geweldig, gewoon heel gezellig. 😄 Hier jullie verslag van ${route}.\n\nNog een banaan over? Die mag je houden. Wat je ermee doet, moet je zelf weten. 😏🍌\n\n— Hoekies`,
  ]);
}
