import { expect, test } from "@playwright/test";

const explanation =
  "soit votre part quotidienne du reste à vivre de base cumulée jusqu’à ce jour, moins les dépenses et plus les entrées saisies ou prévues jusqu’à cette date.";

for (const width of [320, 390, 768, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    for (const textScale of [1, 2]) {
      test(`daily remaining ${width} ${theme} text ${textScale}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 1000 });
        await page.emulateMedia({ colorScheme: theme });
        await page.clock.setFixedTime(new Date("2026-10-11T10:00:00+02:00"));
        await page.goto("/sign-in");
        await page.getByLabel("Email").fill("happy@example.test");
        await page
          .getByRole("textbox", { exact: true, name: "Mot de passe" })
          .fill("correct-horse-battery-staple");
        await page.getByRole("button", { name: "Se connecter" }).click();
        const monthly = page.getByText(/^1\s337,50\s€$/);
        await expect(monthly).toBeVisible();
        await page.getByRole("tab", { name: "Calendrier" }).click();
        await page.getByRole("radio", { name: "Prévisionnel" }).click();
        await expect(
          page.getByRole("radio", { name: "Prévisionnel" }),
        ).toBeChecked();
        // Expo Web has no OS fontScale. Enlarge every rendered text leaf,
        // including headings and newly mounted day details; native sizing has
        // separate layout coverage.
        const enlargeText = async () => {
          if (textScale !== 2) return;
          await page.getByTestId("calendar-scroll-content").evaluate((root) => {
            for (const el of root.querySelectorAll<HTMLElement>("*")) {
              if (el.childElementCount === 0 && el.textContent?.trim()) {
                const original =
                  el.dataset.calendarTestFontSize ??
                  getComputedStyle(el).fontSize;
                el.dataset.calendarTestFontSize = original;
                el.style.fontSize = `${parseFloat(original) * 2}px`;
                el.style.lineHeight = "normal";
              }
            }
          });
        };
        await enlargeText();
        const first = page.getByRole("button", {
          name: /^3 octobre 2026.*Reste à vivre du jour 17,25/,
        });
        const second = page.getByRole("button", {
          name: /^20 octobre 2026.*Reste à vivre du jour -4,17/,
        });
        await expect(first.getByTestId("calendar-day-value")).toHaveText("17");
        await expect(second.getByTestId("calendar-day-value")).toHaveText("-4");
        for (const day of [first, second]) {
          await day.scrollIntoViewIfNeeded();
          const bounds = await day.boundingBox();
          expect(bounds!.width).toBeGreaterThanOrEqual(48);
          expect(bounds!.height).toBeGreaterThanOrEqual(48);
          const value = day.getByTestId("calendar-day-value");
          expect(
            await value.evaluate((el) => el.scrollWidth <= el.clientWidth),
          ).toBe(true);
          const rect = await value.boundingBox();
          expect(rect!.x).toBeGreaterThanOrEqual(bounds!.x);
          expect(rect!.x + rect!.width).toBeLessThanOrEqual(
            bounds!.x + bounds!.width,
          );
          const color = await value.evaluate(
            (el) => getComputedStyle(el).color,
          );
          expect(color).toBe(
            day === first
              ? theme === "light"
                ? "rgb(7, 94, 59)"
                : "rgb(191, 224, 165)"
              : theme === "light"
                ? "rgb(163, 7, 7)"
                : "rgb(238, 138, 120)",
          );
        }
        await first.click();
        await enlargeText();
        await expect(first).toHaveAttribute("aria-pressed", "true");
        await expect(
          page.getByTestId("calendar-daily-remaining-detail"),
        ).toHaveText(`Reste à vivre du jour : 17,25 €, ${explanation}`);
        await expect(page.getByTestId("calendar-announcement")).toContainText(
          "17,25",
        );
        await expect(page.getByTestId("calendar-announcement")).toContainText(
          "1 opération réelle",
        );
        await second.scrollIntoViewIfNeeded();
        await second.focus();
        await page.keyboard.press("Enter");
        await enlargeText();
        await expect(second).toHaveAttribute("aria-pressed", "true");
        await expect(first).toHaveAttribute("aria-pressed", "false");
        await expect(
          page.getByTestId("calendar-daily-remaining-detail"),
        ).toHaveText(`Reste à vivre du jour : -4,17 €, ${explanation}`);
        await expect(page.getByTestId("calendar-announcement")).toContainText(
          "20 octobre 2026",
        );
        await expect(page.getByTestId("calendar-announcement")).toContainText(
          "-4,17",
        );
        await expect(page.getByTestId("calendar-announcement")).toContainText(
          explanation,
        );
        await page
          .getByTestId("calendar-daily-remaining-detail")
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: test
            .info()
            .outputPath(`daily-remaining-${width}-${theme}-${textScale}.png`),
        });
        await page
          .getByRole("button", { name: "Tout le mois", exact: true })
          .click();
        await expect(
          page.getByTestId("calendar-daily-remaining-detail"),
        ).toHaveCount(0);
        await expect(page.getByTestId("calendar-announcement")).toHaveText(
          "Éléments du mois.",
        );
        const missing = page.getByRole("button", { name: /^4 octobre 2026\./ });
        await expect(missing.getByTestId("calendar-day-value")).toHaveCount(0);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        await page.getByRole("tab", { name: "Tableau de bord" }).click();
        await expect(monthly).toBeVisible();
      });
    }
  }
}

for (const theme of ["light", "dark"] as const) {
  test(`captures daily forecast ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.clock.setFixedTime(new Date("2026-10-11T10:00:00+02:00"));
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("happy@example.test");
    await page
      .getByRole("textbox", { exact: true, name: "Mot de passe" })
      .fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.getByRole("tab", { name: "Calendrier" }).click();
    await page.getByRole("radio", { name: "Prévisionnel" }).click();
    const day = page.getByRole("button", {
      name: /^20 octobre 2026.*Reste à vivre du jour -4,17/,
    });
    await day.click();
    await page
      .getByTestId("calendar-daily-remaining-detail")
      .scrollIntoViewIfNeeded();
    await expect(page).toHaveScreenshot(
      `calendar-daily-remaining-${theme}.png`,
      { fullPage: true },
    );
  });
}

test("renders small deficits, zero, extreme values and missing daily values", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-11T10:00:00+02:00"));
  await page.route(/\/budget-periods\/2026-10\/summary\?/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const point = body.data.days[0];
    body.data.days = ["-0.40", null, undefined, "0.00", "-9999999999.99"].map(
      (dailyRemaining, index) => ({
        ...point,
        date: `2026-10-0${index + 1}`,
        dailyRemaining,
      }),
    );
    await route.fulfill({ json: body });
  });
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("happy@example.test");
  await page
    .getByRole("textbox", { exact: true, name: "Mot de passe" })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByRole("tab", { name: "Calendrier" }).click();
  await page.getByRole("radio", { name: "Prévisionnel" }).click();
  for (const [day, value] of [
    [1, "-0,40"],
    [2, null],
    [3, null],
    [4, "0"],
    [5, "-10000000 k"],
  ] as const) {
    const cell = page.getByRole("button", {
      name: new RegExp(`^${day} octobre 2026\\.`),
    });
    await cell.scrollIntoViewIfNeeded();
    if (value === null) {
      await expect(cell.getByTestId("calendar-day-value")).toHaveCount(0);
      await cell.click();
      await expect(
        page.getByTestId("calendar-daily-remaining-detail"),
      ).toHaveCount(0);
    } else {
      const amount = cell.getByTestId("calendar-day-value");
      await expect(amount).toHaveText(value);
      expect(
        await amount.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    }
  }
  await page.getByRole("radio", { name: "Dépenses" }).click();
  await expect(
    page
      .getByRole("button", { name: /^1 octobre 2026\./ })
      .getByTestId("calendar-day-value"),
  ).toHaveText("-43");
});
