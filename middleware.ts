import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  if (!user && pad !== "/login" && !pad.startsWith("/api/auth/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin-pagina's: alleen voor admins
  if (user && pad.startsWith("/admin")) {
    const rol = user.app_metadata?.rol;
    if (rol !== "admin") {
      return NextResponse.redirect(new URL("/speler", request.url));
    }
  }

  // Speler-pagina's: alleen voor spelers
  if (user && pad.startsWith("/speler")) {
    const rol = user.app_metadata?.rol;
    if (rol === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ico|txt|xml)$).*)"],
};
