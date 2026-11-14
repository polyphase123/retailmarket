// RetailMarket PH offline cache. Bump VERSION whenever app files change.
const VERSION = "rmph-v3-2026-11-14";
const SHELL = [
  "./", "./index.html", "./style.css", "./app.js", "./features.js", "./data.js", "./faq_data.js",
  "./extras.js", "./changes.js", "./manifest.webmanifest", "./vendor/leaflet.js", "./vendor/leaflet.css",
  "./vendor/fonts/archivo-latin-wdth-normal.woff2", "./vendor/fonts/archivo-latin-ext-wdth-normal.woff2",
  "./icons/icon-192.png", "./icons/icon-512.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Map tiles: network first, fall back to whatever was cached while online
  if (url.hostname.endsWith("arcgisonline.com")) {
    e.respondWith(fetch(e.request).then((r) => {
      const copy = r.clone(); caches.open(`${VERSION}-tiles`).then((c) => c.put(e.request, copy)); return r;
    }).catch(() => caches.match(e.request)));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
  }
});
