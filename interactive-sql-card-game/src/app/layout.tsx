import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Query Clash — SQL training console",
  description:
    "Learn SQL at console speed: clause-card duels, a block-by-block query builder and a timed query-typing mode across eight training databases and three difficulty tiers. English and Russian.",
};

export const viewport: Viewport = {
  themeColor: "#131619",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&family=Manrope:wght@500;700;800&family=PT+Serif:ital@0;1&display=swap";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body className="bg-[#131619] text-[#8C9AA5] antialiased">
        <div id="shake-root">{children}</div>
      </body>
    </html>
  );
}
