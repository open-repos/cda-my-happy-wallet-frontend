import { expect, test } from "@playwright/test";

const marker = "synthetic-private-boundary";
const control = async (request, mode = "public", reset = false) => {
  const response = await request.post(
    `/__proof/privacy${reset ? "?reset=1" : ""}`,
    { data: mode }
  );
  expect(response.ok()).toBe(true);
  return response.json();
};
const state = async (request) => (await request.get("/__proof/privacy")).json();
const read = (page, path, options = {}) =>
  page.evaluate(
    async ({ path, options }) => {
      const response = await fetch(path, options);
      const text = await response.text();
      return {
        status: response.status,
        control: response.headers.get("cache-control"),
        etag: response.headers.get("etag"),
        text,
      };
    },
    { path, options }
  );
const install = async (page) => {
  await page.goto("/home");
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
};
const owner = (context, value) =>
  context.addCookies([
    { name: "mhw-proof-owner", value, url: "http://127.0.0.1:4176" },
  ]);
const metadata = async (request) =>
  (await request.get("/__proof/versions")).json();
const safeCaches = async (page, versions) => {
  const allowed = [
    ...new Set(Object.values(versions).flatMap((version) => version.assets)),
  ];
  const result = await page.evaluate(
    async ({ allowed, marker }) => {
      const result = {
        entries: 0,
        unsafeKey: false,
        privateFound: false,
        unsafeResponse: false,
      };
      for (const name of await caches.keys()) {
        if (!/^mhw-public-v1-[a-f0-9]{16}$/.test(name)) continue;
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          result.entries += 1;
          const url = new URL(request.url);
          result.unsafeKey ||=
            !allowed.includes(url.pathname) ||
            !!url.search ||
            request.headers.has("authorization");
          const response = await cache.match(request);
          result.privateFound ||= (await response.text()).includes(marker);
          result.unsafeResponse ||= /\b(private|no-store)\b/i.test(
            response.headers.get("cache-control") || ""
          );
        }
      }
      return result;
    },
    { allowed, marker }
  );
  expect(result.entries).toBeGreaterThan(0);
  expect(result.unsafeKey).toBe(false);
  expect(result.privateFound).toBe(false);
  expect(result.unsafeResponse).toBe(false);
};
test.beforeEach(async ({ request }) => {
  expect((await request.post("/__proof/stage", { data: "A" })).ok()).toBe(true);
  await control(request, "public", true);
});
test.afterEach(async ({ request }) => {
  await control(request, "public", true);
});

test("excludes private statuses, methods, authorization and URL parameters from persistent worker caches", async ({
  page,
  context,
  request,
}) => {
  await owner(context, "A");
  await install(page);
  const versions = await metadata(request);
  for (const status of [200, 204, 400, 401, 403, 404, 422, 429, 500]) {
    const result = await read(
      page,
      `/v1/__privacy/financial?status=${status}`,
      { headers: { authorization: "Bearer synthetic-private-boundary-access" } }
    );
    expect(result.status).toBe(status);
    expect(result.control).toBe("private, no-store");
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const result = await read(page, "/v1/__privacy/auth", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh: "synthetic-private-boundary-refresh" }),
    });
    expect(result.status).toBe(200);
  }
  for (const [path, options] of [
    ["/v1/__privacy/session?token=synthetic-private-boundary-query", {}],
    [versions.A.probe + "?token=synthetic-private-boundary-query", {}],
    [
      versions.A.probe,
      {
        headers: { authorization: "Bearer synthetic-private-boundary-access" },
      },
    ],
  ]) {
    const result = await read(page, path, options);
    expect(result.status).toBe(200);
    if (options.headers?.authorization)
      expect(result.text.includes(`${marker}-authorized-asset`)).toBe(true);
  }
  await safeCaches(page, versions);
});

