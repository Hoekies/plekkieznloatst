import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Baloo_2 } from "next/font/google";
import "@/styles/globals.css";
import GeenInternet from "@/components/shared/GeenInternet";
import InAppBrowserWaarschuwing from "@/components/shared/InAppBrowserWaarschuwing";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const baloo2 = Baloo_2({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PointRush",
  description: "Loop de route. Pak de punten. Saboteer je vrienden.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: "PointRush",
    description: "Loop de route. Pak de punten. Saboteer je vrienden.",
    url: "https://plekkieznloatst.vercel.app",
    siteName: "PointRush",
    images: [{ url: "https://plekkieznloatst.vercel.app/favicon.png", width: 512, height: 512, alt: "PointRush" }],
    type: "website",
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
      <body className={`${spaceGrotesk.variable} ${baloo2.variable}`}>
        <GeenInternet />
        <InAppBrowserWaarschuwing />
        {children}
      </body>
    </html>
  );
}
