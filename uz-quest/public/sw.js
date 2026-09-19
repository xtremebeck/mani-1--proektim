// Offline support: app shell is precached; CDN libraries are cached on first use.
// Bump CACHE whenever shipped files change.
const CACHE = "uzquest-v3";
const SHELL = [
  "./", "index.html", "landing.css", "landing.mjs",
  "app/", "app/index.html", "app/app.css", "app/app.mjs", "app/i18n.mjs", "app/local-guide.mjs",
  "shared/content.mjs", "shared/engine.mjs", "manifest.webmanifest",
  "assets/app-icon.svg", "assets/tashkent-hero.svg", "assets/registan-hero.jpg"
];
const RUNTIME_HOSTS = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));

self.addEventListener("activate", (event) => event.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
));

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.pathname.includes("/api/")) return; // always live

  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !RUNTIME_HOSTS.includes(url.hostname)) return; // map tiles etc. go straight to network

  // Network-first for same-origin so updates land quickly; cache fallback offline.
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); }
      return response;
    }).catch(async () => (await caches.match(request, { ignoreSearch: sameOrigin })) ?? (request.mode === "navigate" ? caches.match(url.pathname.includes("/app/") ? "app/index.html" : "index.html") : Response.error()))
  );
});
