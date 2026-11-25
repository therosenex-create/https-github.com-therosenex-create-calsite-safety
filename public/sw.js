/* CalSite Safety service worker.
 *
 * Cache policy for an authenticated safety-records app:
 * - Never cache /api, /auth, session, or RSC payloads.
 * - Never cache HTML for /app, /sign-in, or any other record page.
 * - Cache only hashed Next.js build files (/_next/static) and this offline page.
 * - A failed navigation shows /offline.html. It does not show a saved record.
 *
 * Bump PWA_CACHE when offline.html or this policy changes. Old caches are
 * deleted on activate. skipWaiting lets the new worker take control without
 * waiting for every tab to close. The page does not reload by itself, so a
 * form in progress is not discarded.
 */
const PWA_CACHE = "calsite-static-v1";

function isSensitivePath(pathname) {
  const path = pathname.toLowerCase();
  return path === "/api" || path.startsWith("/api/") || path === "/auth" || path.startsWith("/auth/");
}

function isStaticAsset(pathname) {
  // Hashed Next.js chunks are safe to keep. The offline page is the only
  // unhashed document, and it contains no user data. Icons, the manifest,
  // and HTML are always loaded from the network.
  return pathname.startsWith("/_next/static/") || pathname === "/offline.html";
}

function pwaDecision(input) {
  if (input.method !== "GET") return "passthrough";
  if (input.hasRange) return "passthrough";
  if (isSensitivePath(input.pathname)) return "passthrough";
  if (input.hasRscHeader || input.search.includes("_rsc=")) return "passthrough";
  if (isStaticAsset(input.pathname)) return "static";
  if (input.mode === "navigate" || input.destination === "document") return "navigate-network";
  return "passthrough";
}

function classify(request) {
  const url = new URL(request.url);
  return pwaDecision({
    method: request.method,
    pathname: url.pathname,
    search: url.search,
    mode: request.mode,
    destination: request.destination,
    hasRange: request.headers.has("range"),
    hasRscHeader:
      request.headers.has("RSC") ||
      request.headers.has("Next-Router-State-Tree") ||
      request.headers.has("Next-Router-Prefetch") ||
      request.headers.has("Next-Url") ||
      request.headers.has("Next-Action") ||
      (request.headers.get("Accept") || "").includes("text/x-component"),
  });
}

async function cacheStatic(request) {
  const url = new URL(request.url);
  if (!isStaticAsset(url.pathname) || isSensitivePath(url.pathname)) return fetch(request);
  const cache = await caches.open(PWA_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic" && response.redirected === false) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkOrOffline(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(PWA_CACHE);
    const offline = await cache.match("/offline.html");
    if (offline) return offline;
    return new Response("You're offline. Reconnect to sign in or submit.\nEstá sin conexión. Vuelva a conectarse para entrar o enviar.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}

function handleFetch(event) {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const decision = classify(request);
  if (decision === "static") {
    event.respondWith(cacheStatic(request));
    return;
  }
  if (decision === "navigate-network") {
    event.respondWith(networkOrOffline(request));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PWA_CACHE)
      .then((cache) => cache.addAll(["/offline.html"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== PWA_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", handleFetch);

self.__CALSITE_PWA__ = { PWA_CACHE, pwaDecision, classify, handleFetch, isSensitivePath, isStaticAsset };
