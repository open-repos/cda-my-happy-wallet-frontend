import { expect, test } from "@playwright/test";

test("announces user day changes but keeps focus refresh silent", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-11T10:00:00+02:00"));
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("happy@example.test");
  await page
    .getByRole("textbox", { exact: true, name: "Mot de passe" })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByRole("tab", { name: "Calendrier" }).click();
  await page.getByRole("radio", { name: "Prévisionnel" }).click();
  await page
    .getByRole("button", { name: /^3 octobre 2026.*1 opération réelle/ })
    .click();
  const region = page.getByTestId("calendar-announcement");
  await expect(region).toContainText("17,25");
  await region.evaluate((el) => {
    const observed = window as Window & { calendarAnnouncements?: string[] };
    observed.calendarAnnouncements = [];
    new MutationObserver(() => {
      observed.calendarAnnouncements!.push(el.textContent ?? "");
    }).observe(el, { characterData: true, childList: true, subtree: true });
  });
  await page.getByRole("tab", { name: "Tableau de bord" }).click();
  // Make the reread observable in the displayed value without requesting an announcement.
  await page.route(/\/budget-periods\/2026-10\/summary\?/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.data.days[0].dailyRemaining = "18.25";
    await route.fulfill({ json: body });
  });
  await page.getByRole("tab", { name: "Calendrier" }).click();
  await expect(
    page.getByRole("button", {
      name: /^3 octobre 2026.*18,25.*1 opération réelle/,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { calendarAnnouncements?: string[] })
          .calendarAnnouncements,
    ),
  ).toEqual([]);
  await page
    .getByRole("button", { name: /^20 octobre 2026.*1 événement prévu/ })
    .click();
  await expect(region).toContainText("20 octobre 2026");
  await expect(region).toContainText("-4,17");
});
