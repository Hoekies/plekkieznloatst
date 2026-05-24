import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "@/styles/globals.css";
import GeenInternet from "@/components/shared/GeenInternet";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Plekkie z'n Loatst",
  description: "Route-gebaseerd quizspel op een kaart",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1B36",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className={nunito.variable}>
        <GeenInternet />
        {children}
      </body>
    </html>
  );
}
