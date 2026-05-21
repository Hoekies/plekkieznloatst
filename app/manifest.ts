import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plekkie z'n Loatst",
    short_name: "Plekkie",
    description: "Route-gebaseerd quizspel op een kaart",
    start_url: "/",
    display: "standalone",
    background_color: "#0A1B36",
    theme_color: "#0A1B36",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
