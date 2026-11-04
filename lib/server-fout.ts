import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Serverfout voor de spelersapp: het team een begrijpelijke tekst, de technische melding in het logboek en in de
// foutmeldingen van de Systeemcheck
export async function serverFout(error: unknown, pad: string) {
  console.error("Serverfout", pad, error);
  const bericht = String((error as { message?: unknown } | null)?.message ?? error ?? "Onbekende fout").slice(0, 500);
  await createAdminClient().from("client_fouten").insert({ rol: "server", bericht, pad }).then(() => undefined, () => undefined);
  return NextResponse.json({ fout: "Er ging iets mis op de server, probeer het opnieuw" }, { status: 500 });
}
