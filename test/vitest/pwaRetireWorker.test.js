import { describe, expect, it, vi } from "vitest";
import { retirePwa } from "../../src/js/pwa/retireWorker.js";

const ORIGIN = "https://myhappywallet.example";
const OWN = "mhw-public-v1-0123456789abcdef";

const registration = (scriptURL, slot = "active", unregisters = true) => ({
  [slot]: { scriptURL },
  unregister: vi.fn().mockResolvedValue(unregisters),
});

const host = ({ registrations = [], cacheNames = [] } = {}) => ({
  location: { origin: ORIGIN },
  navigator: {
    serviceWorker: {
      getRegistrations: vi.fn().mockResolvedValue(registrations),
    },
  },
  caches: {
    keys: vi.fn().mockResolvedValue(cacheNames),
    delete: vi.fn().mockResolvedValue(true),
  },
});

describe("PWA rollback", () => {
  it("unregisters only this origin's /sw.js, in any lifecycle slot", async () => {
    const own = registration(`${ORIGIN}/sw.js`);
    const waiting = registration(`${ORIGIN}/sw.js?v=2`, "waiting");
    const otherPath = registration(`${ORIGIN}/other-worker.js`);
    const otherOrigin = registration("https://elsewhere.example/sw.js");
    const window = host({
      registrations: [own, waiting, otherPath, otherOrigin],
    });

    const result = await retirePwa({ window });

    expect(own.unregister).toHaveBeenCalledOnce();
    expect(waiting.unregister).toHaveBeenCalledOnce();
    expect(otherPath.unregister).not.toHaveBeenCalled();
    expect(otherOrigin.unregister).not.toHaveBeenCalled();
    expect(result.workers).toBe(2);
  });

  it("deletes only the application's public caches", async () => {
    const window = host({
      cacheNames: [
        OWN,
        "mhw-public-v1-short",
        "mhw-public-v2-0123456789abcdef",
        "another-app-cache",
      ],
    });

    const result = await retirePwa({ window });

    expect(window.caches.delete.mock.calls).toEqual([[OWN]]);
    expect(result.caches).toBe(1);
  });

  it("does nothing without service worker or cache support", async () => {
    const window = { location: { origin: ORIGIN }, navigator: {} };
    await expect(retirePwa({ window })).resolves.toEqual({
      workers: 0,
      caches: 0,
    });
  });

  it("keeps the application usable when the browser refuses access", async () => {
    const window = host();
    window.navigator.serviceWorker.getRegistrations.mockRejectedValue(
      new Error("SecurityError")
    );
    window.caches.keys.mockRejectedValue(new Error("SecurityError"));
    await expect(retirePwa({ window })).resolves.toEqual({
      workers: 0,
      caches: 0,
    });
  });
});
