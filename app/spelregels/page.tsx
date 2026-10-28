import type { Metadata } from "next";
import PrintKnop from "./PrintKnop";
import "./spelregels.css";

export const metadata: Metadata = { title: "PointRush — zo speel je", description: "De uitleg voor spelers: starten, de kaart, items en tips." };

// 📄 Spelregels als gewone tekst (audit A5-08/A5-09): dezelfde uitleg als de spelerskaart, maar te vergroten,
// voor te lezen en te doorzoeken. Openbaar (geen login), zodat de link in de groepsapp kan. Bij printen een
// lichte versie op A5: wit papier, zwarte letters, geen grote gekleurde vlakken (zie spelregels.css hiernaast).
// Houd de tekst gelijk met de kaart (docs/afbeelding-prompt-spelers-a5.md).
const ITEMS: [string, string, string][] = [
  ["ster", "Ster", "meteen punten erbij"],
  ["verdubbeling", "Verdubbeling", "je volgende goede antwoord telt dubbel"],
  ["radar", "Radar", "2 minuten de andere teams zien"],
  ["bom", "Bom", "een ander team verliest punten"],
  ["spook", "Spook", "hun volgende punt verdwijnt even"],
  ["dief", "Dief", "pik punten van een ander team"],
  ["banaan", "Banaan", "hun volgende twee punten ruilen"],
  ["wissel", "Wissel", "ruil je score met een ander team"],
  ["vraagteken", "Vraagteken", "een gok: punten erbij of eraf"],
  ["plekzooi", "Plek zooi", "onzichtbare val op de kaart: even stilstaan"],
];

export default function Spelregels() {
  return (
    <main className="spelregels">
      <header className="sr-kop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spellogo/breed.webp" alt="PointRush" className="sr-logo" />
        <h1>Zo speel je</h1>
        <p className="sr-doel">Beantwoord vragen en verzamel punten. <strong>Het team met de meeste punten wint.</strong></p>
      </header>

      <section>
        <h2>In 4 stappen op pad</h2>
        <ol>
          <li>Scan de QR-code op je teamkaartje.</li>
          <li>Kies een teamnaam en een icoon.</li>
          <li>Tik op <strong>OK, begrepen</strong> en sta je locatie toe. Controleer het geluid.</li>
          <li>Volg de startuitleg en loop naar het eerste punt.</li>
        </ol>
      </section>

      <section>
        <h2>Op de kaart</h2>
        <ul>
          <li>🔵 Blauw punt: hier moet je heen.</li>
          <li>🟠 Bij de start: loop het stukje langs de oranje stippellijn, dan krijg je je eerste vraag.</li>
          <li>❗ Oranje uitroepteken: je bent er, beantwoord de vraag.</li>
          <li>✅ Groen: punt gehaald.</li>
          <li>🧭 Tik op de afstand: de pijl draait mee met je telefoon.</li>
          <li>❓ Oranje ?-knop: uitleg van alles in de app.</li>
        </ul>
      </section>

      <section>
        <h2>Items</h2>
        <p>Loop langs items om ze te pakken. Ster en vraagteken werken meteen; andere items gebruik je via de balk onderin. Sommige items krijg je bij de start. Welke items er zijn, kiest de organisatie.</p>
        <ul className="sr-items">
          {ITEMS.map(([bestand, naam, uitleg]) => (
            <li key={bestand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/items/${bestand}.webp`} alt="" />
              <span><strong>{naam}</strong>: {uitleg}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Tips</h2>
        <ul>
          <li>🧩 Puzzel aan? Goede antwoorden kunnen letters opleveren. Nog letters over? Tik bij de finish op Start: 1 minuut, één poging.</li>
          <li>📸 Foto-opdracht bij de finish? Na goedkeuring staat jullie foto bij de uitslag.</li>
          <li>🔔 Klokslag? Een ander team valt je aan!</li>
          <li>⚠️ Punt niet te bereiken? Tik op <strong>Niet bereikbaar?</strong></li>
          <li>📡 Geen bereik? Speel door: de app bewaart wat je doet. Vraag niet geladen? Probeer opnieuw bij bereik of vraag de organisatie om hulp.</li>
          <li>📍 Locatie geweigerd? Zet hem aan in de instellingen van je telefoon, of vraag de organisatie.</li>
        </ul>
      </section>

      <footer className="sr-voet">
        <PrintKnop />
        <span>PointRush by Hoekies</span>
      </footer>
    </main>
  );
}
