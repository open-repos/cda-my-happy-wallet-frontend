import { expect, Page, test } from "@playwright/test";

// Reste à vivre actualisé comparé au théorique sur l'Accueil (#393, maquettes
// A et C de #391). Résumé du serveur de test (`scripts/serve-export.mjs`) :
// théorique 1 500,00 €, reste prévisionnel 887,50 €, 21 jours restants,
// disponible prudent 42,26 € ; novembre compte 30 jours (part 50,00 €).

const signIn = async (page: Page) => {
  await page.clock.setFixedTime(new Date("2026-11-11T10:00:00+01:00"));
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("happy@example.test");
  await page
    .getByRole("textbox", { exact: true, name: "Mot de passe" })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    page.getByText("Votre budget en un coup d’œil", { exact: true }),
  ).toBeVisible();
};

const expectNoHorizontalOverflow = async (page: Page) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
};

// Expo Web n'a pas d'échelle de police système : chaque texte rendu est
// agrandi ×1,3, comme dans `pending-items.spec.ts`.
const enlargeText = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((root) => {
    for (const el of root.querySelectorAll<HTMLElement>("*")) {
      if (el.childElementCount === 0 && el.textContent?.trim()) {
        const original =
          el.dataset.comparisonTestFontSize ?? getComputedStyle(el).fontSize;
        el.dataset.comparisonTestFontSize = original;
        el.style.fontSize = `${parseFloat(original) * 1.3}px`;
        el.style.lineHeight = "normal";
      }
    }
  });

/** Textes rognés ou hors écran, et cibles de moins de 48 px. */
const overflowing = (page: Page, testId: string) =>
  page.getByTestId(testId).evaluate((root) => {
    const bad: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>("*")) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || !el.checkVisibility()) {
        continue;
      }
      const label = (el.textContent ?? "").trim().slice(0, 30);
      if (
        el.childElementCount === 0 &&
        label.length > 0 &&
        (rect.right > window.innerWidth + 0.5 ||
          rect.left < -0.5 ||
          el.scrollWidth > el.clientWidth + 1)
      ) {
        bad.push(`débordement: ${label}`);
      }
      const role = el.getAttribute("role");
      if ((role === "button" || role === "radio") && rect.height < 48) {
        bad.push(`cible ${Math.round(rect.height)} px: ${label}`);
      }
    }
    return bad;
  });

