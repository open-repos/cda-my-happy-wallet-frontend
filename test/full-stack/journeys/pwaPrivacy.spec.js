import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "allow" });
const marker = "PWA private owner A";
const queued = "PWA offline write forbidden";

// Return only safe observations, never a token, cookie, password or API body.
const api = (page, path, { method = "GET", data, raw, headers = {} } = {}) =>
  page.evaluate(
    async ({ path, method, data, raw, headers, marker, queued }) => {
      const stored = JSON.parse(
        localStorage.getItem(JSON.stringify("user")) || "null"
      );
      const token = stored?.payload?.accessToken;
      const response = await fetch(path, {
        method,
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(raw !== undefined
          ? { body: raw }
          : data === undefined
          ? {}
          : { body: JSON.stringify(data) }),
      });
      const text = await response.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        /* Offline fallback is plain text. */
      }
      const directives = (response.headers.get("cache-control") || "")
        .toLowerCase()
        .split(",")
        .map((value) => value.trim());
      return {
        status: response.status,
        private:
          directives.includes("private") && directives.includes("no-store"),
        noEtag: !response.headers.has("etag"),
        hasA: text.includes(marker),
        hasQueued: text.includes(queued),
        id: body?.data?.id || body?.data?.[0]?.id || null,
      };
    },
    { path, method, data, raw, headers, marker, queued }
  );
const assertPrivate = (result, status) => {
  expect(result.status).toBe(status);
  expect(result.private).toBe(true);
  expect(result.noEtag).toBe(true);
};
const assertResponse = async (response, status) => {
  expect(response.status()).toBe(status);
  const headers = await response.allHeaders();
  const directives = (headers["cache-control"] || "")
    .split(",")
    .map((value) => value.trim().toLowerCase());
  expect(
    directives.includes("private") && directives.includes("no-store")
  ).toBe(true);
  expect(Object.hasOwn(headers, "etag")).toBe(false);
};
const login = async (page, email) => {
  await page.goto("/login");
  await page.getByPlaceholder("Entrez votre email").fill(email);
  await page
    .getByPlaceholder("Entrez mot de passe")
    .fill(process.env.E2E_PASSWORD);
  const authenticated = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.replace(/\/$/, "") ===
        "/v1/users/authenticate" && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Connexion", exact: true }).click();
  await assertResponse(await authenticated, 200);
  await expect(page).toHaveURL(/\/home$/);
  await expect(
    page.getByRole("heading", { name: "Reste à vivre du mois", exact: true })
  ).toBeVisible();
};
const navigateOperations = async (page) => {
  const link = page.getByRole("link", {
    name: "Liste Opérations",
    exact: true,
  });
  if (!(await link.isVisible()))
    await page
      .getByRole("button", { name: "Ouvrir le menu", exact: true })
      .click();
  await link.click();
};
const inspectCaches = async (page, emails) => {
  const result = await page.evaluate(
    async ({ marker, queued, emails }) => {
      const metadata = await (await fetch("/pwa-build.json")).json();
      const stored = JSON.parse(
        localStorage.getItem(JSON.stringify("user")) || "null"
      );
      const privateValues = [
        marker,
        queued,
        ...emails,
        stored?.payload?.accessToken,
      ].filter(Boolean);
      const result = {
        entries: 0,
        unsafeKey: false,
        privateFound: false,
        unsafeResponse: false,
      };
      for (const name of await caches.keys()) {
        if (!/^mhw-public-v1-[a-f0-9]{16}$/.test(name)) {
          result.unsafeKey = true;
          continue;
        }
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          result.entries += 1;
          const url = new URL(request.url);
          result.unsafeKey ||=
            !metadata.assets.includes(url.pathname) ||
            !!url.search ||
            request.headers.has("authorization");
          const response = await cache.match(request);
          const text = await response.text();
          result.privateFound ||= privateValues.some((value) =>
            text.includes(value)
          );
          result.unsafeResponse ||= /\b(private|no-store)\b/i.test(
            response.headers.get("cache-control") || ""
          );
        }
      }
      return result;
    },
    { marker, queued, emails }
  );
  expect(result.entries).toBeGreaterThan(0);
  expect(result.unsafeKey).toBe(false);
  expect(result.privateFound).toBe(false);
  expect(result.unsafeResponse).toBe(false);
};

