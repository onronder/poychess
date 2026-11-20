import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PoyChess — Bir hamle önde",
  description: "Satrancın buluşma noktası. Arkadaşınla oyna, bilgisayara meydan oku ve taktiklerle geliş.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
