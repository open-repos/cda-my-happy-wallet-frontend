import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const)
  for (const width of [320, 390, 768, 1440]) {
    test(`goal gauge stays readable at ${width}px in ${theme}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/sign-in");
      await page.getByLabel("Email").fill("happy@example.test");
      await page
        .getByRole("textbox", { exact: true, name: "Mot de passe" })
        .fill("correct-horse-battery-staple");
      await page.getByRole("button", { name: "Se connecter" }).click();
      await page.getByRole("tab", { name: "Objectifs et événements" }).click();
      const card = page.getByTestId("goal-card-1");
      await expect(card).toBeVisible();
      await expect(
        card.getByRole("progressbar", {
          name: /^25 % de l’objectif Voyage atteint/,
        }),
      ).toHaveAttribute("aria-valuenow", "25");
      await expect(card.locator("svg")).toHaveCount(1);
      await expect(card.getByText("mars 2027", { exact: true })).toBeVisible();
      const failures = await card.evaluate((root) => {
        const rgb = (value: string) =>
          value
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number);
        const light = (value: string) =>
          rgb(value)
            .map((n) => {
              n /= 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            })
            .reduce((v, n, i) => v + n * [0.2126, 0.7152, 0.0722][i], 0);
        const backgroundOf = (element: Element): string => {
          for (
            let node: Element | null = element;
            node;
            node = node.parentElement
          ) {
            const value = getComputedStyle(node).backgroundColor;
            if (value !== "transparent" && !value.endsWith(", 0)"))
              return value;
          }
          return "rgb(255, 255, 255)";
        };
        return [...root.querySelectorAll<HTMLElement>("*")]
          .filter(
            (el) =>
              !el.closest("svg") &&
              el.childNodes.length > 0 &&
              [...el.childNodes].some(
                (n) => n.nodeType === 3 && n.textContent?.trim(),
              ),
          )
          .flatMap((el) => {
            const style = getComputedStyle(el),
              values = [light(style.color), light(backgroundOf(el))].sort(
                (a, b) => b - a,
              );
            return (values[0] + 0.05) / (values[1] + 0.05) <
              (parseFloat(style.fontSize) >= 24 ? 3 : 4.5)
              ? [el.textContent]
              : [];
          });
      });
      expect(failures).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      await card.screenshot({ path: testInfo.outputPath("goal-gauge.png") });
    });
  }
