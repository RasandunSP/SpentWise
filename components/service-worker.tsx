"use client";

import { useEffect } from "react";

/** Registers public/sw.js once the page is idle. Renders nothing. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // A worker registered by an earlier `next start` survives on the origin
      // — and localhost is the same origin for both builds. It then answers
      // /_next/static requests from its cache-first store, so the dev server
      // hands out one set of chunk hashes while the page loads another. That
      // shows up as hydration failures and an endless reload, which is what
      // pins the tab. Tear it down instead of leaving it to fight Turbopack.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) registration.unregister();
      });

      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            if (key.startsWith("spentwise-")) caches.delete(key);
          }
        });
      }

      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // A failed registration just means no offline fallback — not fatal.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
