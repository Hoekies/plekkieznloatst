/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
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
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://unpkg.com",
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
        ],
      },
      // Afbeeldingen een dag in de browser bewaren (en daarna op de achtergrond verversen),
      // zodat iconen en logo niet bij elke pagina opnieuw gecontroleerd worden
      {
        source: "/:pad(items|kaarten)/:bestand*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/:bestand(logo.webp|logo-breed-strak.webp|handleiding.jpg|ko-fi.png)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default config;
