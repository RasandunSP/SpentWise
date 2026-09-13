import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

/*
 * Inter, with optical sizing switched on.
 *
 * The previous face (Elms Sans) carried only a weight axis and had no metrics
 * in Next's fallback table, which cost this app two things it actually needs:
 *
 *  - Optical sizing. This type scale runs from 11px uppercase labels to a 72px
 *    amount. A face with no `opsz` axis draws both with the same letterforms,
 *    so the large figures read slightly loose and the small labels slightly
 *    fragile. Inter reshapes across the range, which is why `opsz` is requested
 *    explicitly — Next ships only the weight axis unless asked.
 *  - A metric-matched fallback. With no metrics, the fallback and the webfont
 *    have different proportions, so the page reflows when the webfont lands.
 *    Inter has metrics, so the default `adjustFontFallback` now does its job
 *    instead of being switched off to silence a warning.
 *
 * It also has true tabular figures, which every amount in this app depends on.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // The whole 200→700 range is used by the type scale.
  weight: "variable",
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpentWise",
  description: "A calm, private place to track what you spend.",
  applicationName: "SpentWise",
  appleWebApp: {
    capable: true,
    title: "SpentWise",
    // `default` keeps the status bar legible in both schemes; `black-translucent`
    // would put white glyphs over the light theme's white header.
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: {
    telephone: false,
    date: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // No `maximumScale`/`userScalable: false`. Locking zoom is the usual way to
  // make a web app feel native, but it removes the browser's only remaining
  // magnification for anyone who needs it. The thing it is normally there to
  // prevent — iOS zooming in on a focused field — is already handled by holding
  // every input at 16px in globals.css, so the lock bought nothing.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1116" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // next-themes writes `data-theme` here before paint; suppressHydrationWarning
    // is required because that makes the server and client markup differ by design.
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Material Symbols is an icon font, so `display=block` is correct
            despite the lint rule: with `swap` the browser paints the raw
            ligature text ("shopping_cart") until the font lands. The
            no-page-custom-font rule targets the Pages Router's _document. */}
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="font-sans min-h-full flex flex-col bg-paper text-ink">
        <Providers>{children}</Providers>
        <ServiceWorker />
      </body>
    </html>
  );
}
