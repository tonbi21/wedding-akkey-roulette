const CACHE_NAME = "wedding-akkey-roulette-v13";
const KEYCHAIN_NUMBERS = [
  1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 14, 15, 17, 18, 21, 22, 23, 24, 25, 26, 27,
  29, 31, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 47, 48
];
const PRECACHE_URLS = [
  "/",
  "/roulette",
  "/roulette/play",
  "/media/akkey-roulette-hero-web.mp4",
  "/media/tap-to-start.png",
  "/media/game-start.png",
  "/audio/wedding_akkey_roulette_retro_game_10s.mp3",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/audio/percussion_drumroll_90s.mp3?v6",
  "/audio/deceleration.mp3?v6",
  "/audio/winner.mp3?v6",
  ...KEYCHAIN_NUMBERS.map(
    (number) => `/assets/keychains/keychain-${String(number).padStart(2, "0")}.png`
  )
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch {
            // A failed optional entry should not prevent the app shell installing.
          }
        })
      );
      await self.skipWaiting();
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((response) => response || caches.match("/"))
            .then((response) => response || Response.error())
        )
    );
    return;
  }

  if (new URL(request.url).pathname.startsWith("/audio/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((response) => response || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
