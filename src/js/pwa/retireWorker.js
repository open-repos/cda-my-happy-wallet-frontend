import { isPublicCacheName } from "./cachePolicy.js";

const WORKER_PATH = "/sw.js";

const scriptUrl = (registration) =>
  (registration.active || registration.waiting || registration.installing)
    ?.scriptURL;

const isOwnWorker = (registration, origin) => {
  const url = scriptUrl(registration);
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === origin && parsed.pathname === WORKER_PATH;
  } catch {
    return false;
  }
};

/**
 * Rollback path for a build where the PWA is disabled: unregisters this
 * application's /sw.js and deletes only its mhw-public-v1-* caches. Other
 * workers and caches of the origin are left untouched. Failures are silent so
 * the application keeps working online.
 */
export const retirePwa = async ({ window: host = window } = {}) => {
  const result = { workers: 0, caches: 0 };
  try {
    const registrations =
      (await host.navigator?.serviceWorker?.getRegistrations?.()) || [];
    for (const registration of registrations) {
      if (isOwnWorker(registration, host.location.origin)) {
        if (await registration.unregister()) result.workers += 1;
      }
    }
  } catch {
    // Service workers unavailable or blocked: nothing to retire.
  }
  try {
    const names = (await host.caches?.keys?.()) || [];
    for (const name of names) {
      if (isPublicCacheName(name) && (await host.caches.delete(name))) {
        result.caches += 1;
      }
    }
  } catch {
    // Cache storage unavailable: nothing to delete.
  }
  return result;
};
