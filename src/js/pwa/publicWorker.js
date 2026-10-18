import {
  createCachePolicy,
  obsoletePublicCaches,
  publicCacheName,
} from "./cachePolicy.js";

/** Shared worker runtime. Registration in the application is a separate gate. */
export const attachPublicWorker = (
  self,
  { build, previous = null, assets }
) => {
  if (previous !== null) publicCacheName(previous);
  const cacheName = publicCacheName(build);
  const policy = createCachePolicy({
    origin: self.location.origin,
    assets,
  });
  const unavailable = () =>
    new Response("Indisponible hors ligne.", {
      status: 503,
      headers: { "content-type": "text/plain", "cache-control": "no-store" },
    });

  self.addEventListener("install", (event) => {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(cacheName);
          for (const path of policy.publicPaths) {
            const request = policy.publicRequest(
              new Request(new URL(path, self.location.origin))
            );
            const response = await fetch(request);
            if (!policy.canStore(request, response))
              throw new Error("Unsafe public installation response");
            await cache.put(request, response);
          }
        } catch {
          try {
            await caches.delete(cacheName);
          } catch {
            /* Storage may be unavailable. */
          }
          throw new Error("Public installation failed");
        }
      })()
    );
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const keepPrevious = previous ? publicCacheName(previous) : null;
        // Snapshot before probing candidates: a newer install may already have a
        // cache while this activation is still running. Never delete its cache.
        const names = await caches.keys();
        const workers = [
          self.registration.installing,
          self.registration.waiting,
          self.registration.active,
        ].filter(Boolean);
        try {
          const pending = await Promise.all(
            workers.map(
              (worker) =>
                new Promise((resolve, reject) => {
                  const channel = new MessageChannel();
                  const timer = setTimeout(() => {
                    channel.port1.close();
                    reject(new Error("Candidate unavailable"));
                  }, 1000);
                  channel.port1.onmessage = (message) => {
                    clearTimeout(timer);
                    channel.port1.close();
                    try {
                      resolve(publicCacheName(message.data));
                    } catch {
                      reject(new Error("Invalid candidate"));
                    }
                  };
                  worker.postMessage({ type: "PUBLIC_BUILD" }, [channel.port2]);
                })
            )
          );
          // Without a declared previous release, keep older public caches.
          // Never guess which working version may be needed for rollback.
          for (const name of previous
            ? obsoletePublicCaches(names, cacheName, keepPrevious, pending)
            : [])
            await caches.delete(name);
        } catch {
          // Defer cleanup if a candidate cannot be identified. Public storage
          // growth is preferable to deleting the next installed version.
        }
        await self.clients.claim();
      })()
    );
  });
  self.addEventListener("message", (event) => {
    if (event.data?.type === "PUBLIC_BUILD" && event.ports[0]) {
      event.ports[0].postMessage(build);
      event.ports[0].close();
    }
    if (
      event.data?.type === "ACTIVATE_PUBLIC_UPDATE" &&
      event.source &&
      new URL(event.source.url).origin === self.location.origin
    ) {
      event.waitUntil(
        self.skipWaiting().then(() => {
          event.ports[0]?.postMessage(build);
          event.ports[0]?.close();
        })
      );
    }
  });
  self.addEventListener("fetch", (event) => {
    event.respondWith(
      (async () => {
        const request = event.request;
        const kind = policy.classify(request);
        if (kind === "navigation") {
          try {
            return await fetch(new Request(request, { cache: "no-store" }));
          } catch {
            try {
              return (
                (await caches.match("/offline.html", { cacheName })) ||
                unavailable()
              );
            } catch {
              return unavailable();
            }
          }
        }
        if (kind !== "public-asset") {
          try {
            return await fetch(new Request(request, { cache: "no-store" }));
          } catch {
            return unavailable();
          }
        }
        const safe = policy.publicRequest(request);
        try {
          const cached = await caches.match(safe, { cacheName });
          if (cached) return cached;
        } catch {
          /* Storage is optional; keep the network usable. */
        }
        try {
          const response = await fetch(safe);
          if (policy.canStore(safe, response)) {
            try {
              await (await caches.open(cacheName)).put(safe, response.clone());
            } catch {
              /* A storage failure must not prevent an online read. */
            }
          }
          return response;
        } catch {
          return unavailable();
        }
      })()
    );
  });
};
