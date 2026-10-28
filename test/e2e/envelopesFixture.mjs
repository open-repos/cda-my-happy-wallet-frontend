import { prepareProtectedPage } from "../visual/fixtures.mjs";
import {
  envelopeCategory,
  envelopeCategoryAnalysis,
  envelopeOverview,
  envelopeOccurrence,
  envelopePayments,
  envelopeMeta,
  envelopeIntegration,
} from "../fixtures/envelopes.mjs";
export const prepareEnvelopePage = async (page) => {
  await prepareProtectedPage(page);
  await page.clock.setFixedTime(new Date("2026-10-28T12:00:00Z"));
  let actual = "223.00",
    links = new Map([
      [1, 41],
      [2, 41],
      [3, 41],
    ]),
    operations = envelopePayments(),
    fixedWrites = [];
  const writes = [],
    reads = [];
  let conflict = false,
    closed = false;
  await page.route(
    /\/v1\/(envelope-overview|envelope-analytics)(?:\?.*)?$/,
    (route) => {
      const url = new URL(route.request().url());
      reads.push(url.pathname + url.search);
      return route.fulfill({
        json: {
          data:
            url.searchParams.get("currency") === "USD"
              ? []
              : url.pathname.endsWith("envelope-analytics")
              ? [envelopeCategoryAnalysis]
              : [envelopeOverview({ actual })],
          meta: envelopeMeta,
          historyPolicy: "OBSERVED_ONLY",
        },
      });
    }
  );
  await page.route(
    /\/v1\/reconciliation\/months\/[^/]+\/occurrences(?:\?.*)?$/,
    (route) => {
      const month = new URL(route.request().url()).pathname.match(
        /months\/([^/]+)/
      )[1];
      return route.fulfill({
        json: {
          data: [
            envelopeOccurrence({ actual, month, closed }),
            {
              ...envelopeOccurrence({ month, id: 42, sourceId: 8 }),
              title: "Alimentation famille",
            },
          ],
          meta: envelopeMeta,
          integration: envelopeIntegration,
        },
      });
    }
  );
  await page.route(
    /\/v1\/reconciliation\/occurrences\/\d+(?:\/operations)?(?:\?.*)?$/,
    (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.endsWith("operations"))
        return route.fulfill({
          json: {
            data: envelopeOccurrence({ actual, closed }),
            integration: envelopeIntegration,
          },
        });
      const candidate = {
        id: 7,
        title: "Épicerie du quartier",
        amount: "110.00",
        currency: "EUR",
        type: "DEPENSE",
        operationDate: "2026-10-24",
        categoryId: 4,
        occurrenceId: null,
      };
      return route.fulfill({
        json: {
          data:
            url.searchParams.get("unassociated") === "true"
              ? [candidate]
              : operations.map((o) => ({ ...o, occurrenceId: 41 })),
          meta: envelopeMeta,
        },
      });
    }
  );
  await page.route(/\/v1\/operations\/\d+\/reconciliation$/, (route) => {
    const id = Number(
      new URL(route.request().url()).pathname.match(/operations\/(\d+)/)[1]
    );
    if (route.request().method() === "GET")
      return route.fulfill({
        json: {
          data: { operationId: id, occurrenceId: links.get(id) ?? null },
          integration: envelopeIntegration,
        },
      });
    const body = route.request().postDataJSON();
    writes.push({ path: `/operations/${id}/reconciliation`, body });
    if (conflict)
      return route.fulfill({
        status: 409,
        json: { error: { details: { code: "ASSOCIATION_CONFLICT" } } },
      });
    links.set(id, body.occurrenceId);
    if (body.occurrenceId === null)
      operations = operations.filter((o) => o.id !== id);
    else if (id === 7) {
      actual = "333.00";
      operations.push({
        id: 7,
        title: "Épicerie du quartier",
        amount: "110.00",
        currency: "EUR",
        type: "DEPENSE",
        operationDate: "2026-10-24",
        categoryId: 4,
      });
    }
    return route.fulfill({ status: 204 });
  });
  await page.route(/\/v1\/operations(?:\/\d+)?(?:\?.*)?$/, (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { data: operations, meta: envelopeMeta } });
    const body = route.request().postDataJSON();
    writes.push({ path: new URL(route.request().url()).pathname, body });
    const row = {
      id: 10,
      title: body.title,
      amount: Number(body.amount).toFixed(2),
      currency: body.currency,
      type: body.kind,
      operationDate: body.operationDate,
      categoryId: body.categoryId,
    };
    operations.push(row);
    links.set(10, body.reconciliation?.occurrenceId ?? null);
    if (body.reconciliation?.occurrenceId) actual = "333.00";
    return route.fulfill({ status: 201, json: { data: row } });
  });
  await page.route(/\/v1\/operation-categories(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: { data: [envelopeCategory], meta: { ...envelopeMeta, limit: 100 } },
    })
  );
  await page.route(
    /\/v1\/operations-fixes\/(charges|revenus)(?:\/\d+)?(?:\?.*)?$/,
    (route) => {
      const income = route.request().url().includes("/revenus");
      if (route.request().method() !== "GET") {
        fixedWrites.push(route.request().postDataJSON());
        return route.fulfill({ json: { success: true } });
      }
      return route.fulfill({
        json: {
          data: income
            ? [
                {
                  idOperationFixe: 9,
                  titre: "Salaire",
                  montant: "2000.00",
                  devise: "EUR",
                  categoryId: null,
                },
              ]
            : [
                {
                  idOperationFixe: 7,
                  titre: "Alimentation",
                  montant: "300.00",
                  devise: "EUR",
                  periodicite: "MENSUELLE",
                  pourcentagePersonnel: 100,
                  montantPersonnel: "300.00",
                  montantMensuelPersonnel: "300.00",
                  categoryId: 4,
                  category: envelopeCategory,
                  isBudgetEnvelope: true,
                },
              ],
          meta: envelopeMeta,
        },
      });
    }
  );
  await page.route(/\/v1\/operations-fixes\/months\/[^/]+(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: 7,
            idOperationFixe: 7,
            titre: "Alimentation",
            montant: "350.00",
            montantMensuelPersonnel: "350.00",
            devise: "EUR",
            typeOperation: "CHARGE",
            isBudgetEnvelope: true,
          },
        ],
        meta: envelopeMeta,
      },
    })
  );
  return {
    writes,
    reads,
    fixedWrites,
    setActual: (value) => (actual = value),
    setClosed: (value) => (closed = value),
    setConflict: (value) => (conflict = value),
  };
};
