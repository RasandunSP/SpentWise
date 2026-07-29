import type { MetadataRoute } from "next";

/**
 * Web app manifest. iOS Safari reads `display`, `name` and `start_url` from
 * here once the app is on the home screen; the icons it uses come from the
 * apple-touch-icon links in app/layout.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpentWise — Expense Tracker",
    short_name: "SpentWise",
    description: "A calm, private place to track what you spend.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f9ff",
    theme_color: "#f8f9ff",
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
