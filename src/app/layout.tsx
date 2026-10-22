import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], axes: ["opsz", "SOFT"], variable: "--font-display-loaded", display: "swap" });
const ui = Inter({ subsets: ["latin"], variable: "--font-ui-loaded", display: "swap" });

export const metadata: Metadata = {
  title: "noti8",
  applicationName: "noti8",
  description: "Noticias personalizadas con fuentes visibles",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "noti8", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${ui.variable}`}>
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
