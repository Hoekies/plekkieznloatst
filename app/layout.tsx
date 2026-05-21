import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import GeenInternet from "@/components/shared/GeenInternet";

export const metadata: Metadata = {
  title: "Plekkie z'n Loatst",
  description: "Route-gebaseerd quizspel op een kaart",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0A1B36",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <GeenInternet />
        {children}
      </body>
    </html>
  );
}
