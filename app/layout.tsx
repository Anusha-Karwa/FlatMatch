import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlatMatch",
  description: "Three flatmates, three private forms, 2–3 flats that fit everyone, with the tradeoffs spelled out.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#23857a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-black/5 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">⌂</span>
              FlatMatch
            </Link>
            <span className="text-xs text-gray-500">Pune · 3 flatmates</span>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">{children}</main>
        <footer className="mx-auto max-w-2xl px-4 pb-8 text-center text-xs text-gray-400">
          FlatMatch filters and explains. You decide together.
        </footer>
      </body>
    </html>
  );
}