test("keeps real API sessions and owners out of HTTP and worker caches", async ({
  page,
  context,
}, testInfo) => {
  // Do not use page/context.route: Playwright routing disables HTTP caching and
  // would invalidate this evidence. The Compose network is already internal.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  const requests = new Map();
  const hits = { public: false, private: false };
  cdp.on("Network.requestWillBeSent", ({ requestId, request }) => {
    const path = new URL(request.url).pathname;
    requests.set(
      requestId,
      path.startsWith("/v1/")
        ? "private"
        : path === "/__proof/http-cache"
        ? "public"
        : null
    );
  });
  const hit = (id) => {
    const kind = requests.get(id);
    if (kind) hits[kind] = true;
  };
  cdp.on("Network.requestServedFromCache", ({ requestId }) => hit(requestId));
  cdp.on("Network.responseReceived", ({ requestId, response }) => {
    if (response.fromDiskCache || response.fromPrefetchCache) hit(requestId);
  });
  const emails = [
    `${testInfo.project.name}-privacy-a@example.com`,
    `${testInfo.project.name}-privacy-b@example.com`,
  ];
  await page.goto("/login");
  expect(
    await page.evaluate(() =>
      navigator.serviceWorker.getRegistrations().then((items) => items.length)
    )
  ).toBe(0);
  for (let i = 0; i < 2; i += 1)
    await page.evaluate(async () =>
      (await fetch("/__proof/http-cache")).text()
    );
  await expect.poll(() => hits.public).toBe(true);
  assertPrivate(await api(page, "/v1/operations"), 401);
  assertPrivate(
    await api(page, "/v1/operations", { headers: { "if-none-match": "*" } }),
    401
  );
  assertPrivate(
    await api(page, "/v1/users/authenticate", {
      method: "POST",
      raw: '{"email":',
    }),
    400
  );
  await login(page, emails[0]);
  for (const headers of [
    {},
    { "if-none-match": "*" },
    { "if-modified-since": new Date().toUTCString() },
  ])
    assertPrivate(
      await api(page, "/v1/operation-categories", { headers }),
      200
    );
  expect(hits.private).toBe(false);

  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const categories = await api(page, "/v1/operation-categories");
  assertPrivate(categories, 200);
  expect(Number.isInteger(categories.id)).toBe(true);
  const data = {
    title: marker,
    amount: "12.34",
    currency: "EUR",
    type: "DEPENSE",
    operationDate: new Date().toISOString().slice(0, 10),
    categoryId: categories.id,
  };
  const creation = await api(page, "/v1/operations", { method: "POST", data });
  assertPrivate(creation, 201);
  assertPrivate(
    await api(page, "/v1/operations", { method: "POST", data: {} }),
    422
  );
  expect((await api(page, "/v1/operations")).hasA).toBe(true);
  await inspectCaches(page, emails);

  await context.setOffline(true);
  expect((await api(page, "/v1/operations")).status).toBe(503);
  expect(
    (
      await api(page, "/v1/operations", {
        method: "POST",
        data: { ...data, title: queued },
      })
    ).status
  ).toBe(503);
  await page.goto("/operations");
  await expect(
    page.getByRole("heading", { name: "Vous êtes hors ligne", exact: true })
  ).toBeVisible();
  expect((await page.locator("body").textContent()).includes(marker)).toBe(
    false
  );
  await context.setOffline(false);
  await page.reload();
  await expect(page).toHaveURL(/\/operations$/);
  await expect(
    page.getByRole("row", { name: new RegExp(marker) })
  ).toBeVisible();
  expect((await api(page, "/v1/operations")).hasQueued).toBe(false);

  const exp = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem(JSON.stringify("user")));
    return JSON.parse(
      atob(
        stored.payload.accessToken
          .split(".")[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
      )
    ).exp;
  });
  // Exercise the real Axios refresh path, using only the client's clock as in
  // the existing session journey. The API and cookie rotation remain real.
  await page.goto("/home");
  await expect(
    page.getByRole("heading", { name: "Reste à vivre du mois", exact: true })
  ).toBeVisible();
  await page.clock.setFixedTime(new Date((exp + 1) * 1000));
  const renewed = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/v1/token" &&
      response.request().method() === "POST"
  );
  await navigateOperations(page);
  await assertResponse(await renewed, 200);
  await page.clock.setFixedTime(new Date());
  await expect(
    page.getByRole("row", { name: new RegExp(marker) })
  ).toBeVisible();
  await inspectCaches(page, emails);

  const profile = page.getByRole("button", {
    name: "Afficher le profil",
    exact: true,
  });
  if (!(await profile.isVisible()))
    await page
      .getByRole("button", { name: "Ouvrir le menu", exact: true })
      .click();
  await profile.click();
  await page
    .getByRole("button", { name: "Se déconnecter", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  assertPrivate(await api(page, "/v1/operations"), 401);
  await login(page, emails[1]);
  const other = await api(page, "/v1/operations");
  assertPrivate(other, 200);
  expect(other.hasA).toBe(false);
  assertPrivate(await api(page, `/v1/operations/${creation.id}`), 404);
  await navigateOperations(page);
  await expect(
    page.getByRole("heading", { name: "Pas encore d’opération", exact: true })
  ).toBeVisible();
  await inspectCaches(page, emails);
  expect(hits.private).toBe(false);
  await cdp.detach();
});
