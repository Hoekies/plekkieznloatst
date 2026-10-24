"use client";

import { useEffect, useState } from "react";
import type { Speler } from "@/types/database";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import { maakKleurMap } from "@/lib/speler-kleur";
import { MeerdereSpelersKnop, InlogKlaar } from "@/components/admin/InlogUitdelen";
import { maakWachtwoord } from "@/lib/wachtwoord";
import InlogLinkSectie, { tijdTekst } from "@/components/admin/InlogLink";
import TelefoonVenster from "@/components/admin/TelefoonVenster";
import { toonTelefoon } from "@/lib/telefoon";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import LeegScherm from "@/components/admin/LeegScherm";
import StatStrook from "@/components/admin/StatStrook";
import LaadBlokjes from "@/components/shared/LaadBlokjes";
import WhatsAppKnop from "@/components/admin/WhatsAppKnop";
import { TeamnaamVenster, AlleKaartjesKnop } from "@/components/admin/SpelersExtra";
import Venster, { VensterKop } from "@/components/shared/Venster";


// heeft_spel: komt mee uit /api/admin/groepen (lopende sessie ja/nee)
type Groep = Speler & { heeft_spel?: boolean; gefinisht?: boolean };

// Status in één oogopslag: kleurstip op het icoon en een woord erbij
type Status = { sleutel: "speelt" | "ingelogd" | "gefinisht" | "uit" | "weg"; tekst: string; kleur: string; volgorde: number };
function statusVan(g: Groep): Status {
  if (g.is_uitgeschakeld) return { sleutel: "uit", tekst: "Uitgeschakeld", kleur: "#F87171", volgorde: 4 };
  if (g.heeft_spel) return { sleutel: "speelt", tekst: g.active_device_id ? "Speelt" : "Speelt · uitgelogd", kleur: "#4ADE80", volgorde: 0 };
  if (g.gefinisht) return { sleutel: "gefinisht", tekst: "Gefinisht", kleur: "#FBBF24", volgorde: 2 };
  if (g.active_device_id) return { sleutel: "ingelogd", tekst: "Ingelogd", kleur: "#22D3EE", volgorde: 1 };
  return { sleutel: "weg", tekst: "Niet ingelogd", kleur: "#94A3B8", volgorde: 3 };
}
type Sortering = "naam" | "status" | "nieuw";

// helper: wachtwoord van een helper (gaat via /api/admin/helpers)
// Inloggegevens versturen (met een nieuw wachtwoord); helper = via /api/admin/helpers
export type BeheerModal = { id: string; groepNaam: string; icoon: string | null; login: string | null; helper?: boolean; toegangTot?: string | null; telefoon?: string | null };


