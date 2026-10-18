import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const pages = [
  {
    path: "/login",
    heading: /Bienvenue sur MyHappyWallet/i,
    action: "Connexion",
  },
  {
    path: "/register",
    heading: /Créer un compte pour utiliser MyHappyWallet/i,
    action: "S'enregistrer",
  },
  {
    path: "/forgot-password",
    heading: /Vous avez oublié votre mot de passe/i,
    action: "Changer de mot de passe",
  },
  {
    path: "/new-password",
    heading: /Choisissez votre nouveau mot de passe/i,
    action: "Confirmation du nouveau mot de passe",
  },
];

// Shared synthetic API boundary, with no real HTTP dependency.

const protectedPages = [
  { path: "/home", selector: ".home-budget" },
  { path: "/calendrier", selector: ".calendrier-container" },
  { path: "/objectifs-evenements", selector: ".objEv-container" },
  { path: "/operations", selector: ".operations-container" },
  { path: "/categories", selector: ".categories-container" },
  { path: "/analyses", selector: ".analytics" },
  { path: "/profil", selector: ".profil-container" },
];

for (const viewport of viewports) {
  for (const pageDefinition of pages) {
    test(`${pageDefinition.path} fits the ${viewport.name} viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(pageDefinition.path);

      await expect(
        page.getByRole("heading", { name: pageDefinition.heading })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: pageDefinition.action })
      ).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(hasHorizontalOverflow).toBe(false);
    });
  }

  test(`protected shell fits the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    await page.goto("/calendrier");

    await expect(
      page.getByRole("heading", { name: "Calendrier" })
    ).toBeVisible();

    const contentBounds = await page
      .locator(".protected-layout__content")
      .boundingBox();
    expect(contentBounds.x).toBeGreaterThanOrEqual(0);
    expect(contentBounds.x + contentBounds.width).toBeLessThanOrEqual(
      viewport.width
    );
  });

  test(`budget calendar explains the carry on the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    await page.goto("/calendrier");

    const real = page.locator("article", {
      has: page.getByRole("heading", { name: "Reste réel" }),
    });
    await expect(real.getByText(/^Report d/)).toBeVisible();
    await expect(real).toContainText("120,00");
    await expect(
      page.getByRole("heading", { name: "Reste prévisionnel" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prévus" })).toBeVisible();

    await page.getByText("Prévisionnel", { exact: true }).click();
    await expect(
      page.getByRole("button", { name: /reste prévisionnel 767,50/ })
    ).toContainText("767");

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
    const smallestDay = await page
      .locator(".budget-day")
      .evaluateAll((days) =>
        Math.min(...days.map((day) => day.getBoundingClientRect().height))
      );
    expect(smallestDay).toBeGreaterThanOrEqual(44);
  });

  test(`home shows the reste à vivre views on the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    await page.goto("/home");

    await expect(
      page.getByRole("heading", { name: "Reste à vivre du mois" })
    ).toBeVisible();
    await expect(page.locator(".home-budget__amount")).toContainText("037,50");
    await expect(page.getByText(/^Report d/)).toBeVisible();
    const content = await page
      .locator(".protected-layout__content")
      .boundingBox();
    const remaining = await page
      .locator(".home-budget__remaining")
      .boundingBox();
    expect(
      Math.abs(
        remaining.x + remaining.width / 2 - (content.x + content.width / 2)
      )
    ).toBeLessThan(2);

    await page.getByText("Semaine", { exact: true }).click();
    await expect(page.locator(".home-budget__amount")).toContainText("447,72");
    await expect(page.getByText(/63,96\s€ par jour × 7 jours/)).toBeVisible();

    await page.getByText("Jour", { exact: true }).click();
    await expect(page.locator(".home-budget__amount")).toContainText("63,96");

    await expect(
      page.getByRole("list", { name: "Dépenses par catégorie" })
    ).toContainText("Alimentation");
    const expenseCanvas = page.locator(".home-chart canvas");
    await expect(expenseCanvas).toBeVisible();
    expect((await expenseCanvas.boundingBox()).height).toBeGreaterThan(100);
    const expensesGraph = page.getByRole("img", {
      name: /^Graphique des dépenses du mois par catégorie/,
    });
    await expect(expensesGraph).toBeVisible();
    await page.getByText("Secteurs", { exact: true }).click();
    await expect(page.locator(".home-chart--pie canvas")).toBeVisible();
    await expect(expensesGraph).toBeVisible();
    await expect(page.locator(".home-ring canvas")).toBeVisible();
    await expect(
      page.getByRole("img", { name: /25 % de l’épargne visée atteinte/ })
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test(`analytics explorer charts two combinations on the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    await page.goto("/home");
    // Entrée de la barre latérale (dans le tiroir fermé sur mobile).
    await expect(page.locator('a[href="/analyses"]')).toHaveCount(1);
    await page.getByRole("link", { name: "Explorer mes dépenses" }).click();
    await expect(page).toHaveURL(/\/analyses\?metric=expense&groupBy=category/);
    await expect(page.getByRole("heading", { name: "Analyses" })).toBeVisible();

    // Défaut : dépenses du mois par catégorie, en secteurs.
    await expect(page.locator(".analytics-chart canvas")).toBeVisible();
    await expect(
      page.getByRole("img", { name: /^Graphique en secteurs : dépenses/ })
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Dépenses par catégorie" })
    ).toContainText("Alimentation");

    // Mois ventilés par catégorie, en barres empilées, sur 12 mois.
    await page.getByLabel("Regrouper par").selectOption("month");
    await page.getByLabel("Ventiler").selectOption("category");
    await page.getByLabel("Période").selectOption("12m");
    await expect(page).toHaveURL(/splitBy=category/);
    await expect(page.getByLabel("Type de graphique")).toHaveValue("stacked");
    await expect(
      page.getByRole("img", { name: /^Graphique en barres empilées/ })
    ).toBeVisible();
    await expect(page.locator(".analytics-chart canvas")).toBeVisible();
    const table = page.getByRole("table", { name: "Dépenses par mois" });
    await expect(table.getByRole("columnheader")).toHaveText([
      "Mois",
      "Alimentation",
      "Loisirs",
      "Total",
    ]);

    // Le lien partagé restaure les choix.
    await page.reload();
    await expect(page.getByLabel("Ventiler")).toHaveValue("category");

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test(`financial goals are listed and created on the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    await page.goto("/objectifs-evenements");

    await expect(
      page.getByRole("heading", { name: "Objectifs et événements", level: 1 })
    ).toBeVisible();
    const card = page.getByRole("article", { name: "Vélo" });
    await expect(card).toContainText("Sans échéance");
    await expect(card).toContainText("avril 2027");
    await expect(card.locator("canvas")).toBeVisible();

    await page.getByRole("button", { name: "Ajouter un objectif" }).click();
    await page.getByLabel("Titre", { exact: true }).fill("Vacances");
    await page.getByLabel(/^Montant cible/).fill("1500");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status")).toContainText("Objectif ajouté.");
    await expect(page.getByRole("article", { name: "Vacances" })).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Événements mensuels" })
    ).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test(`categories are created with an icon and refused when in use on the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    const categories = [
      { id: 4, name: "Alimentation", color: "#55AA22", icon: "solid:utensils" },
    ];
    // Enregistrée après `prepareProtectedPage` : prioritaire sur sa route GET.
    await page.route(
      /\/v1\/operation-categories(?:\/\d+)?(?:\?.*)?$/,
      (route) => {
        const request = route.request();
        if (request.method() === "POST") {
          const created = { id: 9, icon: null, ...request.postDataJSON() };
          categories.push(created);
          return route.fulfill({ status: 201, json: { data: created } });
        }
        if (request.method() === "DELETE") {
          return route.fulfill({
            status: 409,
            json: {
              error: {
                type: "Conflict",
                message: "Resource conflict",
                details: { code: "CATEGORY_IN_USE" },
              },
            },
          });
        }
        return route.fulfill({
          json: {
            data: categories,
            meta: { limit: 100, hasNext: false, nextCursor: null },
          },
        });
      }
    );
    await page.goto("/categories");

    await expect(
      page.getByRole("heading", { name: "Catégories d’opérations", level: 1 })
    ).toBeVisible();
    await page.getByRole("button", { name: "Ajouter une catégorie" }).click();
    await page.getByLabel("Nom", { exact: true }).fill("Loisirs");
    await page.getByRole("radio", { name: "Bleu" }).check();
    const icons = page.getByRole("group", { name: "Icône" });
    await icons.getByLabel("Rechercher une icône").fill("cinéma");
    await icons.getByRole("radio", { name: "film (plein)" }).check();
    await expect(
      page.getByRole("img", { name: "Aperçu : Loisirs, icône film (plein)" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status")).toContainText("Catégorie ajoutée.");
    const list = page.getByRole("list", { name: "Vos catégories" });
    await expect(list.getByText("Loisirs")).toBeVisible();
    // Icônes décoratives dessinées dans la couleur de chaque catégorie.
    await expect(list.locator("svg.category-icon")).toHaveCount(2);

    await page.getByRole("button", { name: "Modifier Alimentation" }).click();
    await page.getByRole("button", { name: "Supprimer" }).click();
    await page.getByRole("button", { name: "Oui, supprimer" }).click();
    await expect(page.getByRole("alert").first()).toContainText(
      "Cette catégorie est utilisée par des opérations"
    );

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test(`operations fixes fit the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    await page.goto("/home/operations-fixes");

    await expect(
      page.getByRole("heading", { name: "Home - Operations Fixes" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sauvegarder" })
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  for (const protectedPage of protectedPages) {
    test(`${protectedPage.path} fits the protected ${viewport.name} viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await prepareProtectedPage(page);
      await page.goto(protectedPage.path);

      await expect(page.locator(protectedPage.selector)).toBeVisible();
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
}

test("mobile navigation is a drawer that never covers the page", async ({
  page,
}) => {
  await page.setViewportSize(viewports[0]);
  await prepareProtectedPage(page);
  const navigation = page.getByRole("navigation", {
    name: "Navigation principale",
  });
  const menu = page.getByRole("button", { name: "Ouvrir le menu" });

  for (const protectedPage of protectedPages) {
    await page.goto(protectedPage.path);
    await expect(page.locator(protectedPage.selector)).toBeVisible();
    await expect(navigation).toBeHidden();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  }

  await menu.click();
  await expect(navigation).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: /Analyses/ })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();

  // Un vrai clic hors de la navigation atteint le fond et referme le tiroir.
  await menu.click();
  await expect(navigation).toBeVisible();
  await page.mouse.click(370, 420);
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();

  // Rotation en paysage : le tiroir ouvert se referme au passage desktop.
  await menu.click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByRole("button", { name: "Ouvrir le menu" })
  ).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize(viewports[0]);

  await menu.click();
  await navigation.getByRole("link", { name: /Calendrier/ }).click();
  await expect(page).toHaveURL(/\/calendrier$/);
  await expect(navigation).toBeHidden();
});

/** Contraste d'un texte contre le fond qu'il porte lui-même. */
const ownContrast = (locator) =>
  locator.evaluate((element) => {
    const parse = (value) => {
      const [r, g, b] = value.match(/\d+(\.\d+)?/g).map(Number);
      return { r, g, b };
    };
    const luminance = ({ r, g, b }) => {
      const channel = (value) => {
        const scaled = value / 255;
        return scaled <= 0.03928
          ? scaled / 12.92
          : ((scaled + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const style = getComputedStyle(element);
    const [high, low] = [
      luminance(parse(style.color)),
      luminance(parse(style.backgroundColor)),
    ].sort((a, b) => b - a);
    return (high + 0.05) / (low + 0.05);
  });

for (const theme of ["light", "dark"]) {
  test(`category form errors are readable in the ${theme} theme`, async ({
    page,
  }) => {
    await page.setViewportSize(viewports[2]);
    await prepareProtectedPage(page);
    await page.addInitScript((value) => {
      window.localStorage.setItem("mhw-theme", value);
    }, theme);
    await page.goto("/categories");
    await page.getByRole("button", { name: "Ajouter une catégorie" }).click();
    await page.getByLabel("Nom", { exact: true }).fill("x");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    expect(
      await ownContrast(page.locator("#category-name-error"))
    ).toBeGreaterThanOrEqual(4.5);

    await page.getByRole("button", { name: "Fermer le formulaire" }).click();
    await page.getByRole("button", { name: "Modifier Alimentation" }).click();
    await page.getByRole("button", { name: "Supprimer" }).click();
    expect(
      await ownContrast(
        page.locator(".category-form .one-off-delete-confirmation")
      )
    ).toBeGreaterThanOrEqual(4.5);
  });
}

test("the icon picker recovers after the icon file fails to download", async ({
  page,
}) => {
  await page.setViewportSize(viewports[2]);
  await prepareProtectedPage(page);
  let attempts = 0;
  // Sans icône dans la liste : le premier téléchargement vient du sélecteur.
  await page.route(/\/v1\/operation-categories(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        data: [{ id: 4, name: "Alimentation", color: "#55AA22", icon: null }],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    })
  );
  // Seul le téléchargement des tracés échoue, pas le module de la page.
  await page.route(/category-icons.*\.json/, (route) => {
    if (route.request().resourceType() !== "fetch") return route.continue();
    attempts += 1;
    return attempts === 1 ? route.abort() : route.continue();
  });
  await page.goto("/categories");
  await page.getByRole("button", { name: "Ajouter une catégorie" }).click();
  const icons = page.getByRole("group", { name: "Icône" });
  await expect(icons.getByRole("alert")).toContainText(
    "Les icônes n’ont pas pu être chargées."
  );
  await icons.getByRole("button", { name: "Réessayer" }).click();
  await expect(
    icons.getByRole("radio", { name: "cart shopping (plein)" })
  ).toBeVisible();
  expect(attempts).toBe(2);
});

// La navigation à six entrées ne passe jamais sous le bouton du profil : sur
// un écran bas, sa liste défile et le dernier lien reste atteignable (#150).
for (const size of [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 1440, height: 600 },
  { width: 375, height: 667 },
]) {
  test(`navigation links stay above the profile at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await prepareProtectedPage(page);
    await page.goto("/home");
    if (size.width < 768) {
      await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    }
    const navigation = page.getByRole("navigation", {
      name: "Navigation principale",
    });
    const profile = await navigation
      .getByRole("button", { name: "Afficher le profil" })
      .boundingBox();
    const list = await navigation.getByRole("list").first().boundingBox();
    expect(list.y + list.height).toBeLessThanOrEqual(profile.y);
    expect(profile.y + profile.height).toBeLessThanOrEqual(size.height);

    // Le défilement reste un dernier recours : les six entrées tiennent.
    const [scrollHeight, clientHeight] = await navigation
      .getByRole("list")
      .first()
      .evaluate((element) => [element.scrollHeight, element.clientHeight]);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
    // L'anneau de focus (2px + 2px de décalage) tient dans la liste, qui
    // rogne ce qui dépasse quand elle défile.
    if (size.height <= 740) {
      const first = await navigation
        .getByRole("link", { name: "Calendrier" })
        .boundingBox();
      expect(first.x - 4).toBeGreaterThanOrEqual(list.x);
      expect(first.x + first.width + 4).toBeLessThanOrEqual(
        list.x + list.width
      );
    }

    const lastLink = navigation.getByRole("link", { name: "Analyses" });
    await lastLink.scrollIntoViewIfNeeded();
    const last = await lastLink.boundingBox();
    expect(last.y + last.height).toBeLessThanOrEqual(list.y + list.height + 1);
    // Le point au centre du lien appartient bien au lien, pas au profil.
    const hit = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest("a")?.textContent,
      { x: last.x + last.width / 2, y: last.y + last.height / 2 }
    );
    expect(hit).toContain("Analyses");
  });
}

for (const viewport of viewports.slice(1)) {
  test(`navigation stays visible on the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    await page.goto("/home");
    await expect(
      page.getByRole("navigation", { name: "Navigation principale" })
    ).toBeVisible();
  });
}

/**
 * Textes visibles posés directement sur la coque (aucun ancêtre opaque avant
 * `body`) dont le contraste WCAG est insuffisant : 4,5:1, ou 3:1 pour un grand
 * texte (≥ 24 px, ou ≥ 18,66 px en gras).
 */
const lowContrastOnShell = (page) =>
  page.evaluate(() => {
    const parse = (color) => {
      const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
      return { r, g, b, a };
    };
    const luminance = ({ r, g, b }) => {
      const [lr, lg, lb] = [r, g, b].map((value) => {
        const channel = value / 255;
        return channel <= 0.03928
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    };
    const ratio = (first, second) => {
      const [high, low] = [luminance(first), luminance(second)].sort(
        (a, b) => b - a
      );
      return (high + 0.05) / (low + 0.05);
    };
    const shell = parse(getComputedStyle(document.body).backgroundColor);
    const onShell = (element) => {
      for (
        let node = element;
        node && node !== document.body;
        node = node.parentElement
      ) {
        const background = parse(getComputedStyle(node).backgroundColor);
        if (background.a > 0) return false;
      }
      return true;
    };
    const failures = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      const element = walker.currentNode.parentElement;
      if (!text || !element || !element.checkVisibility?.()) continue;
      if (element.closest("[aria-hidden='true'], .sr-only, nav")) continue;
      if (!onShell(element)) continue;
      const style = getComputedStyle(element);
      const size = parseFloat(style.fontSize);
      const large =
        size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      const value = ratio(parse(style.color), shell);
      if (value < (large ? 3 : 4.5)) {
        failures.push(`${text.slice(0, 40)} (${value.toFixed(2)}:1)`);
      }
    }
    return failures;
  });

/**
 * Parcourt la page au clavier et renvoie les contrôles posés sur la coque dont
 * l'anneau de focus manque de contraste avec elle (3:1, WCAG 1.4.11).
 */
const weakFocusOnShell = async (page, presses = 40) => {
  const failures = new Set();
  const checked = new Set();
  for (let index = 0; index < presses; index += 1) {
    await page.keyboard.press("Tab");
    const result = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const parse = (color) => {
        const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
        return { r, g, b, a };
      };
      const luminance = ({ r, g, b }) => {
        const [lr, lg, lb] = [r, g, b].map((value) => {
          const channel = value / 255;
          return channel <= 0.03928
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
      };
      for (
        let node = element.parentElement;
        node && node !== document.body;
        node = node.parentElement
      ) {
        if (parse(getComputedStyle(node).backgroundColor).a > 0) return null;
      }
      const style = getComputedStyle(element);
      const name = (
        element.getAttribute("aria-label") ||
        element.textContent ||
        element.tagName
      )
        .trim()
        .slice(0, 30);
      if (
        style.outlineStyle === "none" ||
        parseFloat(style.outlineWidth) === 0
      ) {
        return { name, failure: `${name} (aucun anneau)` };
      }
      const [high, low] = [
        luminance(parse(style.outlineColor)),
        luminance(parse(getComputedStyle(document.body).backgroundColor)),
      ].sort((a, b) => b - a);
      const ratio = (high + 0.05) / (low + 0.05);
      return {
        name,
        failure: ratio < 3 ? `${name} (${ratio.toFixed(2)}:1)` : null,
      };
    });
    if (result) {
      checked.add(result.name);
      if (result.failure) failures.add(result.failure);
    }
  }
  return { failures: [...failures], checked: [...checked] };
};

// Contrôles de la coque que le parcours clavier doit atteindre.
const SHELL_CONTROLS = {
  "/home": ["Ouvrir le menu"],
  "/calendrier": ["Ouvrir le menu", "Mois précédent", "Mois suivant"],
  "/objectifs-evenements": [
    "Ouvrir le menu",
    "Ajouter un objectif",
    "Ajouter un événement",
  ],
  "/operations": [
    "Ouvrir le menu",
    "Gérer les catégories",
    "Ajouter une opération",
  ],
  "/categories": [
    "Ouvrir le menu",
    "Voir les opérations",
    "Ajouter une catégorie",
  ],
  "/analyses": ["Ouvrir le menu"],
  "/profil": ["Ouvrir le menu"],
};

/** Contraste de l'anneau de focus de l'élément actif contre son fond réel. */
const focusRingContrast = (page) =>
  page.evaluate(() => {
    const element = document.activeElement;
    const parse = (color) => {
      const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
      return { r, g, b, a };
    };
    const luminance = ({ r, g, b }) => {
      const [lr, lg, lb] = [r, g, b].map((value) => {
        const channel = value / 255;
        return channel <= 0.03928
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    };
    let background = getComputedStyle(document.body).backgroundColor;
    for (let node = element.parentElement; node; node = node.parentElement) {
      const color = getComputedStyle(node).backgroundColor;
      if (parse(color).a > 0) {
        background = color;
        break;
      }
    }
    const style = getComputedStyle(element);
    const name = (element.getAttribute("aria-label") || element.textContent)
      .trim()
      .slice(0, 30);
    if (style.outlineStyle === "none" || parseFloat(style.outlineWidth) === 0) {
      return { name, ratio: 0, inNavigation: Boolean(element.closest("nav")) };
    }
    const [high, low] = [
      luminance(parse(style.outlineColor)),
      luminance(parse(background)),
    ].sort((a, b) => b - a);
    return {
      name,
      ratio: (high + 0.05) / (low + 0.05),
      inNavigation: Boolean(element.closest("nav")),
    };
  });

for (const theme of ["light", "dark"]) {
  for (const viewport of viewports) {
    test(`navigation focus rings are visible in the ${theme} theme on the ${viewport.name} viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await prepareProtectedPage(page);
      await page.addInitScript((value) => {
        window.localStorage.setItem("mhw-theme", value);
      }, theme);
      await page.goto("/home");
      await expect(page.locator(".home-budget")).toBeVisible();
      if (viewport === viewports[0]) {
        await page.getByRole("button", { name: "Ouvrir le menu" }).click();
      }
      const reached = new Map();
      for (let index = 0; index < 30; index += 1) {
        await page.keyboard.press("Tab");
        const ring = await focusRingContrast(page);
        if (ring.inNavigation) reached.set(ring.name, ring.ratio);
      }
      expect([...reached.keys()]).toEqual(
        expect.arrayContaining([
          "Home",
          "Calendrier",
          "Objectifs-Évènements",
          "Liste Opérations",
          "Catégories",
          "Analyses",
        ])
      );
      const weak = [...reached].filter(([, ratio]) => ratio < 3);
      expect(weak).toEqual([]);
    });
  }
}

for (const viewport of viewports) {
  test(`profile and logout are keyboard reachable on the ${viewport.name} viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await prepareProtectedPage(page);
    await page.goto("/home");
    await expect(page.locator(".home-budget")).toBeVisible();
    if (viewport === viewports[0]) {
      await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    }
    const tabTo = async (name) => {
      for (let index = 0; index < 40; index += 1) {
        await page.keyboard.press("Tab");
        const ring = await focusRingContrast(page);
        if (ring.name === name) return ring;
      }
      throw new Error(`${name} non atteint au clavier`);
    };

    const toggle = await tabTo("Afficher le profil");
    expect(toggle.ratio).toBeGreaterThanOrEqual(3);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: "Masquer le profil" })
    ).toHaveAttribute("aria-expanded", "true");

    const logout = await tabTo("Se déconnecter");
    expect(logout.ratio).toBeGreaterThanOrEqual(3);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/login/);
  });
}

for (const theme of ["light", "dark"]) {
  for (const viewport of viewports) {
    test(`focus rings on the shell are visible in the ${theme} theme on the ${viewport.name} viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await prepareProtectedPage(page);
      await page.addInitScript((value) => {
        window.localStorage.setItem("mhw-theme", value);
      }, theme);
      const failures = {};
      for (const protectedPage of protectedPages) {
        await page.goto(protectedPage.path);
        await expect(page.locator(protectedPage.selector)).toBeVisible();
        const { failures: pageFailures, checked } = await weakFocusOnShell(
          page
        );
        if (pageFailures.length) failures[protectedPage.path] = pageFailures;
        expect(checked, protectedPage.path).toEqual(
          expect.arrayContaining(SHELL_CONTROLS[protectedPage.path])
        );
      }
      await page.goto("/calendrier");
      await page.getByRole("button", { name: "Mois suivant" }).click();
      const { failures: calendarFailures, checked: calendarChecked } =
        await weakFocusOnShell(page);
      expect(calendarChecked).toEqual(expect.arrayContaining(["Aujourd’hui"]));
      if (calendarFailures.length) {
        failures["/calendrier (mois suivant)"] = calendarFailures;
      }
      expect(failures).toEqual({});
    });
  }
}

for (const theme of ["light", "dark"]) {
  for (const viewport of viewports) {
    test(`text on the shell is readable in the ${theme} theme on the ${viewport.name} viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await prepareProtectedPage(page);
      await page.addInitScript((value) => {
        window.localStorage.setItem("mhw-theme", value);
      }, theme);
      const failures = {};
      const check = async (name) => {
        await page.waitForTimeout(300);
        const pageFailures = await lowContrastOnShell(page);
        if (pageFailures.length) failures[name] = pageFailures;
      };
      for (const protectedPage of protectedPages) {
        await page.goto(protectedPage.path);
        await expect(page.locator(protectedPage.selector)).toBeVisible();
        await check(protectedPage.path);
      }
      // Hors du mois courant, le calendrier affiche aussi « Aujourd'hui ».
      await page.goto("/calendrier");
      await page.getByRole("button", { name: "Mois suivant" }).click();
      await expect(page.getByRole("button", { name: /Aujourd/ })).toBeVisible();
      await check("/calendrier (mois suivant)");
      expect(failures).toEqual({});
    });
  }
}

for (const theme of ["light", "dark"]) {
  test(`budget breakdown labels use the text tokens in the ${theme} theme`, async ({
    page,
  }) => {
    await page.setViewportSize(viewports[0]);
    await prepareProtectedPage(page);
    await page.addInitScript((value) => {
      window.localStorage.setItem("mhw-theme", value);
    }, theme);

    for (const path of ["/home", "/calendrier"]) {
      await page.goto(path);
      const breakdown = page.locator(".budget-breakdown").first();
      await expect(breakdown).toBeVisible();
      const colors = await breakdown.evaluate((element) => {
        const probe = (name) => {
          const span = document.createElement("span");
          span.style.color = `var(${name})`;
          element.appendChild(span);
          const color = getComputedStyle(span).color;
          span.remove();
          return color;
        };
        const label = (selector) =>
          getComputedStyle(element.querySelector(selector)).color;
        return {
          primary: probe("--ds-color-text-primary"),
          info: probe("--ds-color-status-info-text"),
          result: label(
            ".budget-breakdown__row:not(.budget-breakdown__row--carry) dt"
          ),
          carry: label(".budget-breakdown__row--carry dt"),
          carryAmount: label(".budget-breakdown__row--carry dd"),
        };
      });
      expect(colors.result, path).toBe(colors.primary);
      expect(colors.carry, path).toBe(colors.info);
      // Montant du report : même contraste que son libellé, signe écrit.
      expect(colors.carryAmount, path).toBe(colors.info);
    }
  });
}

for (const theme of ["light", "dark"]) {
  for (const viewport of viewports) {
    test(`profile theme ${theme} fits the ${viewport.name} viewport`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await prepareProtectedPage(page);
      await page.addInitScript((preference) => {
        window.localStorage.setItem("mhw-theme", preference);
      }, theme);
      await page.goto("/profil");

      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.getByRole("combobox", { name: "Thème" })).toHaveValue(
        theme
      );
      await expect(page.locator(".theme-selector")).toBeVisible();

      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      );
      expect(hasHorizontalOverflow).toBe(false);
    });
  }
}

test("allows vertical scrolling on a compact mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto("/register");

  const scrollMetrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(
    scrollMetrics.clientHeight
  );

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
});

test("loads the next operation page without duplicating rows", async ({
  page,
}) => {
  await page.setViewportSize(viewports[2]);
  await prepareProtectedPage(page);
  await page.goto("/operations");

  await expect(page.getByRole("row", { name: /Courses/ })).toHaveCount(1);
  await page.getByRole("button", { name: "Afficher la suite" }).click();
  await expect(page.getByRole("row", { name: /Prime/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Courses/ })).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Afficher la suite" })
  ).toHaveCount(0);
});

test("keeps the operation actions and local icons at their design sizes", async ({
  page,
}) => {
  await page.setViewportSize(viewports[2]);
  await prepareProtectedPage(page);
  await page.goto("/operations");

  const addButton = page.getByRole("button", {
    name: "Ajouter une opération",
  });
  const editButton = page.getByRole("button", { name: "Modifier Courses" });
  const addIcon = addButton.locator("img");
  const editIcon = editButton.locator("img");

  await expect(addButton).toHaveCSS("min-height", "48px");
  await expect(editButton).toHaveCSS("width", "44px");
  await expect(editButton).toHaveCSS("height", "44px");
  await expect(addIcon).toHaveCSS("width", "16px");
  await expect(addIcon).toHaveCSS("height", "16px");
  await expect(editIcon).toHaveCSS("width", "20px");
  await expect(editIcon).toHaveCSS("height", "20px");
});
