import Link from "next/link";

// 🧭 Snel aan de slag: de handleiding voor een nieuwe beheerder, stap voor stap van route tot uitslag.
// De plaatjes zijn nagebouwde schermpjes met de echte knoppen en kleuren van de app; 👆 wijst aan
// waar je klikt. De volledige uitleg staat in de handleiding (/admin/uitleg).

// ── Bouwstenen voor de schermpjes ────────────────────────────────────────────
function Scherm({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <figure className="sg-scherm" aria-hidden>
      <div className="sg-scherm-balk"><i /><i /><i /><span>{titel}</span></div>
      <div className="sg-scherm-inhoud">{children}</div>
    </figure>
  );
}
function Knop({ children, soort = "", wijs = false }: { children: React.ReactNode; soort?: string; wijs?: boolean }) {
  return <span className={`rl-knop ${soort} sg-knop${wijs ? " sg-wijs" : ""}`}>{children}{wijs && <b className="sg-hand">👆</b>}</span>;
}
function Menu({ actief }: { actief: string }) {
  const items = ["🏠 Dashboard", "👫 Spelers", "📝 Antwoorden", "📡 Live kaart", "🗺️ Routes"];
  return (
    <div className="sg-menu">
      {items.map((i) => <span key={i} className={`sg-menu-item${i.includes(actief) ? " sg-menu-item--aan sg-wijs" : ""}`}>{i}{i.includes(actief) && <b className="sg-hand">👆</b>}</span>)}
    </div>
  );
}
function MiniKaart({ punten = 4, finish = true, item = false }: { punten?: number; finish?: boolean; item?: boolean }) {
  const plekken: [number, number][] = [[18, 70], [38, 35], [62, 58], [80, 28], [50, 80]];
  return (
    <div className="sg-kaart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={plekken.slice(0, punten).map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="#8b5cf6" strokeWidth="1.2" strokeDasharray="3 3" />
      </svg>
      {plekken.slice(0, punten).map(([x, y], i) => (
        <span key={i} className={`sg-pin${i === 0 ? " sg-pin--start" : ""}${finish && i === punten - 1 ? " sg-pin--finish" : ""}`} style={{ left: `${x}%`, top: `${y}%` }}>
          {i === 0 ? "🚩" : finish && i === punten - 1 ? "🏁" : i}
        </span>
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item && <img src="/items/ster.webp" alt="" className="sg-item" style={{ left: "48%", top: "50%" }} />}
    </div>
  );
}
function Stap({ nr, titel, plaatje, children }: { nr: number; titel: string; plaatje: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="sg-stap pr-gem-panel" id={`stap-${nr}`}>
      <div className="pr-gem-panel-inner sg-stap-inner">
        <div className="sg-stap-tekst">
          <h2><span className="sg-nr">{nr}</span>{titel}</h2>
          {children}
        </div>
        <div className="sg-stap-plaatje">{plaatje}</div>
      </div>
    </section>
  );
}

export default function BeginnenPagina() {
  return (
    <>
      <style>{`
        .sg { max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
        .sg-intro p { margin: 0; color: var(--text); line-height: 1.6; }
        .sg-intro a { color: #FFE680; font-weight: 700; }
        .sg-route { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 10px; }
        .sg-route a { text-decoration: none; }
        .sg-route .rl-knop { height: 34px; font-size: 0.82rem; }
        .sg-stap-inner { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
        @media (max-width: 860px) { .sg-stap-inner { grid-template-columns: 1fr; } }
        .sg-stap h2 { margin: 0 0 10px; display: flex; align-items: center; gap: 10px; font-family: var(--font-display); font-size: 1.3rem; color: #fff; }
        .sg-nr { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(180deg, #ffd93b, #f5a623); color: #3a1f80;
          display: inline-flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0; }
        .sg-stap ol, .sg-stap ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 7px; line-height: 1.55; color: var(--text); }
        .sg-stap li strong { color: #fff; }
        .sg-tip { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: rgba(255,217,59,0.1); border: 1px solid rgba(255,217,59,0.4); color: #FFE58A; font-size: 0.86rem; line-height: 1.5; }
        .sg-scherm { margin: 0; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,0.18); background: #1c0c45; box-shadow: 0 10px 30px rgba(0,0,0,0.35); }
        .sg-scherm-balk { display: flex; align-items: center; gap: 5px; padding: 7px 10px; background: rgba(255,255,255,0.08); font-size: 0.7rem; color: var(--muted); }
        .sg-scherm-balk i { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.25); }
        .sg-scherm-balk span { margin-left: 6px; }
        .sg-scherm-inhoud { padding: 12px; display: flex; flex-direction: column; gap: 10px; background: var(--game-gradient); }
        .sg-rij { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .sg-knop { position: relative; height: 32px; font-size: 0.78rem; pointer-events: none; }
        .sg-wijs { outline: 2px solid #ffd93b; outline-offset: 2px; box-shadow: 0 0 18px rgba(255,217,59,0.55); }
        .sg-hand { position: absolute; right: -8px; bottom: -16px; font-size: 1.15rem; animation: sg-tik 1.4s ease-in-out infinite; }
        @keyframes sg-tik { 50% { transform: translate(-3px, -4px); } }
        .sg-menu { display: flex; flex-direction: column; gap: 5px; }
        .sg-menu-item { position: relative; padding: 6px 10px; border-radius: 9px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); font-size: 0.78rem; font-weight: 700; color: #fff; }
        .sg-menu-item--aan { background: linear-gradient(180deg, #ff9f1a, #e35d00); }
        .sg-kaart { position: relative; height: 150px; border-radius: 10px; overflow: hidden;
          background: repeating-linear-gradient(0deg, transparent 0 26px, #d5dbe2 26px 28px), repeating-linear-gradient(90deg, transparent 0 34px, #d5dbe2 34px 36px), #e9edf1; }
        .sg-kaart svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .sg-pin { position: absolute; transform: translate(-50%, -50%); width: 24px; height: 24px; border-radius: 50%; background: #1E40AF; border: 2px solid #fff;
          color: #fff; font-size: 0.7rem; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
        .sg-pin--start, .sg-pin--finish { background: #fff; font-size: 0.8rem; }
        .sg-item { position: absolute; width: 26px; height: 26px; transform: translate(-50%, -50%); }
        .sg-veld { padding: 7px 10px; border-radius: 9px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); font-size: 0.78rem; color: #fff; }
        .sg-veld small { display: block; font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .sg-kaartje { display: flex; gap: 10px; align-items: center; padding: 10px; border-radius: 12px; border: 2px solid rgba(255,217,59,0.6);
          background: linear-gradient(165deg, #5b34a8, #2a1566); }
        .sg-qr { width: 54px; height: 54px; border-radius: 6px; background: #fff repeating-linear-gradient(45deg, #000 0 3px, #fff 3px 6px); flex-shrink: 0; }
        .sg-teamkaart { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); }
        .sg-teamkop { display: flex; align-items: center; gap: 8px; font-weight: 800; color: #fff; font-size: 0.85rem; }
        .sg-teamkop em { margin-left: auto; font-style: normal; color: #FFE680; }
        .sg-faq { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 700px) { .sg-faq { grid-template-columns: 1fr; } }
        .sg-faq div { padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); font-size: 0.88rem; line-height: 1.5; color: var(--text); }
        .sg-faq strong { display: block; color: #fff; margin-bottom: 4px; }
      `}</style>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">🧭 Snel aan de slag</span>
      </div>
      <div className="admin-content">
        <div className="sg">
          <div className="pr-gem-panel"><div className="pr-gem-panel-inner sg-intro">
            <p><strong>Nieuw als beheerder?</strong> Volg deze 6 stappen, van een lege kaart tot de uitslag. Op de plaatjes wijst 👆 aan waar je klikt. Meer weten over een onderdeel? Kijk dan in de <Link href="/admin/uitleg">volledige handleiding</Link>.</p>
            <div className="sg-route">
              {["Route maken", "Items", "Spelers", "Starten", "Tijdens het spel", "Afronden"].map((t, i) => (
                <a key={t} href={`#stap-${i + 1}`} className="rl-knop">{i + 1}. {t}</a>
              ))}
            </div>
          </div></div>

          <Stap nr={1} titel="Een route maken" plaatje={
            <Scherm titel="Routes">
              <Menu actief="Routes" />
              <div className="sg-rij"><Knop soort="rl-knop--cyan" wijs>+ Nieuwe route</Knop></div>
              <MiniKaart />
            </Scherm>
          }>
            <ol>
              <li>Klik in het menu op <strong>🗺️ Routes</strong> en daarna op <strong>+ Nieuwe route</strong>.</li>
              <li>Geef de route een naam en kies het spel: <strong>🎯 Op volgorde</strong> (iedereen loopt dezelfde punten na elkaar) of <strong>🔄 Rondje</strong> (elk team begint op een ander punt).</li>
              <li>Er opent een venster <strong>🚀 Eerste stappen</strong>: zoek de plaats, tik het <strong>startpunt</strong> 🚩 aan, dan de <strong>punten</strong> en de <strong>finish</strong> 🏁.</li>
              <li>Klik in de lijst op een punt om er een <strong>vraag</strong> bij te maken: meerkeuze, open vraag, foto-opdracht of stemvraag.</li>
            </ol>
            <div className="sg-tip">💻 Een route maak je het makkelijkst op een computer: dan zie je de kaart en de lijst tegelijk.</div>
          </Stap>

          <Stap nr={2} titel="Items op de kaart (mag ook later)" plaatje={
            <Scherm titel="Route bewerken">
              <MiniKaart item />
              <div className="sg-rij"><Knop>🎁 Item</Knop><Knop soort="rl-knop--cyan" wijs>✨ Items automatisch plaatsen</Knop></div>
            </Scherm>
          }>
            <ul>
              <li>Items maken het spel spannend: een <strong>⭐ ster</strong> geeft punten, met een <strong>💣 bom</strong> pakt een team punten af van een ander.</li>
              <li><strong>Rondje:</strong> klik op <strong>✨ Items automatisch plaatsen</strong>; de app zet er zelf genoeg neer, netjes op de weg.</li>
              <li>Zelf neerzetten: tik op de kaart en kies <strong>🎁 Item</strong>.</li>
              <li>Bij <strong>Op volgorde</strong> krijgt elk team een 🍌 banaan bij de start; op de kaart kun je ⛔ plek-zooi-vallen zetten.</li>
            </ul>
          </Stap>

          <Stap nr={3} titel="Spelers aanmaken en het kaartje sturen" plaatje={
            <Scherm titel="Spelers">
              <div className="sg-rij"><Knop soort="rl-knop--cyan" wijs>+ Nieuwe speler</Knop><Knop>👫 Meerdere</Knop><Knop>🖨️ Alle kaartjes</Knop></div>
              <div className="sg-kaartje">
                <span className="sg-qr" />
                <span style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                  <span className="sg-veld"><small>Loginnaam</small>speler1</span>
                  <span className="sg-veld"><small>Wachtwoord</small>zonnebloem</span>
                </span>
              </div>
              <div className="sg-rij"><Knop soort="rl-knop--groen">💬 WhatsApp</Knop></div>
            </Scherm>
          }>
            <ol>
              <li>Klik op <strong>👫 Spelers</strong> en dan op <strong>+ Nieuwe speler</strong>. Elk team krijgt één speler (één telefoon per team).</li>
              <li>Vul een <strong>loginnaam</strong> in, bijvoorbeeld <em>speler1</em>. Het wachtwoord bedenkt de app zelf.</li>
              <li>Je krijgt meteen het <strong>inlogkaartje</strong> met een QR-code. Stuur het via <strong>WhatsApp</strong>, of print alle kaartjes met <strong>🖨️ Alle kaartjes</strong>.</li>
              <li>Veel teams? Gebruik <strong>👫 Meerdere</strong>: alle spelers in één keer.</li>
            </ol>
            <div className="sg-tip">📷 Het team scant de QR-code op het kaartje en is meteen ingelogd (48 uur). Daarna kan het altijd met loginnaam en wachtwoord.</div>
          </Stap>

          <Stap nr={4} titel="Controleren en starten" plaatje={
            <Scherm titel="Route bewerken">
              <div className="sg-rij"><Knop>✏️ Bewerken</Knop><Knop>🩺 Controleren</Knop><Knop soort="rl-knop--groen" wijs>▶ Starten</Knop></div>
              <div className="sg-veld">🩺 Klaar om te spelen? <br />✅ 8 punten · ✅ 8 vragen · ✅ finish</div>
            </Scherm>
          }>
            <ol>
              <li>Klik in de route op <strong>▶ Starten</strong>. De app controleert eerst of alles klopt: punten, vragen, finish.</li>
              <li>Mist er iets? Dan staat er wat je nog moet doen. Klopt alles, dan start je de route.</li>
              <li>De teams kunnen nu beginnen: inloggen, teamnaam kiezen en <strong>Op pad!</strong></li>
            </ol>
            <div className="sg-tip">🏠 Op het <strong>Dashboard</strong> staat ook een stappenplan <strong>Spel klaarzetten</strong> dat je hier doorheen leidt.</div>
          </Stap>

          <Stap nr={5} titel="Tijdens het spel" plaatje={
            <Scherm titel="Dashboard">
              <div className="sg-rij"><Knop>⏸️ Pauze</Knop><Knop>🏆 Tussenstand</Knop><Knop>⏰ Eindtijd</Knop></div>
              <div className="sg-teamkaart">
                <div className="sg-teamkop">🐸 Team Kikker <em>120 pt</em></div>
                <div className="sg-rij"><Knop wijs>⏭️ Vrijgeven</Knop><Knop>± Punten</Knop><Knop>💬 Contact</Knop></div>
              </div>
            </Scherm>
          }>
            <ul>
              <li><strong>🏠 Dashboard:</strong> de stand van alle teams. Het blok <strong>🎯 Spelleider</strong> laat zien wat je aandacht nodig heeft, zoals hulpvragen en foto&apos;s.</li>
              <li><strong>📡 Live kaart:</strong> zie waar iedereen loopt.</li>
              <li>Kan een team een punt niet bereiken? Klik op <strong>⏭️ Vrijgeven</strong>: het team krijgt de vraag meteen.</li>
              <li>Bonus of straf? <strong>± Punten</strong>, met een reden. Het team ziet het meteen in beeld.</li>
              <li><strong>📢 Bericht sturen</strong> (rechtsboven): een bericht aan alle teams of aan één team.</li>
              <li>Even wachten? <strong>⏸️ Pauze</strong> zet alle teams stil.</li>
            </ul>
          </Stap>

          <Stap nr={6} titel="Afronden en de uitslag" plaatje={
            <Scherm titel="Antwoorden">
              <Menu actief="Antwoorden" />
              <div className="sg-rij"><Knop>📸 Foto&apos;s keuren</Knop><Knop soort="rl-knop--goud" wijs>🏆 Uitslag vrijgeven</Knop></div>
            </Scherm>
          }>
            <ol>
              <li>Iedereen binnen? Klik bij <strong>🎯 Spelleider</strong> op <strong>🏁 Spel afronden</strong>.</li>
              <li>Ga naar <strong>📝 Antwoorden</strong> en keur de <strong>foto&apos;s</strong>: goed of fout.</li>
              <li>Klik op <strong>🏆 Uitslag vrijgeven</strong>: alle teams zien de eindstand en hun oorkonde.</li>
              <li>Wil je een verslag? Met <strong>📄 Rapport delen</strong> stuur je de uitslag als PDF.</li>
            </ol>
          </Stap>

          <div className="pr-gem-panel"><div className="pr-gem-panel-inner">
            <h2 style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", color: "#fff" }}>🆘 Hulp bij problemen</h2>
            <div className="sg-faq">
              <div><strong>Een team kan niet inloggen</strong>Bij 👫 Spelers: <em>🔓 Apparaat</em> (de vorige telefoon loslaten) of 🔑 een nieuw kaartje sturen.</div>
              <div><strong>Een punt is niet te bereiken</strong>Op het dashboard bij het team: <em>⏭️ Vrijgeven</em>. Het team krijgt de vraag waar het ook is.</div>
              <div><strong>Verkeerde punten gegeven</strong>Op het dashboard: <em>± Punten</em> met een reden (een minteken haalt punten eraf).</div>
              <div><strong>Werkt iets niet?</strong>Kijk bij <em>🩺 Systeemcheck</em> (menu, onder ⚙️ Instellingen): daar staat wat er mist en hoe je het oplost.</div>
            </div>
          </div></div>
        </div>
      </div>
    </>
  );
}
