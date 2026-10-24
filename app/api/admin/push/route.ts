import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { stuurPushNaarBeheer } from "@/lib/push";

// Pushmeldingen voor de beheerder: een toestel aanmelden (POST), afmelden (DELETE)
// of een testmelding sturen (PUT).
export async function POST(request: NextRequest) {
  const user = await haalGebruiker();
  if (!isBeheer(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint, p256dh = body?.keys?.p256dh, auth = body?.keys?.auth;
  if (typeof endpoint !== "string" || !/^https:\/\//.test(endpoint) || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ fout: "Ongeldige aanmelding" }, { status: 400 });
  }
  const toestel = typeof body?.toestel === "string" ? body.toestel.slice(0, 40) : null;

  const admin = createAdminClient();
  const { error } = await admin.from("push_abonnementen")
    .upsert({ user_id: user.id, endpoint, p256dh, auth, toestel }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.endpoint !== "string") return NextResponse.json({ fout: "endpoint ontbreekt" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("push_abonnementen").delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}

export async function PUT() {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const r = await stuurPushNaarBeheer({
    titel: "🔔 Testmelding",
    tekst: "Pushmeldingen werken. Je krijgt een melding bij een nieuwe foto of een hulpvraag.",
    url: "/admin",
    tag: "test",
  });
  if (!r.verstuurd) return NextResponse.json({ fout: "Er is geen toestel aangemeld, of de sleutels ontbreken op de server" }, { status: 400 });
  return NextResponse.json({ ok: true, ...r });
}
