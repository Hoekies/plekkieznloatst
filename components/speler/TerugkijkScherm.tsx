"use client";

import { useRouter } from "next/navigation";
import type { TerugkijkItem, TerugkijkGebeurtenis } from "@/app/speler/terugkijk/page";
import { ITEM_INFO } from "./SpeciaalItemLegende";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function afbeeldingUrl(bucket: string, pad: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${pad}`;
}

// Dezelfde kleuren als de knoppen bij de vraag (VraagPopup), zodat je de vraag terugherkent
const KLEUR_KNOP: Record<string, string> = { geel: "#F59E0B", blauw: "#1E40AF", rood: "#DC2626", groen: "#15803D" };
const KLEUR_TEKST: Record<string, string> = { geel: "#2A1600", blauw: "#ffffff", rood: "#ffffff", groen: "#ffffff" };

export default function TerugkijkScherm({ items, gebeurtenissen }: { items: TerugkijkItem[]; gebeurtenissen: TerugkijkGebeurtenis[] }) {
  const router = useRouter();
  // Punten en items samen in de volgorde waarin het gebeurde
  const tijdlijn = [
    ...items.map((item, i) => ({ soort: "punt" as const, tijd: item.tijd, item, nr: i + 1 })),
    ...gebeurtenissen.map((g) => ({ soort: "item" as const, tijd: g.tijd, g })),
  ].sort((a, b) => new Date(a.tijd).getTime() - new Date(b.tijd).getTime());
  const totaalPunten = items.reduce((s, i) => s + i.punten_behaald, 0);
  const maxPunten = items.reduce((s, i) => s + i.max_punten, 0);
  // Hoeveel vragen goed (alleen vragen met goed of fout; geen infopunten of stemvragen)
  const metUitslag = items.filter((i) => i.vraag_type && i.vraag_type !== "stemvraag" && i.is_correct !== null);
  const goedAantal = metUitslag.filter((i) => i.is_correct).length;

  return (
    <div style={{
      minHeight: "100%", background: "var(--game-gradient)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "24px 16px 48px",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button
            onClick={() => router.push("/speler/finish")}
            style={{
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 10, padding: "6px 14px", color: "#fff",
              fontSize: "0.85rem", cursor: "pointer",
            }}>
            ← Terug
          </button>
          <h1 style={{ margin: 0, fontSize: "1.2rem", color: "#fff", fontWeight: 800 }}>
            Terugblik op jullie spel
          </h1>
        </div>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", marginBottom: 24, marginTop: 0 }}>
          <strong style={{ color: "#fff" }}>{goedAantal} van {metUitslag.length} vragen goed</strong> · {totaalPunten} van {maxPunten} punten uit de vragen (items tellen apart mee in je score)
        </p>

        {/* Punt-kaarten */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tijdlijn.map((t, i) => t.soort === "punt"
            ? <PuntKaart key={t.item.punt_id} item={t.item} nr={t.nr} />
            : <ItemKaart key={`item-${i}`} g={t.g} />)}
        </div>
      </div>
    </div>
  );
}

function PuntKaart({ item, nr }: { item: TerugkijkItem; nr: number }) {
  const isCorrect = item.is_correct;
  const isFoto = item.vraag_type === "foto_opdracht";
  const isInfo = item.vraag_type === null;

  const accentKleur = isInfo
    ? "rgba(6,182,212,0.7)"
    : isCorrect === true
    ? "rgba(34,197,94,0.7)"
    : isCorrect === false
    ? "rgba(239,68,68,0.7)"
    : "rgba(234,179,8,0.7)"; // foto wacht of null

  return (
    <div style={{
      background: "rgba(255,255,255,0.08)",
      backdropFilter: "blur(14px) saturate(120%)",
      WebkitBackdropFilter: "blur(14px) saturate(120%)",
      border: "1px solid rgba(255,255,255,0.14)", borderLeft: `5px solid ${accentKleur}`,
      borderRadius: 16, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* Puntnaam + badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: "0.68rem", fontWeight: 700,
            background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)",
            borderRadius: 99, padding: "2px 8px",
          }}>{nr}</span>
          <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>{item.punt_naam}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {!isInfo && (
            <span className={`terug-punten${isCorrect ? " terug-punten--goed" : isCorrect === false ? " terug-punten--fout" : ""}`}>
              {isCorrect === null ? "⏳" : isCorrect ? "✓" : "✗"} {item.punten_behaald} pt
            </span>
          )}
        </div>
      </div>

      {/* Vraagtekst */}
      {item.vraag_tekst && (
        <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", fontSize: "0.88rem", lineHeight: 1.5 }}>
          {item.vraag_tekst}
        </p>
      )}

      {/* Vraagafbeelding */}
      {item.vraag_afbeelding && (
        <img
          src={afbeeldingUrl("vraag-afbeeldingen", item.vraag_afbeelding)}
          alt=""
          style={{ borderRadius: 10, maxWidth: "100%", maxHeight: 160, objectFit: "contain", background: "rgba(0,0,0,0.2)" }}
        />
      )}

      {/* Meerkeuze en stemvraag: alle keuzes in hun kleur, zoals bij de vraag; ✓ = goed, label = jullie keuze */}
      {(item.vraag_type === "meerkeuze_tekst" || item.vraag_type === "stemvraag") && item.opties.length > 0 && (
        <div className="terug-opties">
          {item.opties.filter((o) => o.tekst?.trim() || o.gekozen).map((o) => (
            <div key={o.id} className={`terug-optie${o.goed ? " terug-optie--goed" : ""}${o.gekozen ? " terug-optie--gekozen" : ""}`}>
              <div className="terug-optie-knop" style={{ background: KLEUR_KNOP[o.kleur] ?? "#555", color: KLEUR_TEKST[o.kleur] ?? "#fff" }}>
                <span className="terug-optie-tekst">{o.tekst ?? "—"}</span>
                {o.goed && <span className="terug-optie-vink" aria-label="goed antwoord">✓</span>}
              </div>
              {o.gekozen && <span className={`terug-keuze${item.vraag_type === "stemvraag" ? "" : o.goed ? " terug-keuze--goed" : " terug-keuze--fout"}`}>{item.vraag_type === "stemvraag" ? "🗳️ jullie stem" : o.goed ? "✓ jullie keuze" : "✗ jullie keuze"}</span>}
              {o.uitleg && (o.gekozen || o.goed) && <span className="terug-uitleg">💬 {o.uitleg}</span>}
            </div>
          ))}
          {!item.opties.some((o) => o.gekozen) && item.vraag_type !== "stemvraag" && <span className="terug-geen">⏱️ Geen antwoord gegeven (te laat)</span>}
        </div>
      )}
      {/* Plaatjes: twee bij twee, met dezelfde markeringen */}
      {item.vraag_type === "meerkeuze_afbeelding" && item.opties.length > 0 && (
        <div className="terug-plaatjes">
          {item.opties.map((o) => (
            <div key={o.id} className={`terug-plaatje${o.goed ? " terug-optie--goed" : ""}${o.gekozen ? " terug-optie--gekozen" : ""}`} style={{ borderColor: KLEUR_KNOP[o.kleur] ?? "#555" }}>
              {o.afbeelding
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={afbeeldingUrl("vraag-afbeeldingen", o.afbeelding)} alt="" />
                : <div className="terug-plaatje-leeg" />}
              {o.goed && <span className="terug-optie-vink terug-optie-vink--hoek" aria-label="goed antwoord">✓</span>}
              {o.gekozen && <span className={`terug-keuze terug-keuze--hoek${o.goed ? " terug-keuze--goed" : " terug-keuze--fout"}`}>{o.goed ? "✓ jullie keuze" : "✗ jullie keuze"}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Open vraag: jullie antwoord, en wat goed was */}
      {item.vraag_type === "open" && (
        <div className="terug-opties">
          <div className={`terug-open${item.is_correct ? " terug-open--goed" : " terug-open--fout"}`}>
            <span className="terug-open-label">Jullie antwoord</span>
            <span className="terug-open-tekst">{item.open_antwoord || "— (geen antwoord)"}</span>
            <span aria-hidden>{item.is_correct ? "✓" : "✗"}</span>
          </div>
          {item.juiste_antwoord_tekst && (
            <div className="terug-open terug-open--juist">
              <span className="terug-open-label">{item.is_correct ? "Goed was ook" : "Goed was"}</span>
              <span className="terug-open-tekst">{item.juiste_antwoord_tekst}</span>
            </div>
          )}
        </div>
      )}

      {/* Foto-opdracht */}
      {isFoto && item.foto_pad && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <img
            src={item.foto_pad}
            alt="Ingediende foto"
            style={{ borderRadius: 10, width: "100%", maxHeight: 220, objectFit: "cover" }}
          />
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
            {item.foto_status === "goedgekeurd" && "✅ Goedgekeurd"}
            {item.foto_status === "afgekeurd" && "❌ Afgekeurd"}
            {item.foto_status === "wacht" && "⏳ Wacht nog op beoordeling"}
          </div>
        </div>
      )}
      {isFoto && !item.foto_pad && (
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem" }}>Geen foto ingediend.</p>
      )}
    </div>
  );
}

// Een ingezet of ontvangen item in de tijdlijn, met altijd tegen wie of van wie
function ItemKaart({ g }: { g: TerugkijkGebeurtenis }) {
  const naam = ITEM_INFO[g.item_type]?.naam ?? g.item_type;
  const ingezet = g.soort === "ingezet";
  const wie = ingezet
    ? g.ander_team
      ? `🎯 Tegen: ${g.ander_team}`
      : g.item_type === "vraagteken" ? "🎲 Gok — kon jullie zelf én de andere teams raken" : "✨ Voor jullie zelf"
    : g.item_type === "plekzooi"
      ? "⛔ Een verborgen val op de kaart"
      : `📨 Van: ${g.ander_team ?? "een ander team"}`;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14,
      background: ingezet ? "rgba(0,217,255,0.08)" : "rgba(255,138,0,0.1)",
      border: `1px dashed ${ingezet ? "rgba(0,217,255,0.45)" : "rgba(255,138,0,0.55)"}`,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/items/${g.item_type}.webp`} alt="" style={{ width: 40, height: 40, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", color: ingezet ? "#67E8F9" : "#FDBA74" }}>
          {ingezet ? "ITEM INGEZET" : "ITEM ONTVANGEN"}
        </div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>{naam}</div>
        <div style={{ color: "#fff", fontSize: "0.88rem", marginTop: 1 }}>{wie}</div>
        {g.omschrijving && <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", marginTop: 2 }}>{g.omschrijving}</div>}
      </div>
    </div>
  );
}
