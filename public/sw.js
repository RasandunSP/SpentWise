/*
 * SpentWise service worker.
 *
 * Deliberately conservative: it caches the static build output and an offline
 * fallback page, and never caches HTML documents or anything that touches
 * Supabase. Expense data is personal and shared devices are a real thing, so
 * stale balances are worse than an offline notice.
 */

const CACHE = "spentwise-v2"; // bumped: purges any store poisoned by a dev-mode registration
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never touch cross-origin requests — that includes every Supabase call.
  if (url.origin !== self.location.origin) return;

  // Auth routes and Server Action posts must always hit the network.
  if (url.pathname.startsWith("/auth")) return;

  // Navigations: network first, offline page as the fallback. Responses are
  // not cached, so a signed-out device can never render someone's dashboard.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // Immutable build assets: cache first, they're content-hashed.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
