import { expect, test } from "@playwright/test";
const cacheName = (version) => `mhw-public-v1-${version.build}`;
const switchStage = async (request, stage) =>
  expect((await request.post("/__proof/stage", { data: stage })).ok()).toBe(
    true
  );
const read = (page, path, options = {}) =>
  page.evaluate(
    async ({ path, options }) => {
      const response = await fetch(path, options);
      const text = await response.text();
      return { status: response.status, text };
    },
    { path, options }
  );
const ask = (page, target, type) =>
  page.evaluate(
    async ({ target, type }) => {
      const registration = await navigator.serviceWorker.getRegistration();
      const worker =
        target === "controller"
          ? navigator.serviceWorker.controller
          : registration[target];
      if (!worker) return null;
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => {
          channel.port1.close();
          resolve(null);
        }, 5000);
        channel.port1.onmessage = (message) => {
          clearTimeout(timer);
          channel.port1.close();
          resolve(message.data);
        };
        worker.postMessage({ type }, [channel.port2]);
      });
    },
    { target, type }
  );
const register = async (page) => {
  await page.goto("/home");
  expect(
    await page.evaluate(() =>
      navigator.serviceWorker.getRegistrations().then((items) => items.length)
    )
  ).toBe(0);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
};
const activate = async (page, build) => {
  await expect
    .poll(() =>
      page.evaluate(
        async () => !!(await navigator.serviceWorker.getRegistration()).waiting
      )
    )
    .toBe(true);
  expect(await ask(page, "waiting", "ACTIVATE_PUBLIC_UPDATE")).toBe(build);
  await expect
    .poll(() => ask(page, "controller", "PUBLIC_BUILD"), { timeout: 10000 })
    .toBe(build);
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (
            await navigator.serviceWorker.getRegistration()
          ).active.state
      )
    )
    .toBe("activated");
};
const verifyBoundary = async (page, versions) => {
  const allowed = [
    ...new Set(Object.values(versions).flatMap((version) => version.assets)),
  ];
  const result = await page.evaluate(async (allowed) => {
    let count = 0,
      privateFound = false,
      invalidKey = false;
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        count += 1;
        invalidKey ||=
          !allowed.includes(new URL(request.url).pathname) ||
          request.headers.has("authorization");
        privateFound ||= (await (await cache.match(request)).text()).includes(
          "synthetic-private-generated"
        );
      }
    }
    return { count, privateFound, invalidKey };
  }, allowed);
  expect(result.count).toBeGreaterThan(0);
  expect(result.privateFound).toBe(false);
  expect(result.invalidKey).toBe(false);
};
test.beforeEach(async ({ request }) => switchStage(request, "A"));

test("runs the generated worker through private reads, offline/reconnect, updates and rollback", async ({
  page,
  context,
  request,
}) => {
  const versions = await (await request.get("/__proof/versions")).json();
  await register(page);
  await expect
    .poll(() => ask(page, "controller", "PUBLIC_BUILD"))
    .toBe(versions.A.build);
  for (const [path, options, status] of [
    ["/v1/operations", {}, 200],
    ["/v1/auth/refresh", { method: "POST" }, 200],
    ["/v1/operations?refused=1", {}, 401],
    ["/pwa-build.json", {}, 200],
    [versions.A.probe + "?token=synthetic", {}, 200],
    [versions.A.probe, { headers: { authorization: "Bearer synthetic" } }, 200],
  ])
    expect((await read(page, path, options)).status).toBe(status);
  await verifyBoundary(page, versions);
  await context.setOffline(true);
  expect((await read(page, "/v1/operations")).status).toBe(503);
  expect((await read(page, versions.A.probe)).status).toBe(200);
  const offline = await page.goto("/calendrier");
  expect(offline.status()).toBe(
    versions.A.assets.includes("/offline.html") ? 200 : 503
  );
  await expect(page.locator("body")).not.toContainText(
    "synthetic-private-generated"
  );
  await context.setOffline(false);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Preuve du worker généré" })
  ).toBeVisible();
  expect((await read(page, "/v1/operations")).status).toBe(200);
  await page.evaluate(async () => {
    await caches.open("another-app-cache");
  });
  for (const stage of ["B", "C", "rollback"]) {
    await switchStage(request, stage);
    await page.evaluate(async () =>
      (await navigator.serviceWorker.getRegistration()).update()
    );
    await activate(page, versions[stage].build);
  }
  await expect
    .poll(() => page.evaluate(() => caches.keys()))
    .toEqual(
      expect.arrayContaining([
        cacheName(versions.rollback),
        cacheName(versions.C),
        "another-app-cache",
      ])
    );
  expect(await page.evaluate(() => caches.keys())).not.toContain(
    cacheName(versions.A)
  );
  expect(await page.evaluate(() => caches.keys())).not.toContain(
    cacheName(versions.B)
  );
  await context.setOffline(true);
  expect((await read(page, versions.B.probe)).text).toContain(
    'publicProof = "B"'
  );
  expect((await read(page, versions.C.probe)).status).toBe(503);
  expect((await read(page, "/v1/operations")).status).toBe(503);
  await context.setOffline(false);
  await verifyBoundary(page, versions);
  // Unknown release history defers cleanup rather than guessing a rollback target.
  await switchStage(request, "unknown");
  await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistration()).update()
  );
  await activate(page, versions.unknown.build);
  expect(await page.evaluate(() => caches.keys())).toEqual(
    expect.arrayContaining([
      cacheName(versions.rollback),
      cacheName(versions.C),
      cacheName(versions.unknown),
      "another-app-cache",
    ])
  );
});

test("keeps the active generated version when a candidate asset fails", async ({
  page,
  context,
  request,
}) => {
  const versions = await (await request.get("/__proof/versions")).json();
  await register(page);
  await switchStage(request, "broken");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
    const candidate = registration.installing;
    if (candidate && candidate.state !== "redundant")
      await new Promise((resolve) =>
        candidate.addEventListener("statechange", () => {
          if (candidate.state === "redundant") resolve();
        })
      );
  });
  await expect
    .poll(() => page.evaluate(() => caches.keys()))
    .toEqual([cacheName(versions.A)]);
  await context.setOffline(true);
  expect((await read(page, versions.A.probe)).status).toBe(200);
  expect((await read(page, "/v1/operations")).status).toBe(503);
  await context.setOffline(false);
  await verifyBoundary(page, versions);
});
