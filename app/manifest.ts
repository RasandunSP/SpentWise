import type { MetadataRoute } from "next";

/**
 * Web app manifest. iOS Safari reads `display`, `name` and `start_url` from
 * here once the app is on the home screen; the icons it uses come from the
 * apple-touch-icon links in app/layout.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SpentWise — Expense Tracker",
    short_name: "SpentWise",
    description: "A calm, private place to track what you spend.",
    lang: "en",
    dir: "ltr",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The splash screen cannot follow the system scheme — a manifest carries
    // one colour — so both match the light theme's paper, which is also what
    // an install preview renders against. app/layout.tsx still ships a
    // per-scheme `theme-color`, so the live chrome does adapt.
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Padded so Android's adaptive mask can't clip the wallet mark.
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Add expense",
        short_name: "Add",
        url: "/add",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
