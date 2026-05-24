"use client";

import { useRouter } from "next/navigation";
import type { TerugkijkItem } from "@/app/speler/terugkijk/page";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function afbeeldingUrl(bucket: string, pad: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${pad}`;
}

const TYPE_LABEL: Record<string, string> = {
  meerkeuze_tekst: "Meerkeuze",
  meerkeuze_afbeelding: "Meerkeuze afb.",
  open: "Open vraag",
  foto_opdracht: "Foto-opdracht",
};

export default function TerugkijkScherm({ items }: { items: TerugkijkItem[] }) {
  const router = useRouter();
  const totaalPunten = items.reduce((s, i) => s + i.punten_behaald, 0);
  const maxPunten = items.reduce((s, i) => s + i.max_punten, 0);

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
          {totaalPunten} van {maxPunten} punten behaald
        </p>

        {/* Punt-kaarten */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.map((item, idx) => (
            <PuntKaart key={item.punt_id} item={item} nr={idx + 1} />
          ))}
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
      border: `1.5px solid ${accentKleur}`,
      borderRadius: 16, padding: "16px 18px",
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
          {item.vraag_type && (
            <span style={{
              fontSize: "0.65rem", fontWeight: 700,
              background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)",
              borderRadius: 99, padding: "2px 8px",
            }}>{TYPE_LABEL[item.vraag_type]}</span>
          )}
          <span style={{
            fontSize: "0.82rem", fontWeight: 800,
            color: isInfo ? "rgba(255,255,255,0.6)" : isCorrect ? "#4ade80" : isCorrect === false ? "#f87171" : "#fbbf24",
          }}>
            {isInfo ? "" : (isCorrect === null ? "⏳" : isCorrect ? "✓" : "✗")}
            {" "}{item.punten_behaald}<span style={{ fontWeight: 400, fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>/{item.max_punten} pt</span>
          </span>
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

      {/* Meerkeuze antwoorden */}
      {(item.vraag_type === "meerkeuze_tekst" || item.vraag_type === "meerkeuze_afbeelding") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <AntwoordRij
            label="Jouw antwoord"
            tekst={item.gekozen_antwoord_tekst}
            afbeelding={item.gekozen_antwoord_afbeelding}
            goed={item.is_correct === true}
            fout={item.is_correct === false}
          />
          {item.is_correct === false && (
            <AntwoordRij
              label="Juiste antwoord"
              tekst={item.juiste_antwoord_tekst}
              afbeelding={item.juiste_antwoord_afbeelding}
              goed
            />
          )}
        </div>
      )}

      {/* Open antwoord */}
      {item.vraag_type === "open" && item.open_antwoord && (
        <div style={{
          background: "rgba(255,255,255,0.08)", borderRadius: 10,
          padding: "8px 12px",
          display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Jouw antwoord</span>
          <span style={{ fontSize: "0.88rem", color: "#fff", fontWeight: 600 }}>{item.open_antwoord}</span>
          <span style={{ marginLeft: "auto", fontSize: "1rem" }}>{item.is_correct ? "✅" : "❌"}</span>
        </div>
      )}

      {/* Foto-opdracht */}
      {isFoto && item.foto_pad && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <img
            src={afbeeldingUrl("foto-inzendingen", item.foto_pad)}
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
        <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "0.82rem" }}>Geen foto ingediend.</p>
      )}
    </div>
  );
}

function AntwoordRij({
  label, tekst, afbeelding, goed, fout,
}: {
  label: string;
  tekst: string | null;
  afbeelding: string | null;
  goed?: boolean;
  fout?: boolean;
}) {
  const kleur = goed ? "#4ade80" : fout ? "#f87171" : "rgba(255,255,255,0.7)";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 12px",
    }}>
      <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)", minWidth: 80 }}>{label}</span>
      {afbeelding ? (
        <img
          src={afbeeldingUrl("vraag-afbeeldingen", afbeelding)}
          alt=""
          style={{ height: 48, width: 64, objectFit: "contain", borderRadius: 6, background: "rgba(0,0,0,0.2)" }}
        />
      ) : (
        <span style={{ fontWeight: 600, fontSize: "0.88rem", color: kleur, flex: 1 }}>{tekst ?? "—"}</span>
      )}
      <span style={{ fontSize: "1rem", marginLeft: "auto" }}>{goed ? "✅" : fout ? "❌" : ""}</span>
    </div>
  );
}
