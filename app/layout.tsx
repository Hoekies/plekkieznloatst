import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "@/styles/globals.css";
import GeenInternet from "@/components/shared/GeenInternet";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KaartKapers",
  description: "Loop de route. Pak de punten. Saboteer je vrienden.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#081120",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={spaceGrotesk.variable}>
        <GeenInternet />
        {children}
      </body>
    </html>
  );
}
