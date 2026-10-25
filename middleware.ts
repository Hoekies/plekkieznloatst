import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { middlewareMerk, MERK_HEADER } from "@/lib/middleware-merk";

// Helper van de spelleider: meekijken, foto's keuren en punten vrijgeven. Geen routes, spelers of reset.
const HELPER_PAGINAS = ["/admin", "/admin/antwoorden", "/admin/live", "/admin/uitleg", "/admin/leaderboard"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          const isDev = process.env.NODE_ENV === "development";
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, isDev ? { ...options, secure: false } : options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pad = request.nextUrl.pathname;

  // Niet ingelogd → naar login (auth-API routes zijn altijd toegankelijk)
  if (!user && pad !== "/login" && !pad.startsWith("/api/auth/") && !pad.startsWith("/gedeeld/") && !pad.startsWith("/l/")
    // Beamerscherm: openbaar met een geheime link (de sleutel controleert de API zelf)
    && !pad.startsWith("/beamer/") && !pad.startsWith("/api/beamer/")
    // Fotoalbum: openbaar met een geheime link (de pagina controleert de sleutel)
    && !pad.startsWith("/album/")
    // 🧪 Proefversie van een vraag via de QR-code: openbaar met de geheime code (de API controleert die)
    && !pad.startsWith("/proef/") && !pad.startsWith("/api/proef/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Uitgeschakelde helper: sessie beëindigen (API's krijgen 401, pagina's gaan naar de login)
  if (user && user.app_metadata?.rol === "helper" && user.app_metadata?.uitgeschakeld === true && !pad.startsWith("/api/auth/")) {
    await supabase.auth.signOut();
    const weg = pad.startsWith("/api/")
      ? NextResponse.json({ fout: "Dit account is uitgeschakeld" }, { status: 401 })
      : NextResponse.redirect(new URL("/login?fout=uitgeschakeld", request.url));
    supabaseResponse.cookies.getAll().forEach((c) => weg.cookies.set(c));
    return weg;
  }

  // Admin-pagina's: alleen voor admins, en voor helpers de pagina's voor tijdens het spel
  if (user && pad.startsWith("/admin")) {
    const rol = user.app_metadata?.rol;
    if (rol === "helper") {
      if (!HELPER_PAGINAS.some((p) => pad === p || pad.startsWith(`${p}/`))) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    } else if (rol !== "admin") {
      return NextResponse.redirect(new URL("/speler", request.url));
    }
  }

  // Speler-pagina's: alleen voor spelers
  if (user && pad.startsWith("/speler")) {
    const rol = user.app_metadata?.rol;
    if (rol === "admin" || rol === "helper") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // Gecontroleerde gebruiker doorgeven aan pagina's en API's (lib/auth-server.ts), zodat die
  // niet opnieuw bij Supabase hoeven te vragen wie er ingelogd is. Eventueel meegestuurde
  // waarden van buitenaf worden altijd eerst weggehaald.
  const headers = new Headers(request.headers);
  headers.delete("x-pr-user-id");
  headers.delete("x-pr-rol");
  headers.delete(MERK_HEADER);
  if (user) {
    // Geheim kenmerk: alleen hiermee vertrouwt de server de doorgegeven gebruiker
    headers.set(MERK_HEADER, await middlewareMerk());
    headers.set("x-pr-user-id", user.id);
    const rol = user.app_metadata?.rol;
    if (typeof rol === "string") headers.set("x-pr-rol", rol);
  }
  const antwoord = NextResponse.next({ request: { headers } });
  supabaseResponse.cookies.getAll().forEach((c) => antwoord.cookies.set(c));
  return antwoord;
}

export const config = {
  matcher: [
    // API, beheer, speler en gedeelde links: altijd langs de middleware, ook als het pad op .png e.d. eindigt
    "/api/:path*", "/admin/:path*", "/speler/:path*", "/gedeeld/:path*",
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ico|txt|xml|mjs)$).*)",
  ],
};
