/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://unpkg.com",
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
    ];
  },
};

export default config;
