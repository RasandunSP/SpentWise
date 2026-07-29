import type { Metadata, Viewport } from "next";
import { Elms_Sans } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const elmsSans = Elms_Sans({
  variable: "--font-elms-sans",
  subsets: ["latin"],
  // Variable axis — the whole 200→700 range is used by the type scale.
  weight: "variable",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpentWise",
  description: "A calm, private place to track what you spend.",
  applicationName: "SpentWise",
  appleWebApp: {
    capable: true,
    title: "SpentWise",
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${elmsSans.variable} h-full`}>
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
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
