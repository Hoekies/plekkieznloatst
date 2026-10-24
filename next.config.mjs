import { readFileSync } from "fs";

// Versienummer (package.json) en het moment van bouwen: zichtbaar onderin het beheermenu
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // npm run controle bouwt in een eigen map, zodat een draaiende dev-server er geen last van heeft
  distDir: process.env.PR_DIST || ".next",
  env: {
    NEXT_PUBLIC_VERSIE: version,
    NEXT_PUBLIC_BOUWDATUM: new Date().toISOString(),
  },
  experimental: {
    // Bij het wisselen tussen pagina's altijd de actuele versie ophalen (standaard 30 s bewaard)
    staleTimes: { dynamic: 0 },
    // De handleidingpagina leest het Markdown-bestand op de server; zorg dat het meegaat
    outputFileTracingIncludes: { "/admin/uitleg": ["./docs/beheerdershandleiding.md"] },
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://tiles.openfreemap.org https://service.pdok.nl https://server.arcgisonline.com",
      // tiles.openfreemap.org: vectorkaart (stijl, tegels, lettertypen, symbolen)
      // tile.openstreetmap.org: de service worker haalt ook de gewone kaartplaatjes op (en bewaart ze)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://tiles.openfreemap.org https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://service.pdok.nl https://server.arcgisonline.com",
      // De vectorkaart rekent in web workers die als blob worden gestart
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "manifest-src 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // camera=(self): alleen de eigen site, voor het scannen van het inlogkaartje (📷 Scan je kaartje)
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=(), usb=()" },
        ],
      },
      // Afbeeldingen een dag in de browser bewaren (en daarna op de achtergrond verversen),
      // zodat iconen en logo niet bij elke pagina opnieuw gecontroleerd worden
      {
        source: "/:pad(items|kaarten)/:bestand*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/:pad(maplibre|leaflet)/:bestand*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, immutable" }],
      },
      {
        source: "/:bestand(logo.webp|logo-breed-strak.webp|handleiding.jpg)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default config;
