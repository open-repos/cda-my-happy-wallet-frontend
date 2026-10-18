import { expect, test } from "@playwright/test";

const stage = async (request, name) =>
  expect((await request.post("/__proof/stage", { data: name })).ok()).toBe(
    true
  );
const check = (page) =>
  page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistration()).update()
  );
const addForm = async (page) => {
  await page.evaluate(() => {
    const form = document.createElement("form");
    form.innerHTML = '<label>Saisie synthétique<input name="draft"></label>';
    document.body.append(form);
  });
  await page
    .getByRole("textbox", { name: "Saisie synthétique" })
    .fill("synthetic unsaved amount");
};
const closeForm = (page) =>
  page.locator("form").evaluate((form) => form.remove());
const notice = (page) =>
  page.getByRole("region", {
    name: "Mise à jour de l’application",
    exact: true,
  });
const prepare = (page) =>
  page.getByRole("button", { name: "Préparer la mise à jour", exact: true });
const reload = (page) =>
  page.getByRole("button", { name: "Recharger l’application", exact: true });

test.beforeEach(async ({ request }) => stage(request, "A"));

test("protects forms and other windows, requires explicit reloads, and recovers from failed candidates", async ({
  page,
  context,
  request,
}) => {
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations += 1;
  });
  await page.goto("/updates");
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await expect(page.getByRole("status")).toHaveText("");
  await expect(notice(page)).toHaveCount(0);
  const initialNavigations = navigations;
  const other = await context.newPage();
  await other.goto("/updates");
  await other.waitForFunction(() => !!navigator.serviceWorker.controller);
  await addForm(other);

  await stage(request, "B");
  await check(page);
  await expect(prepare(page)).toBeVisible();
  await addForm(page);
  await prepare(page).click();
  await expect(page.getByRole("status")).toContainText(
    "Terminez ou fermez les formulaires"
  );
  await expect(page.getByRole("textbox")).toHaveValue(
    "synthetic unsaved amount"
  );
  await expect(reload(page)).toHaveCount(0);
  await closeForm(page);

  await context.setOffline(true);
  await prepare(page).click();
  await expect(page.getByRole("status")).toContainText("Reconnectez-vous");
  await expect(reload(page)).toHaveCount(0);
  await context.setOffline(false);
  await prepare(page).click();
  await expect(reload(page)).toBeVisible();
  await expect(reload(other)).toBeVisible();
  expect(navigations).toBe(initialNavigations);
  await expect(other.getByRole("textbox")).toHaveValue(
    "synthetic unsaved amount"
  );
  await reload(other).click();
  await expect(other.getByRole("status")).toContainText(
    "Terminez ou fermez les formulaires"
  );
  await expect(other.getByRole("textbox")).toHaveValue(
    "synthetic unsaved amount"
  );

  // The notice participates in document flow and remains keyboard usable.
  await expect(notice(page)).toBeVisible();
  expect((await reload(page).boundingBox()).height).toBeGreaterThanOrEqual(44);
  await reload(page).focus();
  expect(
    await reload(page).evaluate((element) =>
      parseFloat(getComputedStyle(element).outlineWidth)
    )
  ).toBeGreaterThanOrEqual(3);
  await page.locator("html").evaluate((element) => {
    element.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  ).toBe(false);
  await reload(page).click();
  await expect(page.getByRole("status")).toHaveText("");
  await expect(notice(page)).toHaveCount(0);
  expect(navigations).toBe(initialNavigations + 1);
  await expect(other.getByRole("textbox")).toHaveValue(
    "synthetic unsaved amount"
  );
  await other.close();

  // Candidate failure is visible without replacing the active version.
  const controllerBefore = await page.evaluate(async () => {
    const channel = new MessageChannel();
    return new Promise((resolve) => {
      channel.port1.onmessage = (message) => {
        channel.port1.close();
        resolve(message.data);
      };
      navigator.serviceWorker.controller.postMessage({ type: "PUBLIC_BUILD" }, [
        channel.port2,
      ]);
    });
  });
  await stage(request, "broken-C");
  await check(page);
  await expect(page.getByRole("status")).toContainText("indisponible");
  await stage(request, "C");
  await page
    .getByRole("button", { name: "Réessayer la mise à jour", exact: true })
    .click();
  await expect(prepare(page)).toBeVisible();
  await prepare(page).click();
  await expect(reload(page)).toBeVisible();
  // The same explicit flow also applies when rolling back public assets.
  await reload(page).click();
  await expect(page.getByRole("status")).toHaveText("");
  await expect(notice(page)).toHaveCount(0);
  await stage(request, "rollback");
  await check(page);
  await expect(prepare(page)).toBeVisible();
  await prepare(page).click();
  await expect(reload(page)).toBeVisible();
  const versions = await (await request.get("/__proof/versions")).json();
  expect(controllerBefore).toBe(versions.B.build);
  await reload(page).click();
  await expect(page.getByRole("status")).toHaveText("");
  await expect(notice(page)).toHaveCount(0);
  const cachedPaths = await page.evaluate(async () => {
    const paths = [];
    for (const name of await caches.keys()) {
      for (const item of await (await caches.open(name)).keys())
        paths.push(new URL(item.url).pathname);
    }
    return paths;
  });
  expect(cachedPaths).not.toContain("/updates");
  expect(
    cachedPaths.some(
      (path) => path.startsWith("/__proof/") || path.startsWith("/v1/")
    )
  ).toBe(false);
});