test("compares the actualized and theoretical remaining per period", async ({
  page,
}) => {
  await signIn(page);
  const card = page.getByTestId("remaining-comparison");
  await expect(card).toBeVisible();

  // Mois par défaut : prévisionnel du serveur face au théorique.
  await expect(card.getByRole("radio", { name: "Mois" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(
    card.getByRole("heading", { name: "Reste à vivre du mois" }),
  ).toBeVisible();
  await expect(
    card.getByLabel(
      /^Reste à vivre du mois : 887,50\s€ sur 1\s500,00\s€ théorique\.$/,
    ),
  ).toBeVisible();
  await expect(
    card.getByText(
      /^612,50\s€ de moins ce mois-ci que votre part théorique\.$/,
    ),
  ).toBeVisible();
  const bar = card.getByRole("progressbar");
  await expect(bar).toHaveAttribute("aria-valuenow", "59");
  await expect(
    card.getByLabel(
      /^Ce mois-ci\. Actualisé 887,50\s€\. Théorique 1\s500,00\s€\./,
    ),
  ).toBeVisible();
  for (const name of ["Mois", "Semaine", "Jour"]) {
    expect(
      (await card.getByRole("radio", { name }).boundingBox())?.height,
    ).toBeGreaterThanOrEqual(48);
  }
  await expectNoHorizontalOverflow(page);
  await expect(card).toHaveScreenshot("remaining-month.png");

  // Jour : part prudente du jour face à la part quotidienne tronquée.
  await card.getByRole("radio", { name: "Jour" }).click();
  await expect(card.getByRole("radio", { name: "Jour" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(
    card.getByLabel(
      /^Reste à vivre aujourd’hui : 42,26\s€ sur 50,00\s€ théorique\.$/,
    ),
  ).toBeVisible();
  await expect(
    card.getByText(/^7,74\s€ de moins par jour que votre part théorique\.$/),
  ).toBeVisible();
  await expect(bar).toHaveAttribute("aria-valuenow", "85");
  await expect(card.getByText(/^42,26\s€ par jour × 1 jour\./)).toBeVisible();
  await expect(card).toHaveScreenshot("remaining-day.png");

  // Semaine : sept jours, tous dans le mois.
  await card.getByRole("radio", { name: "Semaine" }).click();
  await expect(
    card.getByLabel(
      /^Reste à vivre sur 7 jours : 295,82\s€ sur 350,00\s€ théorique\.$/,
    ),
  ).toBeVisible();
  await expect(
    card.getByText(
      /^54,18\s€ de moins sur 7 jours que votre part théorique\.$/,
    ),
  ).toBeVisible();
  // « Ce mois-ci » ne dépend pas de la période choisie.
  await expect(
    card.getByLabel(/^Ce mois-ci\. Actualisé 887,50\s€\./),
  ).toBeVisible();
});

test("details the calculation from the theoretical to the actualized", async ({
  page,
}) => {
  await signIn(page);
  await page
    .getByTestId("remaining-comparison")
    .getByRole("button", { name: "Voir le détail du calcul" })
    .click();
  const detail = page.getByTestId("calculation-detail");
  await expect(detail.getByText("Du théorique à l’actualisé")).toBeVisible();
  const rows = [
    /^Reste à vivre théorique : 1\s500,00\s€$/,
    /^Entrées déjà reçues : 0,00\s€$/,
    /^Dépenses déjà faites : -42,50\s€$/,
    /^Report d’août : -120,00\s€$/,
    /^Entrées prévues : 0,00\s€$/,
    /^Dépenses prévues : -300,00\s€$/,
    /^Épargne des objectifs : -150,00\s€$/,
    /^Reste à vivre actualisé : 887,50\s€$/,
  ];
  for (const row of rows) await expect(detail.getByLabel(row)).toBeVisible();
  // 1 500 + 0 − 42,50 − 120 + 0 − 300 − 150 = 887,50 €.
  const perDay = detail.getByTestId("calculation-per-day");
  await expect(
    perDay.getByLabel(
      /^Aujourd’hui, actualisé : 42,26\s€, 887,50\s€ ÷ 21 jours restants$/,
    ),
  ).toBeVisible();
  await expect(
    perDay.getByLabel(/^Théorique : 50,00\s€, 1\s500,00\s€ ÷ 30 jours$/),
  ).toBeVisible();

  // Le contenu défile ; le titre et « Fermer » restent visibles.
  const close = detail.getByRole("button", {
    name: "Fermer le détail du calcul",
  });
  await close.click({ trial: true });
  await perDay.scrollIntoViewIfNeeded();
  await expect(perDay).toBeInViewport();
  await expect(close).toBeInViewport();
  await expectNoHorizontalOverflow(page);
  await expect(detail).toHaveScreenshot("remaining-detail.png");
  await close.click();
  await expect(detail).toHaveCount(0);
});

test("keeps the comparison readable with text enlarged 1.3 times", async ({
  page,
}) => {
  await signIn(page);
  const card = page.getByTestId("remaining-comparison");
  await card.getByRole("radio", { name: "Jour" }).click();
  await enlargeText(page, "remaining-comparison");
  expect(await overflowing(page, "remaining-comparison")).toEqual([]);

  await card.getByRole("button", { name: "Voir le détail du calcul" }).click();
  await page
    .getByRole("button", { name: "Fermer le détail du calcul" })
    .click({ trial: true });
  await enlargeText(page, "calculation-detail");
  expect(await overflowing(page, "calculation-detail")).toEqual([]);
  await expectNoHorizontalOverflow(page);
});
