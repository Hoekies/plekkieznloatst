import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase-admin";
import { hashLinkCode } from "@/lib/inlog-link";

// Inloglink: /l/<code>. Klopt de code en is hij nog geldig, dan wordt het team ingelogd zonder
// loginnaam en wachtwoord, tot de geldigheid om is (daarna logt de app het team uit).
// De link mag binnen die tijd vaker gebruikt worden; één telefoon per team blijft gelden.
export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const naar = (pad: string) => NextResponse.redirect(new URL(pad, request.url), { status: 303 });
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(params.code)) return naar("/login?fout=link-verlopen");

  const admin = createAdminClient();
  const { data: link } = await admin.from("inlog_links")
    .select("id, player_id, geldig_tot, ingetrokken")
    .eq("token_hash", hashLinkCode(params.code)).maybeSingle();
  if (!link || link.ingetrokken || new Date(link.geldig_tot).getTime() <= Date.now()) return naar("/login?fout=link-verlopen");

  const { data: speler } = await admin.from("players").select("id, auth_user_id, is_uitgeschakeld").eq("id", link.player_id).maybeSingle();
  if (!speler?.auth_user_id) return naar("/login?fout=link-verlopen");
  if (speler.is_uitgeschakeld) return naar("/login?fout=uitgeschakeld");

  // Inloggen namens het team: een eenmalige magic-link-code maken en die meteen hier verzilveren
  const { data: gebruiker } = await admin.auth.admin.getUserById(speler.auth_user_id);
  const email = gebruiker?.user?.email;
  if (!email) return naar("/login?fout=link-verlopen");
  const { data: magic, error: magicFout } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (magicFout || !magic?.properties?.hashed_token) return naar("/login?fout=link-verlopen");

  const cookiesOpzij: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: (c) => { cookiesOpzij.push(...c); } } },
  );
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: magic.properties.hashed_token });
  if (error) return naar("/login?fout=link-verlopen");

  // Toegang tot het einde van de link. Een oude uitlog-vlag blijft staan: deze verse login is nieuwer en mag
  // verder (lib/inlog-moment.ts), oude toestellen niet.
  await Promise.all([
    admin.from("players").update({ toegang_tot: link.geldig_tot }).eq("id", speler.id),
    admin.from("inlog_links").update({ laatst_gebruikt: new Date().toISOString() }).eq("id", link.id),
  ]);

  const antwoord = naar("/speler");
  const isDev = process.env.NODE_ENV === "development";
  cookiesOpzij.forEach(({ name, value, options }) => {
    antwoord.cookies.set(name, value, isDev ? { ...options, secure: false, sameSite: "lax" } : (options as Parameters<typeof antwoord.cookies.set>[2]));
  });
  return antwoord;
}
