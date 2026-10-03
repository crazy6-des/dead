/* global self */

// Vite fingerprints the application JavaScript. Persisting index.html separately
// can pair an old HTML shell with a newer deployment's hashed chunks and crash
// an installed standalone PWA while a normal browser tab works.
// Navigations therefore stay network-first; API/media are never intercepted.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") event.respondWith(fetch(event.request));
});
