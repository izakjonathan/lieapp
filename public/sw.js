function normalizePlayerName(name){const t=(name||'').trim();return t.toLowerCase()==='tom'?'Gaylord McFuck':name;}
const CACHE_NAME = "scoreboard-shell-v6";
const SHELL_ASSETS = ["/", "/icon.svg", "/apple-touch-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
