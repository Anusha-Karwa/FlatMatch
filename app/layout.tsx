import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { LogoMark, Skyline } from "@/components/Art";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "FlatMatch",
  description: "Three flatmates, three private forms, 2–3 flats that fit everyone, with the tradeoffs spelled out.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2e8b57",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-brand-900/5 bg-white/80 backdrop-blur-md">
          <div className="container-page flex items-center justify-between py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark />
              <span className="font-display text-xl font-semibold text-brand-900">
                Flat<span className="text-brand-500">Match</span>
              </span>
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Pune · shared 3BHKs
            </span>
          </div>
        </header>

        <main className="container-page flex-1 pb-16 pt-5 sm:pt-8">{children}</main>

        <footer className="relative mt-auto overflow-hidden bg-brand-950 text-brand-100">
          <Skyline
            className="absolute inset-x-0 top-0 h-20 w-full"
            seed="footer"
            back="rgba(46,139,87,0.16)"
            front="rgba(46,139,87,0.26)"
            windows="rgba(220,189,128,0.35)"
          />
          <div className="container-page relative flex flex-col items-center gap-2 pb-8 pt-24 text-center">
            <div className="flex items-center gap-2">
              <LogoMark className="h-7 w-7" />
              <span className="font-display text-lg text-white">FlatMatch</span>
            </div>
            <p className="text-xs text-brand-200/80">FlatMatch filters and explains. You decide together.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
