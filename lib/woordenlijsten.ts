// 🧩 Ingebouwde woordenlijsten voor het puzzelwoord (gratis, zonder internet of sleutel):
// "plaats in Nederland, 6 letters" → ZWOLLE, ARNHEM, … Alleen woorden van één stuk, zonder leestekens.
type Thema = { naam: string; herken: RegExp; woorden: string[] };

const THEMAS: Thema[] = [
  {
    naam: "Een plaats in Nederland",
    herken: /\b(plaats(en|naam)?|stad|steden|dorp(en)?|gemeente|woonplaats)\b/i,
    woorden: `amsterdam rotterdam utrecht eindhoven groningen tilburg almere breda nijmegen apeldoorn haarlem arnhem enschede amersfoort
      zaandam zwolle leiden maastricht dordrecht zoetermeer ede emmen venlo deventer delft helmond oss leeuwarden alkmaar hilversum heerlen
      roosendaal purmerend schiedam lelystad gouda vlaardingen assen almelo hoorn veenendaal zeist nieuwegein kampen harderwijk hengelo
      middelburg vlissingen goes terneuzen sneek drachten heerenveen meppel hoogeveen doetinchem zutphen tiel culemborg gorinchem weert
      roermond sittard geleen kerkrade valkenburg venray uden veghel boxtel berghem waalwijk bergen edam volendam urk texel ameland schagen
      zandvoort katwijk noordwijk lisse wassenaar rijswijk delfzijl winschoten veendam stadskanaal coevorden hardenberg ommen raalte rijssen
      oldenzaal winterswijk lochem wageningen rhenen bunschoten huizen naarden weesp muiden woerden oudewater schoonhoven bergeijk best
      veldhoven geldrop valkenswaard uithoorn aalsmeer hoofddorp heemstede bussum laren blaricum baarn soest barneveld nijkerk putten ermelo
      elburg epe heerde hattem dalfsen steenwijk joure franeker harlingen dokkum bolsward workum lemmer enkhuizen medemblik ravenstein megen
      lith heesch nistelrode schaijk grave cuijk boxmeer gennep mook rosmalen vught drunen heusden dongen oosterhout etten zundert tholen
      zierikzee hulst sluis domburg veere yerseke kapelle`.split(/\s+/),
  },
  {
    naam: "Een dier",
    herken: /\bdier(en)?\b|\bbeest(en)?\b/i,
    woorden: `hond kat koe paard schaap geit varken kip eend gans konijn muis rat egel vos wolf beer das ree hert haas eekhoorn olifant giraffe
      zebra leeuw tijger panter aap gorilla neushoorn nijlpaard kameel krokodil slang schildpad kikker salamander haai walvis dolfijn zeehond
      pinguin uil adelaar valk mus merel specht zwaan ooievaar reiger meeuw kraai ekster papegaai vlinder bij wesp mier spin slak worm kever
      mug vlieg libel kreeft krab octopus inktvis kwal lama alpaca koala kangoeroe panda otter bever mol vleermuis hamster cavia pony ezel
      stier kalf lam big`.split(/\s+/),
  },
  {
    naam: "Fruit of groente",
    herken: /\b(fruit|groente(n)?|vrucht(en)?)\b/i,
    woorden: `appel peer banaan sinaasappel mandarijn citroen limoen druif kers aardbei framboos braam bes perzik abrikoos pruim mango ananas
      kiwi meloen watermeloen vijg dadel kokosnoot papaja wortel ui prei sla spinazie andijvie boerenkool bloemkool broccoli komkommer tomaat
      paprika courgette aubergine pompoen biet radijs selderij asperge erwt boon mais aardappel knoflook venkel witlof champignon`.split(/\s+/),
  },
  {
    naam: "Een beroep",
    herken: /\b(beroep(en)?|baan|vak|werk)\b/i,
    woorden: `bakker slager kapper dokter arts tandarts verpleger leraar juf meester boer visser piloot kapitein matroos agent monteur
      timmerman loodgieter schilder metselaar elektricien kok ober kassier postbode chauffeur advocaat rechter notaris architect ingenieur
      journalist fotograaf muzikant zanger acteur danser schrijver dichter boswachter dierenarts apotheker glazenwasser schoenmaker
      kleermaker imker smid molenaar`.split(/\s+/),
  },
  {
    naam: "Een sport",
    herken: /\bsport(en)?\b/i,
    woorden: `voetbal hockey tennis golf korfbal handbal volleybal basketbal honkbal softbal rugby judo karate boksen schaatsen skien zwemmen
      roeien zeilen surfen fietsen wielrennen hardlopen atletiek turnen dansen klimmen darten biljart schaken dammen polo badminton squash
      tafeltennis waterpolo curling triatlon marathon`.split(/\s+/),
  },
  {
    naam: "Een kleur",
    herken: /\bkleur(en)?\b/i,
    woorden: "rood blauw geel groen oranje paars roze wit zwart grijs bruin beige goud zilver turquoise lila indigo magenta oker ivoor".split(" "),
  },
  {
    naam: "Een land",
    herken: /\b(land(en)?|staat)\b/i,
    woorden: `nederland belgie duitsland frankrijk spanje italie portugal engeland schotland ierland noorwegen zweden finland denemarken polen
      oostenrijk zwitserland griekenland turkije rusland china japan india brazilie argentinie mexico canada amerika egypte marokko kenia
      australie chili peru cuba ijsland hongarije kroatie roemenie`.split(/\s+/),
  },
];

// Woorden uit een lijst die bij de vraag past, met het gevraagde aantal letters (in willekeurige volgorde)
export function woordenUitLijst(vraag: string, lengte: number | null): { woord: string; omschrijving: string }[] {
  const thema = THEMAS.find((t) => t.herken.test(vraag));
  if (!thema) return [];
  return thema.woorden
    .filter((w) => w && (!lengte || w.length === lengte))
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
    .map((w) => ({ woord: w.toUpperCase(), omschrijving: `${thema.naam} (${w.length} letters)` }));
}
