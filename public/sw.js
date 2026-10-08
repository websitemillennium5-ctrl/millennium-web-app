/*
 * Millennium site service worker: keeps static assets on the device so repeat visits (and the
 * preloader) load from local cache instead of the network.
 *  - /_next/static/*  content-hashed build files  -> cache first (they never change)
 *  - /images/*, /_next/image, fonts               -> stale-while-revalidate (instant, refreshed in bg)
 * Pages themselves always come from the network, so a new deploy is picked up immediately.
 */
const VERSION = "v1";
const STATIC = `static-${VERSION}`;
const MEDIA = `media-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [STATIC, MEDIA];
      for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC));
  } else if (
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/_next/image") ||
    /\.(woff2?|ttf|otf)$/.test(url.pathname)
  ) {
    event.respondWith(staleWhileRevalidate(req, MEDIA, event));
  }
});

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, name, event) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return refresh;
}