test("does not show the previous owner offline or queue a failed private write", async ({
  page,
  context,
  request,
}) => {
  await owner(context, "A");
  await page.goto("/home");
  // Fixture contract before worker control; this is not evidence for backend #98.
  const first = await read(page, "/v1/__privacy/financial");
  const second = await read(page, "/v1/__privacy/financial", {
    headers: { "if-none-match": '"synthetic-etag"' },
  });
  expect(first.control).toBe("private, no-store");
  expect(second.status).toBe(200);
  expect(second.etag).toBeNull();
  expect(JSON.parse(second.text).reads).toBeGreaterThan(
    JSON.parse(first.text).reads
  );
  await install(page);
  expect(
    JSON.parse(
      (await read(page, "/v1/__privacy/financial")).text
    ).marker.endsWith("-A")
  ).toBe(true);
  await owner(context, "B");
  expect(
    JSON.parse(
      (await read(page, "/v1/__privacy/financial")).text
    ).marker.endsWith("-B")
  ).toBe(true);
  const before = await state(request);
  await context.setOffline(true);
  for (const method of ["GET", "POST", "DELETE"]) {
    const response = await read(page, "/v1/__privacy/financial", { method });
    expect(response.status).toBe(503);
    expect(response.text.includes(marker)).toBe(false);
  }
  await page.goto("/calendrier?owner=synthetic-private-boundary-owner-A");
  await expect(
    page.getByRole("heading", { name: "Vous êtes hors ligne", exact: true })
  ).toBeVisible();
  expect((await page.locator("body").textContent()).includes(marker)).toBe(
    false
  );
  await context.setOffline(false);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Preuve du worker généré" })
  ).toBeVisible();
  expect((await state(request)).writes).toBe(before.writes);
  expect(
    JSON.parse(
      (await read(page, "/v1/__privacy/financial")).text
    ).marker.endsWith("-B")
  ).toBe(true);
  await safeCaches(page, await metadata(request));
});

test("strips public credentials and refuses poisoned public responses", async ({
  page,
  context,
  request,
}) => {
  await owner(context, "A");
  await install(page);
  const versions = await metadata(request);
  const probe = versions.A.probe;
  const evict = () =>
    page.evaluate(
      async ({ build, probe }) =>
        (await caches.open(`mhw-public-v1-${build}`)).delete(probe),
      { build: versions.A.build, probe }
    );
  await control(request);
  await evict();
  expect(
    (
      await read(page, probe, {
        headers: { "x-private-proof": "synthetic-private-boundary-custom" },
      })
    ).status
  ).toBe(200);
  expect((await state(request)).observations).toEqual([
    { cookie: false, authorization: false, custom: false, referrer: false },
  ]);
  for (const mode of [
    "private",
    "no-store",
    "vary",
    "html",
    "error",
    "redirect",
  ]) {
    await control(request, mode);
    await evict();
    const result = await read(page, probe);
    expect(result.status).toBe(
      mode === "error" ? 500 : mode === "redirect" ? 503 : 200
    );
    expect(
      await page.evaluate(
        async ({ build, probe }) =>
          !!(await (await caches.open(`mhw-public-v1-${build}`)).match(probe)),
        { build: versions.A.build, probe }
      )
    ).toBe(false);
    await safeCaches(page, versions);
  }
});

test("ignores a foreign cache containing synthetic private API and navigation responses", async ({
  page,
  context,
  request,
}) => {
  await owner(context, "B");
  await install(page);
  await page.evaluate(async () => {
    const cache = await caches.open("synthetic-unrelated-app");
    await cache.put(
      "/v1/__privacy/financial",
      new Response("synthetic-private-boundary-owner-A")
    );
    await cache.put(
      "/calendrier",
      new Response("synthetic-private-boundary-old-page", {
        headers: { "content-type": "text/html" },
      })
    );
  });
  expect(
    JSON.parse(
      (await read(page, "/v1/__privacy/financial")).text
    ).marker.endsWith("-B")
  ).toBe(true);
  await context.setOffline(true);
  const response = await read(page, "/v1/__privacy/financial");
  expect(response.status).toBe(503);
  expect(response.text.includes(marker)).toBe(false);
  await page.goto("/calendrier");
  await expect(
    page.getByRole("heading", { name: "Vous êtes hors ligne", exact: true })
  ).toBeVisible();
  expect((await page.locator("body").textContent()).includes(marker)).toBe(
    false
  );
  expect(await page.evaluate(() => caches.keys())).toContain(
    "synthetic-unrelated-app"
  );
  await safeCaches(page, await metadata(request));
});
