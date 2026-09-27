import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Katsotaan — meidän katselulista",
  description: "Kahden katsojan yhteinen elokuvien ja sarjojen katselulista.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Katsotaan", statusBarStyle: "black-translucent" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon-180.png",
  },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#111214" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
