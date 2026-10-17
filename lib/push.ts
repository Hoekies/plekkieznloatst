import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase-admin";

// Pushmelding naar alle toestellen van de beheerder (ook als de app dicht is).
// Mag het spel nooit ophouden of laten mislukken: fouten worden genegeerd, en een toestel
// dat niet meer bestaat (afgemeld of app verwijderd) wordt opgeruimd.

const PUBLIEK = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVE = process.env.VAPID_PRIVATE_KEY ?? "";
let klaar = false;

function zetSleutels(): boolean {
  if (klaar) return true;
  if (!PUBLIEK || !PRIVE) return false;
  // Het "onderwerp" is verplicht voor de meldingendiensten: het adres van de app
  webpush.setVapidDetails(process.env.NEXT_PUBLIC_SITE_URL || "https://plekkieznloatst.vercel.app", PUBLIEK, PRIVE);
  klaar = true;
  return true;
}

export type PushBericht = {
  titel: string;
  tekst: string;
  url: string;      // pagina die opent bij een tik op de melding
  tag?: string;     // zelfde tag = de vorige melding wordt vervangen in plaats van opgestapeld
};

export async function stuurPushNaarBeheer(bericht: PushBericht): Promise<{ verstuurd: number; mislukt: number }> {
  if (!zetSleutels()) return { verstuurd: 0, mislukt: 0 };
  try {
    const admin = createAdminClient();
    const { data: abonnementen } = await admin.from("push_abonnementen").select("id, endpoint, p256dh, auth");
    if (!abonnementen?.length) return { verstuurd: 0, mislukt: 0 };

    const inhoud = JSON.stringify(bericht);
    const resultaten = await Promise.allSettled(abonnementen.map((a) =>
      webpush.sendNotification(
        { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
        inhoud,
        { TTL: 15 * 60, urgency: "high", timeout: 5000 },
      ),
    ));

    const weg: string[] = [];
    const gebruikt: string[] = [];
    resultaten.forEach((r, i) => {
      if (r.status === "fulfilled") gebruikt.push(abonnementen[i].id);
      else {
        const code = (r.reason as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) weg.push(abonnementen[i].id);  // toestel bestaat niet meer
      }
    });
    await Promise.all([
      weg.length ? admin.from("push_abonnementen").delete().in("id", weg) : null,
      gebruikt.length ? admin.from("push_abonnementen").update({ laatst_gebruikt: new Date().toISOString() }).in("id", gebruikt) : null,
    ]);
    return { verstuurd: gebruikt.length, mislukt: abonnementen.length - gebruikt.length };
  } catch {
    return { verstuurd: 0, mislukt: 0 };
  }
}
