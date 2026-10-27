import { expect, test } from "@playwright/test";
import { prepareSimulationPage } from "./simulationFixture.mjs";

// Measure actual text colours against the first opaque rendered ancestor.
const assertContrast = async (root) => {
  const failures = await root.evaluate((root) => {
    const rgb = (value) => value.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0];
    const lum = (c) =>
      c
        .slice(0, 3)
        .map((x) => x / 255)
        .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
        .reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
    const failures = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode,
        el = node.parentElement;
      if (
        !node.textContent.trim() ||
        !el ||
        el.namespaceURI.includes("svg") ||
        el.closest("button:disabled,[aria-hidden=true],.sr-only") ||
        !el.getClientRects().length ||
        getComputedStyle(el).visibility === "hidden"
      )
        continue;
      let ancestor = el,
        background;
      while (ancestor) {
        const color = rgb(getComputedStyle(ancestor).backgroundColor);
        if (color.length === 3 || color[3] === 1) {
          background = color;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (!background) continue;
      const [high, low] = [
        lum(rgb(getComputedStyle(el).color)),
        lum(background),
      ].sort((a, b) => b - a);
      const ratio = (high + 0.05) / (low + 0.05);
      if (ratio < 4.5)
        failures.push({
          text: node.textContent.trim().slice(0, 60),
          ratio: ratio.toFixed(2),
        });
    }
    return failures;
  });
  expect(failures).toEqual([]);
};

for (const width of [320, 390, 768, 1440])
  for (const theme of ["light", "dark"]) {
    test(`sage actions, theme contrast and reserved FAB area ${width}px ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.setFixedTime(new Date("2026-10-27T10:00:00Z"));
      await prepareSimulationPage(page);
      await page.addInitScript(
        (theme) => localStorage.setItem("mhw-theme", theme),
        theme
      );
      await page.goto("/objectifs-evenements");
      const goal = page.locator(".goal-card").first();
      await expect(goal).toBeVisible();
      await assertContrast(goal);
      const simulate = goal.getByRole("button", {
        name: "Simuler avec mon budget",
      });
      await simulate.scrollIntoViewIfNeeded();
      const fab = page.locator(".quick-add-fab");
      if (width < 768) {
        const dock = page.locator(".quick-add-dock");
        for (const action of [
          simulate,
          page.getByRole("button", {
            name: "Ajouter un événement",
            exact: true,
          }),
        ]) {
          await action.scrollIntoViewIfNeeded();
          const box = await action.boundingBox(),
            dockBox = await dock.boundingBox();
          expect(box.y + box.height).toBeLessThanOrEqual(dockBox.y);
        }
        await assertContrast(dock);
        await fab.click();
      } else
        await page
          .getByRole("button", { name: "Ajouter un événement", exact: true })
          .click();
      if (width < 768) {
        await assertContrast(page.locator(".quick-add-surface"));
        await page
          .getByRole("button", { name: /^Événement à confirmer Simulation/ })
          .click();
      }
      const form = page.locator(".monthly-event-form");
      await expect(form).toBeVisible();
      await form.getByLabel("Titre", { exact: true }).fill("Saisie conservée");
      await assertContrast(form);
      await expect(fab).toBeHidden();
      const save = form.getByRole("button", {
        name: "Enregistrer",
        exact: true,
      });
      await form.getByRole("button", { name: "Annuler", exact: true }).focus();
      await page.keyboard.press("Tab");
      await expect(save).toBeFocused();
      await expect(save).toHaveCSS("outline-offset", "0px");
      await expect(save).toHaveCSS("outline-style", "solid");
      await expect(save).toHaveCSS("outline-width", "2px");
      await page.screenshot({ path: test.info().outputPath("form.png") });
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%")
      );
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth
          )
        )
        .toBe(true);
      await expect(form.getByLabel("Titre", { exact: true })).toHaveValue(
        "Saisie conservée"
      );
      await form.getByRole("button", { name: "Annuler", exact: true }).click();
    });
  }

test("software viewport resize keeps the draft, scrolling and tight focus usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareSimulationPage(page);
  await page.addInitScript(() => {
    const viewport = new EventTarget();
    Object.assign(viewport, {
      height: 844,
      offsetTop: 0,
      width: 390,
      offsetLeft: 0,
      scale: 1,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    window.resizeTestViewport = () => {
      viewport.height = 420;
      viewport.offsetTop = 20;
      viewport.dispatchEvent(new Event("resize"));
    };
  });
  await page.goto("/calendrier");
  await page
    .getByRole("button", { name: "Ajouter une opération ou un événement" })
    .click();
  await page
    .getByRole("button", { name: /^Événement à confirmer Simulation/ })
    .click();
  const dialog = page.getByRole("dialog", { name: "Création au budget" });
  await dialog
    .getByLabel("Titre", { exact: true })
    .fill("Clavier et brouillon");
  await page.evaluate(() => window.resizeTestViewport());
  await expect(dialog).toHaveCSS("height", "420px");
  await expect(dialog).toHaveCSS("top", "20px");
  const cancel = dialog.getByRole("button", { name: "Annuler", exact: true });
  await cancel.scrollIntoViewIfNeeded();
  const box = await cancel.boundingBox();
  expect(box.y + box.height).toBeLessThanOrEqual(440);
  await expect(dialog.getByLabel("Titre", { exact: true })).toHaveValue(
    "Clavier et brouillon"
  );
  await cancel.click();
  await expect(page.locator(".quick-add-fab")).toBeFocused();
});

test("conversion and named delete confirmation keep their existing commands", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date("2026-10-27T10:00:00Z"));
  await prepareSimulationPage(page);
  const writes = [];
  await page.route(
    /\/v1\/event-occurrences\/8\/2026-10-20\/realize$/,
    (route) => {
      writes.push(route.request().postDataJSON());
      return route.fulfill({ status: 204 });
    }
  );
  await page.goto("/calendrier");
  await page.getByRole("button", { name: /^Convertir Assurance / }).click();
  const form = page.locator(".monthly-event-form");
  await form.getByLabel("Titre", { exact: true }).fill("Assurance constatée");
  await form.getByRole("combobox", { name: "Catégorie" }).click();
  await page.getByRole("option", { name: /Alimentation/ }).click();
  await form.getByRole("button", { name: "Enregistrer l’opération" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toMatchObject({ title: "Assurance constatée" });
  await page.goto("/objectifs-evenements");
  await page
    .getByRole("button", { name: "Modifier Assurance", exact: true })
    .click();
  const remove = page.getByRole("button", { name: "Supprimer", exact: true });
  await remove.click();
  const confirmation = page.getByRole("group", {
    name: "Supprimer « Assurance » ?",
  });
  await expect(
    confirmation.getByRole("button", { name: "Annuler", exact: true })
  ).toBeFocused();
  await confirmation
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  await expect(remove).toBeFocused();
  await remove.click();
  await confirmation.getByRole("button", { name: "Oui, supprimer" }).click();
  await expect(
    page.getByRole("button", { name: "Modifier Assurance", exact: true })
  ).toHaveCount(0);
});