export default function GroepenBeheer() {

  const [groepen, setGroepen] = useState<Groep[]>([]);
  const [laden, setLaden] = useState(true);
  const [toonFormulier, setToonFormulier] = useState(false);
  const [modal, setModal] = useState<BeheerModal | null>(null);
  // 📞 Telefoonnummer van dit team
  const [telVoor, setTelVoor] = useState<Groep | null>(null);
  const [uitOpen, setUitOpen] = useState(false);
  // ✏️ Teamnaam aanpassen
  const [naamVoor, setNaamVoor] = useState<Groep | null>(null);
  // Zoeken en sorteren (onthouden per toestel)
  const [zoek, setZoek] = useState("");
  const [sortering, setSortering] = useState<Sortering>(() => {
    try { return (localStorage.getItem("pr_spelers_sortering") as Sortering) || "naam"; } catch { return "naam"; }
  });
  function kiesSortering(s: Sortering) {
    setSortering(s);
    try { localStorage.setItem("pr_spelers_sortering", s); } catch { /* geen opslag */ }
  }

  async function laadGroepen() {
    const res = await fetch("/api/admin/groepen");
    if (res.ok) setGroepen(await res.json());
    setLaden(false);
  }

  // Elke 10 s verversen, zodat inloggen en starten van groepen vanzelf zichtbaar worden
  useEffect(() => {
    laadGroepen();
    const timer = setInterval(laadGroepen, 10000);
    return () => clearInterval(timer);
  }, []);

  async function resetApparaat(id: string) {
    const res = await fetch(`/api/admin/groepen/${id}/apparaat`, { method: "PATCH" });
    if (res.ok) setGroepen((prev) => prev.map((g) => g.id === id ? { ...g, active_device_id: null } : g));
  }

  async function logGroepUit(id: string) {
    const res = await fetch(`/api/admin/groepen/${id}/uitloggen`, { method: "PATCH" });
    if (res.ok) setGroepen((prev) => prev.map((g) => g.id === id ? { ...g, active_device_id: null } : g));
  }

  async function stopSpel(id: string, naam: string) {
    const res = await fetch(`/api/admin/groepen/${id}/spel-stoppen`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toonMelding(uitlegBijStatus(res.status, "Stoppen", data.fout), "fout"); return; }
    toonMelding(data.gestopt === 0 ? `${naam} had geen lopend spel.` : `Spel van ${naam} gestopt`, data.gestopt === 0 ? "info" : "ok");
    setGroepen((prev) => prev.map((g) => g.id === id ? { ...g, heeft_spel: false } : g));
  }

  async function verwijderSpeler(id: string) {
    const res = await fetch(`/api/admin/groepen/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toonMelding(uitlegBijStatus(res.status, "Verwijderen", data.fout), "fout"); return; }
    toonMelding(`${data.naam ?? "Speler"} is verwijderd`, "ok");
    setGroepen((prev) => prev.filter((g) => g.id !== id));
  }

  // Uitgeschakelde spelers staan apart onderaan, standaard ingeklapt
  const zoekterm = zoek.trim().toLowerCase();
  const naamVan = (g: Groep) => (g.nickname ?? g.login_name ?? "").toLowerCase();
  const gesorteerd = groepen
    .filter((g) => !zoekterm || [g.nickname, g.login_name, g.telefoon].some((v) => v?.toLowerCase().includes(zoekterm)))
    .sort((a, b) => sortering === "status" ? statusVan(a).volgorde - statusVan(b).volgorde || naamVan(a).localeCompare(naamVan(b))
      : sortering === "nieuw" ? (b.created_at ?? "").localeCompare(a.created_at ?? "")
      : naamVan(a).localeCompare(naamVan(b), "nl", { numeric: true }));
  const actieveSpelers = gesorteerd.filter((g) => !g.is_uitgeschakeld);
  // Zelfde kleur per speler als op het dashboard en de live kaart
  const kleuren = maakKleurMap(groepen.map((g) => g.id));
  const uitgeschakeld = gesorteerd.filter((g) => g.is_uitgeschakeld);

  const spelerKaart = (g: Groep) => {
    const displayNaam = g.nickname ?? g.login_name ?? "Nieuwe speler";
    const isUit = g.is_uitgeschakeld;
    const status = statusVan(g);
    return (
      <div key={g.id} className="pr-gem-card" style={{ opacity: isUit ? 0.8 : 1 }}>
       <div className="pr-gem-card-inner gb-kaart">
        {/* Icoon — zelfde formaat als de teamavatars op het dashboard; uitgeschakeld: zo hoog als de tekst */}
        <div className={`pr-gem-avatar${isUit ? " gb-avatar-uit" : " speler-ring"}`} style={{
          borderRadius: "50%",
          background: isUit ? "var(--red-soft)" : "var(--blue-soft)",
          fontWeight: 700, color: isUit ? "var(--red)" : "var(--blue)",
          ["--speler-kleur" as string]: kleuren.get(g.id),
        }}>
          {g.icon ?? displayNaam.slice(0, 2).toUpperCase()}
          <span className="gb-stip" style={{ background: status.kleur }} title={status.tekst} aria-label={status.tekst} />
        </div>

        {/* Tekst + knoppen */}
        <div className="gb-tekst" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: g.nickname ? "#fff" : "var(--muted)", fontStyle: g.nickname ? "normal" : "italic" }}>
            {g.nickname ?? "nog geen teamnaam gekozen"}
            {!isUit && <button type="button" className="gb-naam-wijzig" onClick={() => setNaamVoor(g)} title="Teamnaam aanpassen" aria-label="Teamnaam aanpassen">✏️</button>}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 1 }}>

            {g.login_name && <span><span className="gb-login-woord">Login: </span><strong style={{ color: "var(--ink)" }}>{g.login_name}</strong> · </span>}
            {g.toegang_tot && new Date(g.toegang_tot).getTime() > Date.now() && <span style={{ color: "#FFE680" }}>🔗 tot {tijdTekst(g.toegang_tot)} · </span>}
            {g.telefoon && <span className="gb-tel">📞 {toonTelefoon(g.telefoon)} · </span>}
            <span className="gb-status-pc" style={{ color: status.kleur, fontWeight: status.sleutel === "weg" ? 400 : 700 }}>{status.tekst}</span>
          </div>
        </div>

        {/* Rechts: verwijderen en de aan/uit-schakelaar */}
        {/* Op de telefoon: schakelaar naast de naam, de icoonknoppen op een eigen regel eronder */}
        <div className="gb-schakel gb-rechts">
        <div className="gb-iconen">
        {/* Alleen als er iets te ontkoppelen, uit te loggen of te stoppen valt */}
        {!isUit && g.active_device_id && (
          <button className="rl-knop gb-tekstknop" onClick={() => resetApparaat(g.id)}
            title="Toestel ontkoppelen, zodat de speler elders kan inloggen">
            <span aria-hidden>🔓</span><span className="gb-label gb-label--altijd">Apparaat</span>
          </button>
        )}
        {!isUit && g.active_device_id && (
          <button className="rl-knop rl-knop--rood gb-tekstknop" onClick={() => logGroepUit(g.id)}
            title="Uitloggen; het spel blijft staan">
            <span aria-hidden>🚪</span><span className="gb-label gb-label--altijd">Uitloggen</span>
          </button>
        )}
        {!isUit && g.heeft_spel && (
          <BevestigKnop venster icoon="⏹️" titel={`Spel van ${displayNaam} stoppen?`} className="rl-knop rl-knop--rood gb-tekstknop" onBevestig={() => stopSpel(g.id, displayNaam)}
            title="Spel stoppen: beëindigt het lopende spel van deze speler" vraag="" ja="Ja, stoppen">
            <span aria-hidden>⏹️</span><span className="gb-label gb-label--altijd">Stop spel</span>
          </BevestigKnop>
        )}
        {/* 📞 Telefoonnummer en 🔑 inloggegevens versturen (nieuw wachtwoord, kaartje via WhatsApp) */}
        {!isUit && (
          <button type="button" className={`rl-knop rl-knop--icoon gb-icoon${g.telefoon ? " rl-knop--groen" : ""}`} aria-label="Telefoonnummer"
            title={g.telefoon ? `Telefoon: ${toonTelefoon(g.telefoon)}` : "Telefoonnummer toevoegen"}
            onClick={() => setTelVoor(g)}>📞<span className="gb-label">Telefoon</span></button>
        )}
        {!isUit && (
          <button type="button" className="rl-knop rl-knop--icoon rl-knop--cyan gb-icoon" aria-label="Inloggegevens versturen"
            title="Inloggegevens versturen: nieuw wachtwoord en het kaartje via WhatsApp"
            onClick={() => setModal({ id: g.id, groepNaam: displayNaam, icoon: g.icon, login: g.login_name, toegangTot: g.toegang_tot, telefoon: g.telefoon })}>🔑<span className="gb-label">Inlog</span></button>
        )}
        <BevestigKnop venster icoon="🗑️" titel={`${displayNaam} verwijderen?`} vraag="" ja="Ja, verwijderen"
          onBevestig={() => verwijderSpeler(g.id)} disabled={!!g.heeft_spel}
          className="rl-knop rl-knop--icoon rl-knop--rood gb-verwijder"
          tip={g.heeft_spel ? "Stop eerst het spel, dan kun je verwijderen" : "Speler verwijderen (met spellen en foto's)"}>🗑️<span className="gb-label">Verwijder</span></BevestigKnop>
        </div>
        <div className="gb-schakelaar"
          title={isUit ? "Aanzetten" : "Uitzetten"}
          onClick={async () => {
            const res = await fetch(`/api/admin/groepen/${g.id}/schakel`, { method: "PATCH" });
            if (res.ok) setGroepen((prev) => prev.map((x) => x.id === g.id ? { ...x, is_uitgeschakeld: !x.is_uitgeschakeld } : x));
          }}
          style={{
            width: 42, height: 24, borderRadius: 12, flexShrink: 0,
            background: isUit ? "rgba(255,59,92,0.3)" : "rgba(34,197,94,0.3)",
            border: `1.5px solid ${isUit ? "var(--red)" : "var(--green)"}`,
            position: "relative", cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s",
          }}
        >
          <div style={{
            position: "absolute", width: 18, height: 18, borderRadius: "50%",
            background: isUit ? "var(--red)" : "var(--green)",
            top: 2, left: isUit ? 2 : 20,
            transition: "left 0.2s, background 0.2s",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }} />
        </div>
        </div>
       </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Compacte strook (pc en telefoon) in plaats van vier grote tegels */}
      <StatStrook vakken={[
        { icoon: "👫", waarde: groepen.length, label: "spelers" },
        { icoon: "📱", waarde: groepen.filter((g) => g.active_device_id).length, label: "ingelogd" },
        { icoon: "⚡", waarde: groepen.filter((g) => g.heeft_spel).length, label: "speelt" },
        { icoon: "⏸", waarde: groepen.filter((g) => g.is_uitgeschakeld).length, label: "uit" },
      ]} />

      {/* Nieuwe speler en meerdere links, WhatsApp rechts */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button className="btn btn-primary actie-knop" onClick={() => setToonFormulier(true)}>
            + <span className="alleen-pc">Nieuwe speler</span><span className="alleen-mobiel">Speler</span>
          </button>
          <MeerdereSpelersKnop onKlaar={laadGroepen} />
          {groepen.some((g) => !g.is_uitgeschakeld) && <AlleKaartjesKnop />}
          {/* Inloggegevens en uitleg versturen: hier, waar je de spelers maakt */}
          <span style={{ flex: 1 }} />
          <WhatsAppKnop />
      </div>


      {/* Zoeken en sorteren: pas bij een handvol spelers */}
      {groepen.length > 4 && (
        <div className="gb-zoekbalk">
          <input className="form-input" type="search" value={zoek} onChange={(e) => setZoek(e.target.value)} placeholder="🔍 Zoek op naam, login of telefoon" />
          <div className="segment" role="radiogroup" aria-label="Sorteren">
            {([["naam", "🔤 Naam"], ["status", "⚡ Status"], ["nieuw", "🆕 Nieuwst"]] as [Sortering, string][]).map(([s, label]) => (
              <button key={s} type="button" role="radio" aria-checked={sortering === s} className={sortering === s ? "aan" : ""} onClick={() => kiesSortering(s)}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {toonFormulier && (
        <NieuwAccountForm onSuccess={laadGroepen} onSluit={() => setToonFormulier(false)} />
      )}

      {laden ? (
        <LaadBlokjes aantal={4} hoogte={76} />
      ) : groepen.length === 0 ? (
        <LeegScherm icoon="👫" knop={{ label: "+ Eerste speler aanmaken", onClick: () => setToonFormulier(true) }}>
          Nog geen spelers. Maak per team een speler aan met een loginnaam en wachtwoord.
        </LeegScherm>
      ) : (
        <div>
          {/* Actieve spelers altijd zichtbaar; uitgeschakelde spelers achter een inklapbare kop */}
          {zoekterm && gesorteerd.length === 0 && <div style={{ color: "var(--muted)", fontSize: "0.85rem", padding: 8 }}>Geen speler gevonden voor “{zoek}”.</div>}
          {actieveSpelers.map(spelerKaart)}
          {uitgeschakeld.length > 0 && (
            <>
              <button type="button" className="gb-inklap" onClick={() => setUitOpen((v) => !v)} aria-expanded={uitOpen}>
                <span aria-hidden>{uitOpen ? "▾" : "▸"}</span>
                ⏸ Uitgeschakelde spelers ({uitgeschakeld.length})
              </button>
              {uitOpen && uitgeschakeld.map(spelerKaart)}
            </>
          )}
        </div>
      )}

      {naamVoor && (
        <TeamnaamVenster spelerId={naamVoor.id} naam={naamVoor.nickname} icoon={naamVoor.icon} onSluit={() => setNaamVoor(null)}
          onOpgeslagen={(n) => setGroepen((prev) => prev.map((x) => x.id === naamVoor.id ? { ...x, nickname: n } : x))} />
      )}
      {telVoor && (
        <TelefoonVenster spelerId={telVoor.id} naam={telVoor.nickname ?? telVoor.login_name ?? "Speler"} icoon={telVoor.icon} telefoon={telVoor.telefoon ?? null}
          onSluit={() => setTelVoor(null)}
          onOpgeslagen={(t) => setGroepen((prev) => prev.map((x) => x.id === telVoor.id ? { ...x, telefoon: t } : x))} />
      )}
      {modal && (
        <WijzigVenster
          modal={modal}
          onSluit={() => setModal(null)}
          onGewijzigd={laadGroepen}
        />
      )}
    </div>
  );
}

// ── Nieuwe speler of helper: naam en een voorgesteld wachtwoord ──────────────
// Compact, in de stijl van de spelerkaarten: icoon, twee velden naast elkaar en de knoppen rechts
export function NieuwAccountForm({ helper = false, onSuccess, onSluit }: { helper?: boolean; onSuccess: () => void; onSluit: () => void }) {
  const [naam, setNaam] = useState("");
  // Alvast een makkelijk wachtwoord voorstellen (mag je aanpassen)
  const [wachtwoord, setWachtwoord] = useState(() => maakWachtwoord());
  const [fout, setFout] = useState("");
  const [laden, setLaden] = useState(false);
  // Aangemaakt: de gegevens tonen, met WhatsApp en kaartje
  const [klaar, setKlaar] = useState<{ login: string; wachtwoord: string } | null>(null);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setFout(""); setLaden(true);
    const res = await fetch(helper ? "/api/admin/helpers" : "/api/admin/groepen", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(helper ? { naam: naam.trim(), wachtwoord } : { loginNaam: naam, wachtwoord }),
    });
    const data = await res.json().catch(() => ({}));
    setLaden(false);
    if (!res.ok) { setFout(data.fout ?? "Er is een fout opgetreden"); return; }
    setKlaar(helper ? { login: data.naam, wachtwoord: data.wachtwoord } : { login: naam.trim(), wachtwoord });
    onSuccess();
  }

  if (klaar) {
    return (
      <div className="pr-gem-panel" style={{ maxWidth: 560 }}>
        <div className="pr-gem-panel-inner helper-inlog">
          <button type="button" className="editor-paneel-sluit venster-sluit" onClick={onSluit} aria-label="Sluiten">✕</button>
          <div className="pr-gem-label">✅ {helper ? "Helper" : "Speler"} aangemaakt</div>
          <InlogKlaar inlog={{ ...klaar, helper }} />
        </div>
      </div>
    );
  }

  return (
    <div className="pr-gem-card">
      <form onSubmit={opslaan} className="pr-gem-card-inner nieuwe-speler" style={{ flexWrap: "wrap", alignItems: "flex-end", position: "relative" }}>
        <button type="button" className="editor-paneel-sluit venster-sluit venster-sluit-klein" onClick={onSluit} title="Sluiten" aria-label="Sluiten">✕</button>
        <div className="pr-gem-avatar nieuwe-speler-icoon">{helper ? "🦺" : "👤"}</div>
        <div className="form-group" style={{ flex: "1 1 180px", margin: 0 }}>
          <label className="form-label">{helper ? "Naam" : "Loginnaam"}</label>
          <input className="form-input" value={naam} onChange={(e) => setNaam(e.target.value)} maxLength={helper ? 30 : undefined}
            placeholder={helper ? "bijv. Anouk" : "bijv. speler1"} required autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false}
            title={helper ? "Hiermee logt de helper in; letters en cijfers, anders dan de loginnamen van de spelers" : "Dit typt de speler in bij het inloggen; de teamnaam kiest de speler zelf bij de start"} />
        </div>
        <div className="form-group" style={{ flex: "1 1 180px", margin: 0 }}>
          <label className="form-label">Wachtwoord</label>
          <div className="ww-veld">
            <input className="form-input" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)}
              placeholder="min. 8 tekens" required minLength={8} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            <button type="button" className="rl-knop rl-knop--icoon" onClick={() => setWachtwoord(maakWachtwoord())} title="Ander voorstel">🎲</button>
          </div>
        </div>
        <div className="nieuwe-speler-knoppen" style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button type="submit" className="rl-knop hoofdknop actie-knop" disabled={laden}>{laden ? "Aanmaken…" : "Aanmaken"}</button>
        </div>
        {fout && <div className="melding melding-fout" style={{ flexBasis: "100%", margin: 0 }}><span>⚠️</span> {fout}</div>}
      </form>
    </div>
  );
}

// ── Inloggegevens versturen: loginnaam (aan te passen) en een nieuw wachtwoord, daarna WhatsApp of kaartje ──
export function WijzigVenster({ modal, onSluit, onGewijzigd }: { modal: BeheerModal; onSluit: () => void; onGewijzigd?: () => void }) {
  // Helpers loggen in met hun naam; die blijft vast
  const [login, setLogin] = useState(modal.login ?? "");
  // Het huidige wachtwoord (als het bewaard is); anders een makkelijk voorstel. 🎲 = een ander
  const [wachtwoord, setWachtwoord] = useState("");
  const [huidig, setHuidig] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let actief = true;
    fetch(modal.helper ? `/api/admin/helpers?id=${modal.id}` : `/api/admin/groepen/${modal.id}/wachtwoord`)
      .then((r) => (r.ok ? r.json() : { wachtwoord: null }))
      .catch(() => ({ wachtwoord: null }))
      .then((d: { wachtwoord?: string | null }) => {
        if (!actief) return;
        setHuidig(d.wachtwoord ?? null);
        setWachtwoord(d.wachtwoord ?? maakWachtwoord());
      });
    return () => { actief = false; };
  }, [modal.id, modal.helper]);
  const [fout, setFout] = useState("");
  const [klaar, setKlaar] = useState<{ login: string; wachtwoord: string; link?: { url: string; geldig_tot: string } | null } | null>(null);
  const [laden, setLaden] = useState(false);
  // Ook een link om direct in te loggen meesturen (schakelaar), zoveel uur geldig
  const [metLink, setMetLink] = useState(true);
  const [linkUren, setLinkUren] = useState(24);
  // Spelers: met wachtwoord, of met een link zonder wachtwoord (helpers alleen wachtwoord)
  const [modus, setModus] = useState<"wachtwoord" | "link">("wachtwoord");


  async function patch(url: string, body: object) {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return null;
    return (await res.json().catch(() => ({}))).fout ?? "Er is een fout opgetreden";
  }

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setFout("");
    setLaden(true);
    const nieuweLogin = login.trim();
    let f: string | null = null;
    // Hetzelfde wachtwoord als nu: niets aan veranderen, gewoon opnieuw versturen
    const nieuwWachtwoord = wachtwoord !== huidig;
    if (modal.helper) {
      if (nieuwWachtwoord) f = await patch("/api/admin/helpers", { id: modal.id, wachtwoord });
    } else {
      // Eerst de loginnaam (alleen als die anders is), dan het wachtwoord (alleen als het anders is)
      if (nieuweLogin && nieuweLogin !== modal.login) f = await patch(`/api/admin/groepen/${modal.id}/loginnaam`, { loginNaam: nieuweLogin });
      if (!f && nieuwWachtwoord) f = await patch(`/api/admin/groepen/${modal.id}/wachtwoord`, { wachtwoord });
      onGewijzigd?.();
    }
    // Directe inloglink erbij (alleen spelers). Lukt dat niet, dan gewoon zonder.
    let link: { url: string; geldig_tot: string } | null = null;
    if (!f && !modal.helper && metLink) {
      const res = await fetch(`/api/admin/groepen/${modal.id}/link`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uren: linkUren }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) link = { url: data.url, geldig_tot: data.geldig_tot };
      else toonMelding(`Wachtwoord opgeslagen, maar de directe link lukte niet: ${data.fout ?? "onbekende fout"}`, "fout");
    }
    setLaden(false);
    if (f) { setFout(f); return; }
    setKlaar({ login: modal.helper ? modal.login ?? modal.groepNaam : nieuweLogin, wachtwoord, link });
  }

  return (
    <Venster onSluit={onSluit} breedte={440}>
        <form onSubmit={opslaan} className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px" }}>
          {/* De speler of helper waar het om gaat */}
          <VensterKop icoon={modal.icoon ?? "👤"} label="📲 Inloggegevens versturen" titel={modal.groepNaam} onSluit={onSluit} />

          {/* Standaard: kaartje met loginnaam, wachtwoord en een directe link. Alleen een link (zonder
              wachtwoord) is een uitzondering: die staat als klein linkje onderaan */}
          {modus === "link" && !modal.helper ? (
            <>
              <InlogLinkSectie spelerId={modal.id} toegangTot={modal.toegangTot} telefoon={modal.telefoon} onGewijzigd={onGewijzigd} />
              <button type="button" className="es-link" style={{ alignSelf: "flex-start" }} onClick={() => setModus("wachtwoord")}>← Toch met wachtwoord versturen</button>
            </>
          ) : klaar ? (
            <InlogKlaar inlog={{ ...klaar, helper: modal.helper, telefoon: modal.telefoon }} />
          ) : (
            <>
              {!modal.helper && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Loginnaam</label>
                  <input className="form-input" value={login} onChange={(e) => setLogin(e.target.value)} required
                    autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                </div>
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{huidig && wachtwoord === huidig ? "Wachtwoord" : "Nieuw wachtwoord"}</label>
                <div className="ww-veld">
                  <input className="form-input" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)}
                    placeholder="min. 8 tekens" required minLength={8} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                  <button type="button" className="rl-knop rl-knop--icoon" onClick={() => setWachtwoord(maakWachtwoord())} title="Nieuw wachtwoord bedenken">🎲</button>
                </div>
                {/* Eén korte regel: het belangrijkste eerst */}
                <span className="inlog-noot">
                  {huidig === undefined ? "Huidig wachtwoord ophalen…"
                    : !huidig ? "Het oude wachtwoord is niet bewaard: dit team krijgt een nieuw."
                    : wachtwoord === huidig ? "Huidig wachtwoord. Nieuw nodig? Tik op 🎲."
                    : "Nieuw wachtwoord? Wie al is ingelogd, blijft ingelogd."}
                </span>
              </div>
              {!modal.helper && (
                <div className="form-group" style={{ margin: 0 }}>
                  <button type="button" className={`rl-knop schakel inlog-schakel${metLink ? " schakel--aan" : ""}`} role="switch" aria-checked={metLink} onClick={() => setMetLink((v) => !v)}>
                    🔗 Ook een directe inloglink meesturen<span className="schakel-bol" aria-hidden />
                  </button>
                  {metLink && (
                    <>
                      <label className="form-label" style={{ marginTop: 8 }}>Hoe lang werkt de link?</label>
                      <div className="punten-snel">
                        {[[4, "4 uur"], [12, "½ dag"], [24, "1 dag"], [48, "2 dagen"]].map(([u, label]) => (
                          <button key={u} type="button" className={`rl-knop${linkUren === u ? " rl-knop--cyan" : ""}`} onClick={() => setLinkUren(u as number)}>{label}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {fout && <div className="melding melding-fout" style={{ margin: 0 }}><span>⚠️</span> {fout}</div>}
              <button type="submit" className="rl-knop hoofdknop" style={{ height: 44 }} disabled={laden || huidig === undefined}>
                {laden ? "Bezig…" : (wachtwoord !== huidig || (!modal.helper && login.trim() !== (modal.login ?? ""))) ? "💾 Opslaan en versturen" : "📤 Versturen"}
              </button>
              {!modal.helper && (
                <button type="button" className="es-link" style={{ alignSelf: "center" }} onClick={() => setModus("link")}>🔗 Alleen een link sturen (zonder wachtwoord)</button>
              )}
            </>
          )}
        </form>
    </Venster>
  );
}
