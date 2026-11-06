import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

const keyboardViewport = async (page, width) => {
  await page.addInitScript((width) => {
    const viewport = Object.assign(new EventTarget(), {
      height: 844,
      offsetTop: 0,
      width,
      offsetLeft: 0,
      scale: 1,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    window.setKeyboardViewport = (height, offsetTop = 0) => {
      Object.assign(viewport, { height, offsetTop });
      viewport.dispatchEvent(new Event("resize"));
      viewport.dispatchEvent(new Event("scroll"));
    };
  }, width);
};

const assertFits = async (dialog) => {
  expect(
    await dialog.locator(".form-dialog__surface").evaluate((surface) => {
      const bounds = surface.getBoundingClientRect();
      return {
        overflow: surface.scrollWidth > surface.clientWidth + 1,
        wideFields: [
          ...surface.querySelectorAll(
            "input:not([type=hidden]),select,[role=combobox]"
          ),
        ]
          .filter((field) => {
            const box = field.getBoundingClientRect();
            return (
              box.width && (box.left < bounds.left || box.right > bounds.right)
            );
          })
          .map((field) => field.name || field.id),
      };
    })
  ).toEqual({ overflow: false, wideFields: [] });
};

const assertAboveKeyboard = async (field) => {
  await expect
    .poll(() =>
      field.evaluate((field) => {
        const box = field.getBoundingClientRect();
        const surface = field
          .closest(".form-dialog__surface")
          .getBoundingClientRect();
        const viewport = window.visualViewport;
        return {
          visible:
            box.top >= Math.max(surface.top, viewport.offsetTop) &&
            box.bottom <=
              Math.min(surface.bottom, viewport.offsetTop + viewport.height),
          top: box.top,
          bottom: box.bottom,
          surfaceTop: surface.top,
          surfaceBottom: surface.bottom,
        };
      })
    )
    .toMatchObject({ visible: true });
};

for (const width of [320, 390, 768, 1440]) {
  test(`fixed charge/income share the popup and survive keyboard transitions at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await keyboardViewport(page, width);
    await prepareProtectedPage(page);
    const writes = [];
    let reject = true;
    await page.route(/\/v1\/operations-fixes\/charges(?:\?.*)?$/, (route) => {
      if (route.request().method() === "POST") {
        writes.push(route.request().postDataJSON());
        return route.fulfill({
          status: reject ? 500 : 201,
          json: {
            success: !reject,
            data: { ...writes.at(-1), idOperationFixe: 9 },
          },
        });
      }
      return route.fulfill({
        json: {
          success: true,
          data: [],
          meta: { hasNext: false, nextCursor: null, limit: 100 },
        },
      });
    });
    await page.goto("/home/operations-fixes");
    const add = page.getByRole("button", { name: "Ajouter", exact: true });
    await add.click();
    const dialog = page.getByRole("dialog", {
      name: "Ajouter un élément fixe",
    });
    await expect(dialog).toBeVisible();
    await expect(page.locator("#root")).toHaveAttribute("inert", "");
    await expect(page.locator(".quick-add-dock")).toBeHidden();
    await page.evaluate(() => window.setKeyboardViewport(380, 24));
    const title = dialog.getByLabel("Titre de la charge");
    await title.fill("Loyer partagé");
    await assertAboveKeyboard(title);
    await dialog.getByLabel("Montant total par échéance").fill("1000");
    await assertAboveKeyboard(dialog.getByLabel("Montant total par échéance"));
    await dialog.getByLabel("Ma part de la charge (%)").fill("50");
    await assertAboveKeyboard(dialog.getByLabel("Ma part de la charge (%)"));
    await dialog.getByRole("radio", { name: "Entrée", exact: true }).check();
    await dialog.getByLabel("Titre de l’entrée").fill("Pension");
    await assertAboveKeyboard(dialog.getByLabel("Titre de l’entrée"));
    await dialog.getByLabel("Montant reçu par mois").fill("250,50");
    await dialog.getByRole("radio", { name: "Charge", exact: true }).check();
    await expect(title).toHaveValue("Loyer partagé");
    await assertAboveKeyboard(title);
    await assertFits(dialog);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const save = dialog.getByRole("button", { name: "Enregistrer la charge" });
    await save.click();
    await expect(dialog).toContainText(
      "La charge n’a pas pu être enregistrée."
    );
    await expect(title).toHaveValue("Loyer partagé");
    reject = false;
    await save.click();
    await expect(dialog).toBeHidden();
    await page.evaluate(() => window.setKeyboardViewport(844));
    await expect(add).toBeFocused();
    await expect(page.locator("#root")).not.toHaveAttribute("inert");
    expect(writes).toHaveLength(2);
    await add.click();
    await assertAboveKeyboard(dialog.getByLabel("Titre de la charge"));
    await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(add).toBeFocused();
  });

  test(`operation date aligns with other fields without horizontal scroll at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await keyboardViewport(page, width);
    await prepareProtectedPage(page);
    await page.goto("/calendrier");
    if (width < 768) {
      await page
        .getByRole("button", { name: "Ajouter une opération ou un événement" })
        .click();
    } else {
      // The same provider is also opened from calendar actions on desktop.
      await page.goto("/operations");
      await page
        .getByRole("button", { name: "Ajouter une opération", exact: true })
        .click();
    }
    await page
      .getByRole("button", { name: /^Dépense Opération réelle/ })
      .click();
    const form = page.locator(".one-off-form");
    await expect(form).toBeVisible();
    const date = form.locator('input[type="date"]');
    await date.fill("2026-10-28");
    await expect(date).toHaveCSS("appearance", "none");
    for (const fontSize of ["100%", "200%"]) {
      await page.evaluate(
        (value) => (document.documentElement.style.fontSize = value),
        fontSize
      );
      const sizing = await form.evaluate((form) => {
        return {
          width: form.clientWidth,
          scroll: form.scrollWidth,
          wide: [...form.querySelectorAll("*")]
            .filter(
              (node) =>
                node.scrollWidth > node.clientWidth + 1 ||
                node.getBoundingClientRect().right >
                  form.getBoundingClientRect().right + 1
            )
            .map((node) => ({
              tag: node.tagName,
              type: node.type,
              name: node.name,
              class: node.className,
              width: node.clientWidth,
              scroll: node.scrollWidth,
              left: node.getBoundingClientRect().left,
              right: node.getBoundingClientRect().right,
            })),
        };
      });
      expect(sizing.scroll <= sizing.width + 1, JSON.stringify(sizing)).toBe(
        true
      );
      const dateBox = await date.boundingBox();
      const currencyBox = await form
        .locator('select[name="currency"]')
        .boundingBox();
      expect(Math.abs(dateBox.width - currencyBox.width)).toBeLessThanOrEqual(
        1
      );
      if (width < 768) {
        await page.evaluate(() => window.setKeyboardViewport(380, 24));
        await date.focus();
        await assertAboveKeyboard(date);
        await assertFits(
          page.getByRole("dialog", { name: "Création au budget" })
        );
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await page.screenshot({ path: test.info().outputPath("aligned-date.png") });
  });
}
