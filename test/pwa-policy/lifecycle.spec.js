import { expect, test } from "@playwright/test";

const A = "1111111111111111";
const B = "2222222222222222";
const C = "3333333333333333";
const name = (build) => `mhw-public-v1-${build}`;
const deploy = async (request, build, previous = "", failInstall = false) => {
  const response = await request.post("/__proof/build", {
    data: { build, previous, failInstall },
  });
  expect(response.ok()).toBe(true);
};
const register = async (page) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js", {
      type: "module",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
};
const update = async (page) =>
  page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistration()).update()
  );
const activeBuild = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => {
          channel.port1.close();
          resolve(null);
        }, 500);
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          channel.port1.close();
          resolve(event.data);
        };
        navigator.serviceWorker.controller.postMessage(
          { type: "PUBLIC_BUILD" },
          [channel.port2]
        );
      })
  );
const activate = async (page, build) => {
  await expect
    .poll(() =>
      page.evaluate(
        async () => !!(await navigator.serviceWorker.getRegistration()).waiting
      )
    )
    .toBe(true);
  const accepted = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(new Error("Update action not acknowledged"));
      }, 5000);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(event.data);
      };
      registration.waiting.postMessage({ type: "ACTIVATE_PUBLIC_UPDATE" }, [
        channel.port2,
      ]);
    });
  });
  expect(accepted).toBe(build);
  await expect.poll(() => activeBuild(page), { timeout: 10000 }).toBe(build);
};
const entries = (page) =>
  page.evaluate(async () => {
    const result = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys())
        result.push({
          name,
          path: new URL(request.url).pathname,
          body: await (await cache.match(request)).text(),
        });
    }
    return result;
  });
const verifyPrivateBoundary = async (page) => {
  const cached = await entries(page);
  expect(cached.length).toBeGreaterThan(0);
  expect(
    cached.every(
      (entry) =>
        entry.path === "/offline.html" ||
        /^\/assets\/proof-[a-f0-9]{16}\.js$/.test(entry.path)
    )
  ).toBe(true);
  expect(JSON.stringify(cached)).not.toContain("synthetic-private");
};

test.beforeEach(async ({ request }) => deploy(request, A));

test("installs public assets, keeps private reads network-only, reconnects, updates explicitly and rolls back", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/home");
  await register(page);
  await expect
    .poll(() => page.evaluate(() => caches.keys()))
    .toEqual([name(A)]);
  const reads = await page.evaluate(async () => {
    const statuses = [];
    for (const [path, options] of [
      ["/v1/operations", {}],
      ["/v1/auth/refresh", { method: "POST" }],
      ["/v1/operations?status=401", {}],
      ["/assets/proof-1111111111111111.js?token=synthetic", {}],
      [
        "/assets/proof-1111111111111111.js",
        { headers: { authorization: "Bearer synthetic" } },
      ],
    ]) {
      const response = await fetch(path, options);
      await response.text();
      statuses.push(response.status);
    }
    return statuses;
  });
  expect(reads).toEqual([200, 200, 401, 200, 200]);
  await verifyPrivateBoundary(page);

  await context.setOffline(true);
  expect(
    await page.evaluate(
      async () =>
        await (async () => {
          const response = await fetch("/v1/operations");
          await response.text();
          return response.status;
        })()
    )
  ).toBe(503);
  expect(
    await page.evaluate(
      async () =>
        await (async () => {
          const response = await fetch("/assets/proof-1111111111111111.js");
          await response.text();
          return response.status;
        })()
    )
  ).toBe(200);
  await page.goto("/calendrier");
  await expect(
    page.getByRole("heading", { name: "Connexion indisponible" })
  ).toBeVisible();
  await expect(page.getByText("synthetic-private-page")).toHaveCount(0);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole("heading", { name: "En ligne" })).toBeVisible();
  expect(
    await page.evaluate(
      async () =>
        await (async () => {
          const response = await fetch("/v1/operations");
          await response.text();
          return response.status;
        })()
    )
  ).toBe(200);
  await verifyPrivateBoundary(page);

  // A cache owned by another app survives activation and rollback.
  await page.evaluate(async () => {
    await caches.open("another-app-cache");
  });
  await deploy(request, B, A);
  await update(page);
  await expect
    .poll(() =>
      page.evaluate(
        async () => !!(await navigator.serviceWorker.getRegistration()).waiting
      )
    )
    .toBe(true);
  // Waiting alone does not evict the active version or take over the page.
  expect(await activeBuild(page)).toBe(A);
  await activate(page, B);
  await deploy(request, C, B);
  await update(page);
  await activate(page, C);
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
  await expect
    .poll(() => page.evaluate(() => caches.keys()))
    .toEqual(expect.arrayContaining([name(C), name(B), "another-app-cache"]));
  await expect
    .poll(() => page.evaluate(() => caches.keys()))
    .not.toContain(name(A));
  await verifyPrivateBoundary(page);

  // Redeploy the previous public build under the same stable worker URL.
  await deploy(request, B, C);
  await update(page);
  await activate(page, B);
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
  await context.setOffline(true);
  expect(
    await page.evaluate(
      async () =>
        await (async () => {
          const response = await fetch("/assets/proof-2222222222222222.js");
          await response.text();
          return response.status;
        })()
    )
  ).toBe(200);
  expect(
    await page.evaluate(
      async () =>
        await (async () => {
          const response = await fetch("/v1/operations");
          await response.text();
          return response.status;
        })()
    )
  ).toBe(503);
  await context.setOffline(false);
  await verifyPrivateBoundary(page);
  expect(await page.evaluate(() => caches.keys())).toContain(
    "another-app-cache"
  );
});

test("a failed installation preserves the working public version", async ({
  page,
  context,
  request,
}) => {
  await page.goto("/home");
  await register(page);
  await deploy(request, B, A, true);
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
    .toEqual([name(A)]);
  await context.setOffline(true);
  expect(
    await page.evaluate(
      async () =>
        await (async () => {
          const response = await fetch("/assets/proof-1111111111111111.js");
          await response.text();
          return response.status;
        })()
    )
  ).toBe(200);
  await context.setOffline(false);
  await verifyPrivateBoundary(page);
});
