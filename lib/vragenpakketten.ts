import type { BankVraag } from "@/components/admin/editor/Vragenbank";

// 📚 Vragenpakketten: kant-en-klare meerkeuzevragen, te kiezen in de vragenbank (📦 Pakketten). Overnemen vult alleen
// het formulier; pas na Opslaan staat de vraag in de route. Het eerste antwoord in de lijst is steeds het goede (de
// volgorde wordt bij het overnemen gehusseld).

type Pakket = { naam: string; vragen: [string, string, string, string, string][] }; // vraag, goed, fout, fout, fout

const PAKKETTEN: Pakket[] = [
  { naam: "🌍 Algemene kennis", vragen: [
    ["Hoeveel poten heeft een spin?", "8", "6", "10", "12"],
    ["Wat is de hoofdstad van Australië?", "Canberra", "Sydney", "Melbourne", "Perth"],
    ["Hoeveel minuten zitten er in een etmaal?", "1440", "1240", "1640", "2400"],
    ["Welke planeet staat het dichtst bij de zon?", "Mercurius", "Venus", "Mars", "Aarde"],
    ["Hoeveel spelers per team staan er bij voetbal op het veld?", "11", "9", "10", "12"],
    ["Wat is het scheikundige symbool van goud?", "Au", "Ag", "Go", "Gd"],
    ["Welke kleur krijg je als je blauw en geel mengt?", "Groen", "Paars", "Oranje", "Bruin"],
    ["Hoeveel continenten zijn er volgens de meest gebruikte indeling?", "7", "5", "6", "8"],
    ["In welk land staat de Eiffeltoren?", "Frankrijk", "Italië", "België", "Spanje"],
    ["Wat is het grootste dier ter wereld?", "Blauwe vinvis", "Afrikaanse olifant", "Potvis", "Giraf"],
  ] },
  { naam: "🇳🇱 Nederland", vragen: [
    ["Wat is de hoofdstad van Nederland?", "Amsterdam", "Den Haag", "Rotterdam", "Utrecht"],
    ["Hoeveel provincies heeft Nederland?", "12", "10", "11", "13"],
    ["Aan welke rivier ligt Arnhem?", "Nederrijn", "Maas", "Waal", "Schelde"],
    ["In welke provincie ligt Maastricht?", "Limburg", "Noord-Brabant", "Gelderland", "Zeeland"],
    ["Wat is het hoogste punt van Europees Nederland?", "Vaalserberg", "Posbank", "Holterberg", "Tankenberg"],
    ["Wie schilderde De Nachtwacht?", "Rembrandt", "Vermeer", "Van Gogh", "Mondriaan"],
    ["Wat is het grootste Waddeneiland?", "Texel", "Terschelling", "Ameland", "Vlieland"],
    ["Hoe heet het Nederlandse volkslied?", "Het Wilhelmus", "Wien Neêrlands Bloed", "Mijn Nederland", "Oranje Boven"],
    ["Hoe heet de dijk tussen Noord-Holland en Friesland?", "Afsluitdijk", "Houtribdijk", "Oosterscheldekering", "Brouwersdam"],
    ["Welke kleur hoort bij het Koningshuis?", "Oranje", "Rood", "Blauw", "Goud"],
  ] },
  { naam: "🧒 Kinderen", vragen: [
    ["Welk dier zegt 'boe'?", "Koe", "Schaap", "Varken", "Paard"],
    ["Hoeveel dagen heeft een week?", "7", "5", "6", "8"],
    ["Welke kleur heeft een rijpe banaan?", "Geel", "Groen", "Rood", "Blauw"],
    ["Wat eet een panda het liefst?", "Bamboe", "Vis", "Bananen", "Gras"],
    ["Hoeveel is 5 + 7?", "12", "11", "13", "14"],
    ["Welk dier kan het hardst rennen?", "Jachtluipaard", "Leeuw", "Paard", "Struisvogel"],
    ["Waar wonen de meeste pinguïns?", "Rond de Zuidpool", "Rond de Noordpool", "In de woestijn", "In de jungle"],
    ["Hoeveel poten heeft een vlinder?", "6", "4", "8", "10"],
    ["Welke vorm heeft een stopbord?", "Achthoek", "Driehoek", "Rondje", "Vierkant"],
    ["Wat wordt een rups later?", "Vlinder", "Kikker", "Bij", "Lieveheersbeestje"],
  ] },
  { naam: "🐾 Dieren en natuur", vragen: [
    ["Hoe heet een jonge kangoeroe?", "Joey", "Kalf", "Welp", "Veulen"],
    ["Welke vogel kan achteruit vliegen?", "Kolibrie", "Merel", "Mus", "Adelaar"],
    ["Hoeveel harten heeft een octopus?", "3", "1", "2", "4"],
    ["Hoe heet een groep wolven?", "Roedel", "Kudde", "Zwerm", "School"],
    ["Aan welke boom groeien eikels?", "Eik", "Beuk", "Berk", "Kastanje"],
    ["Welk dier is géén zoogdier?", "Pinguïn", "Dolfijn", "Vleermuis", "Walvis"],
    ["Waarmee ademt een vis?", "Kieuwen", "Longen", "Huid", "Vinnen"],
    ["Welk dier is het snelst in een duikvlucht?", "Slechtvalk", "Steenarend", "Zeilvis", "Jachtluipaard"],
    ["Hoe lang is een olifant ongeveer zwanger?", "22 maanden", "6 maanden", "12 maanden", "36 maanden"],
    ["Hoeveel hoorns heeft een Indische neushoorn?", "1", "2", "3", "Geen"],
  ] },
  { naam: "🎄 Feestdagen", vragen: [
    ["Op welke avond is het pakjesavond?", "5 december", "6 december", "24 december", "31 oktober"],
    ["Hoe heet het paard van Sinterklaas sinds 2019?", "Ozosnel", "Amerigo", "Bliksem", "Slechtweervandaag"],
    ["Hoeveel rendieren trekken de slee van de Kerstman (zonder Rudolf)?", "8", "6", "9", "12"],
    ["Wat eet je traditioneel met oud en nieuw?", "Oliebollen", "Pannenkoeken", "Stamppot", "Poffertjes"],
    ["Welke kleur heeft de neus van Rudolf?", "Rood", "Blauw", "Geel", "Groen"],
    ["Wanneer is het Halloween?", "31 oktober", "1 november", "11 november", "5 november"],
    ["Wat zoeken kinderen met Pasen?", "Eieren", "Kastanjes", "Schelpen", "Sleutels"],
    ["Op welke datum valt Eerste Kerstdag?", "25 december", "24 december", "26 december", "1 januari"],
    ["Wat nemen kinderen mee als ze met Sint-Maarten langs de deuren gaan?", "Een lampion", "Een zaklamp", "Een vlag", "Een fluitje"],
    ["In welk land is Thanksgiving in november een grote feestdag?", "Verenigde Staten", "Engeland", "Australië", "Ierland"],
  ] },
];

const KLEUREN = ["geel", "blauw", "rood", "groen"] as const;

// Alle pakketvragen in de vorm van de vragenbank (65 punten, antwoorden husselen aan)
export const PAKKET_VRAGEN: BankVraag[] = PAKKETTEN.flatMap((p, pi) => p.vragen.map(([vraag, goed, ...fout], vi) => ({
  id: `pakket-${pi}-${vi}`,
  type: "meerkeuze_tekst",
  question_text: vraag,
  question_image_path: null,
  points: 65,
  correct_text_answers: null,
  numeric_answer: null,
  numeric_tolerance: null,
  antwoorden_husselen: true,
  geluid_pad: null,
  tijdslimiet_seconden: null,
  answer_options: [goed, ...fout].map((tekst, i) => ({ color: KLEUREN[i], text: tekst, image_path: null, is_correct: i === 0, punten: null })),
  punt_naam: "",
  route_naam: p.naam,
  favoriet: false,
  verborgen: false,
})));
export const PAKKET_NAMEN = PAKKETTEN.map((p) => p.naam);
