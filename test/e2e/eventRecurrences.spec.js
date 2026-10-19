import { expect, test } from "@playwright/test";
import { prepareProtectedPage } from "../visual/fixtures.mjs";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const prepareEvents = async (page) => {
  await page.clock.setFixedTime(new Date("2026-10-19T10:00:00Z"));
  await prepareProtectedPage(page);
  const events = [
    {
      id: 71,
      title: "Sport hebdomadaire",
      amount: "10.00",
      currency: "EUR",
      kind: "DEPENSE",
      startDate: "2026-10-02",
      recurrence: "HEBDOMADAIRE",
      endDate: "2026-10-31",
    },
    {
      id: 72,
      title: "Assurance trimestrielle",
      amount: "50.00",
      currency: "EUR",
      kind: "DEPENSE",
      startDate: "2026-07-31",
      recurrence: "TRIMESTRIELLE",
      endDate: null,
    },
    {
      id: 73,
      title: "Abonnement annuel",
      amount: "120.00",
      currency: "EUR",
      kind: "DEPENSE",
      startDate: "2025-10-31",
      recurrence: "ANNUELLE",
      endDate: "2028-10-31",
    },
  ];
  const occurrences = ["02", "09", "16", "23", "30"].map((day) => ({
    ...events[0],
    occurrenceDate: `2026-10-${day}`,
  }));
  occurrences.push(
    ...events
      .slice(1)
      .map((event) => ({ ...event, occurrenceDate: "2026-10-31" }))
  );
  const writes = [];
  const meta = { limit: 100, hasNext: false, nextCursor: null };
  await page.route(/\/v1\/events(?:\/\d+)?(?:\?.*)?$/, (route) => {
    const request = route.request();
    if (request.method() === "GET")
      return route.fulfill({ json: { data: events, meta } });
    const body = request.postDataJSON();
    writes.push(body);
    const id =
      request.method() === "POST"
        ? 74
        : Number(new URL(request.url()).pathname.split("/").at(-1));
    const event = { ...body, id };
    const index = events.findIndex((item) => item.id === id);
    if (index < 0) events.push(event);
    else events[index] = event;
    return route.fulfill({
      status: request.method() === "POST" ? 201 : 200,
      json: { data: event },
    });
  });
  await page.route(/\/v1\/event-occurrences(?:\?.*)?$/, (route) =>
    route.fulfill({ json: { data: occurrences, meta } })
  );
  await page.route(/\/v1\/event-occurrences\/pending(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        data: occurrences.map((event) => ({
          eventId: event.id,
          title: event.title,
          amount: event.amount,
          currency: event.currency,
          kind: event.kind,
          occurrenceDate: event.occurrenceDate,
          overdue: false,
        })),
        meta,
      },
    })
  );
  return writes;
};

for (const viewport of viewports) {
  test(`event recurrences are editable and calendar occurrences stay distinct on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const writes = await prepareEvents(page);
    await page.goto("/objectifs-evenements");
    await expect(
      page.getByText("Chaque semaine jusqu’au 31/10/2026")
    ).toBeVisible();
    await expect(
      page.getByText("Chaque trimestre", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Chaque année jusqu’au 31/10/2028")
    ).toBeVisible();
    const edit = page.getByRole("button", {
      name: "Modifier Abonnement annuel",
    });
    await edit.click();
    await page.getByLabel("Titre", { exact: true }).press("Escape");
    await expect(edit).toBeFocused();
    await edit.click();
    await expect(page.getByLabel("Titre", { exact: true })).toBeFocused();
    await expect(
      page.getByRole("combobox", { name: "Récurrence" })
    ).toHaveValue("ANNUELLE");
    await page
      .getByRole("combobox", { name: "Récurrence" })
      .selectOption("TRIMESTRIELLE");
    await expect(page.getByLabel(/Date de fin/)).toHaveValue("2028-10-31");
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({
      recurrence: "TRIMESTRIELLE",
      startDate: "2025-10-31",
      endDate: "2028-10-31",
      amount: "120.00",
    });
    expect(writes[0]).not.toHaveProperty("ownerId");
    expect(writes[0]).not.toHaveProperty("id");
    await expect(
      page.getByRole("button", { name: "Fermer le formulaire" })
    ).toHaveCount(0);
    await page.goto("/calendrier");
    await expect(
      page.getByRole("button", { name: /Convertir Sport hebdomadaire/ })
    ).toHaveCount(5);
    await expect(
      page.getByRole("button", { name: /Convertir Assurance trimestrielle/ })
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: /Convertir Abonnement annuel/ })
    ).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: /31 octobre 2026, 2 événements prévus/ })
    ).toBeVisible();
    await page.getByRole("button", { name: /^23 octobre 2026/ }).click();
    const add = page.getByRole("button", {
      name: "Ajouter un événement prévu",
    });
    await add.click();
    await expect(page.getByLabel("Date de début")).toHaveValue("2026-10-23");
    await page
      .getByLabel("Titre", { exact: true })
      .fill("Sortie chaque semaine");
    await page.getByLabel(/^Montant/).fill("15.00");
    const recurrence = page.getByRole("combobox", { name: "Récurrence" });
    await recurrence.focus();
    await recurrence.press("Home");
    await recurrence.press("ArrowDown");
    await expect(recurrence).toHaveValue("HEBDOMADAIRE");
    await page.getByLabel(/Date de fin/).fill("2026-10-31");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      )
    ).toBe(false);
    await page.screenshot({
      path: `test-results/192-recurrences-${viewport.name}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Enregistrer", exact: true })
      .click();
    await expect.poll(() => writes.length).toBe(2);
    expect(writes[1]).toEqual({
      title: "Sortie chaque semaine",
      amount: "15.00",
      currency: "EUR",
      kind: "DEPENSE",
      startDate: "2026-10-23",
      recurrence: "HEBDOMADAIRE",
      endDate: "2026-10-31",
    });
    await expect(add).toBeFocused();
    await add.click();
    await page.getByLabel("Titre", { exact: true }).press("Escape");
    await expect(add).toBeFocused();
  });
}
