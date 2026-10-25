import { forecastFixture } from "./forecastFixture.mjs";
import { savingsCapacityFixture } from "./savingsCapacityFixture.mjs";

// Synthetic, read-only browser fixtures shared by responsive and visual tests.
const storedUser = {
  payload: {
    accessToken:
      "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJleHAiOjQxMDI0NDQ4MDAsInN1YiI6InRlc3QifQ.",
    user: {
      email: "happy@example.test",
      firstname: "Happy",
      lastname: "Wallet",
    },
  },
};

export const prepareProtectedPage = async (
  page,
  { authenticated = true } = {}
) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === "http://127.0.0.1:4173"
      ? route.continue()
      : route.abort("blockedbyclient");
  });
  if (authenticated)
    await page.addInitScript((user) => {
      window.localStorage.setItem(JSON.stringify("user"), JSON.stringify(user));
    }, storedUser);
  await page.route(/\/v1\/event-occurrence-resolutions(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        data: [],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    })
  );
  await page.route("**/v1/operations-fixes/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        data: [
          {
            devise: "EUR",
            idOperationFixe: 1,
            montant: 100,
            titre: "Test",
          },
        ],
        message: "Test data",
        success: true,
      },
    })
  );
  await page.route(/\/v1\/operation-categories(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        data: [
          {
            id: 4,
            name: "Alimentation",
            color: "#55AA22",
            icon: "solid:utensils",
          },
        ],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    })
  );
  await page.route(/\/v1\/operations(?:\?.*)?$/, (route) => {
    const isNextPage = new URL(route.request().url()).searchParams.has(
      "cursor"
    );
    return route.fulfill({
      contentType: "application/json",
      json: {
        data: isNextPage
          ? [
              {
                id: 1,
                title: "Courses",
                amount: "42.50",
                currency: "EUR",
                type: "DEPENSE",
                operationDate: "2026-08-18",
                categoryId: 4,
              },
              {
                id: 2,
                title: "Prime",
                amount: "125.00",
                currency: "EUR",
                type: "ENTREE",
                operationDate: "2026-08-17",
                categoryId: 4,
              },
            ]
          : [
              {
                id: 1,
                title: "Courses",
                amount: "42.50",
                currency: "EUR",
                type: "DEPENSE",
                operationDate: "2026-08-18",
                categoryId: 4,
              },
            ],
        meta: isNextPage
          ? { limit: 20, hasNext: false, nextCursor: null }
          : { limit: 20, hasNext: true, nextCursor: "v1.opaque" },
      },
    });
  });
  await page.route(/\/v1\/events(?:\?.*)?$/, (route) => {
    if (
      new URL(route.request().url()).searchParams.get("status") === "POTENTIEL"
    )
      return route.fulfill({
        json: {
          data: [],
          meta: { limit: 100, hasNext: false, nextCursor: null },
        },
      });
    return route.fulfill({
      contentType: "application/json",
      json: {
        data: [
          {
            id: 8,
            title: "Assurance",
            amount: "120.00",
            currency: "EUR",
            kind: "DEPENSE",
            startDate: "2026-09-20",
            recurrence: "MENSUELLE",
            endDate: null,
          },
        ],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    });
  });
  await page.route(/\/v1\/event-occurrences(?:\?.*)?$/, (route) => {
    const month = new URL(route.request().url()).searchParams.get("month");
    return route.fulfill({
      contentType: "application/json",
      json: {
        data: [
          {
            id: 8,
            title: "Assurance",
            amount: "120.00",
            currency: "EUR",
            kind: "DEPENSE",
            startDate: "2026-09-20",
            recurrence: "MENSUELLE",
            endDate: null,
            occurrenceDate: `${month}-20`,
          },
        ],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    });
  });
  await page.route(/\/v1\/budget-periods\/(\d{4}-\d{2})\/summary/, (route) => {
    const month = route
      .request()
      .url()
      .match(/(\d{4}-\d{2})\/summary/)[1];
    const previous = new Date(`${month}-01T00:00:00.000Z`);
    previous.setUTCMonth(previous.getUTCMonth() - 1);
    return route.fulfill({
      contentType: "application/json",
      json: {
        data: {
          month,
          currency: "EUR",
          status: "OPEN",
          revision: 1,
          correctedAt: null,
          balanceStatus: "POSITIVE",
          fixedIncome: "2000.00",
          fixedExpense: "800.00",
          base: "1200.00",
          carryIn: "-120.00",
          carryFromMonth: previous.toISOString().slice(0, 7),
          actualIncome: "0.00",
          actualExpense: "42.50",
          monthResult: "1157.50",
          realRemaining: "1037.50",
          remainingDays: 12,
          realDailyAllowance: "86.46",
          unresolvedEvents: 1,
          forecast: {
            plannedIncome: "0.00",
            plannedExpense: "120.00",
            goalSavings: "150.00",
            forecastRemaining: "767.50",
            prudentDailyAllowance: "63.96",
            unresolvedCount: 1,
            overdueCount: 0,
          },
          days: [
            {
              date: `${month}-18`,
              income: "0.00",
              expense: "42.50",
              realRemaining: "1037.50",
              plannedIncome: "0.00",
              plannedExpense: "0.00",
              plannedCount: 0,
              forecastRemaining: "887.50",
            },
            {
              date: `${month}-20`,
              income: "0.00",
              expense: "0.00",
              realRemaining: "1037.50",
              plannedIncome: "0.00",
              plannedExpense: "120.00",
              plannedCount: 1,
              forecastRemaining: "767.50",
            },
          ],
        },
      },
    });
  });
  await page.route(/\/v1\/budget-forecast(?:\?.*)?$/, (route) => {
    const forecast = forecastFixture(route.request().url());
    // Adjust the one-month fixture after goal edits, using the same capacity snapshot.
    if (forecast.months.length === 1) {
      const capacity = savingsCapacityFixture(route.request().url(), goals);
      const month = forecast.months[0];
      const value = Number(capacity.months[0].afterPlanned);
      Object.assign(month, {
        forecastRemaining: value.toFixed(2),
        prudentMonthlyAllowance: value.toFixed(2),
        prudentDailyAllowance: (value / month.remainingDays).toFixed(2),
        prudentWeeklyAllowance: (
          (value * Math.min(7, month.remainingDays)) /
          month.remainingDays
        ).toFixed(2),
      });
    }
    return route.fulfill({ json: { data: forecast } });
  });
  const goals = [
    {
      id: 1,
      title: "Vélo",
      targetAmount: "1200.00",
      savedAmount: "300.00",
      monthlyContribution: "150.00",
      currency: "EUR",
      targetDate: null,
      forecast: {
        referenceMonth: "2026-10",
        status: "NO_DEADLINE",
        remainingAmount: "900.00",
        contributionsNeeded: 6,
        estimatedReachMonth: "2027-04",
        requiredMonthlyContribution: null,
      },
    },
  ];
  await page.route(/\/v1\/savings-capacity(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: { data: savingsCapacityFixture(route.request().url(), goals) },
    })
  );
  await page.route(/\/v1\/goals(?:\/\d+)?(?:\?.*)?$/, (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      const id = Number(new URL(request.url()).pathname.split("/").pop());
      const index = goals.findIndex((goal) => goal.id === id);
      goals[index] = { ...goals[index], ...request.postDataJSON() };
      return route.fulfill({ json: { data: goals[index] } });
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      const created = {
        ...goals[0],
        ...body,
        id: goals.length + 1,
        forecast: { ...goals[0].forecast, status: "NO_DEADLINE" },
      };
      goals.push(created);
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        json: { data: created },
      });
    }
    return route.fulfill({
      contentType: "application/json",
      json: {
        data: goals,
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    });
  });
  await page.route(/\/v1\/analytics\/operations/, (route) => {
    const params = new URL(route.request().url()).searchParams;
    const totals = (key, expense, extra = {}) => ({
      key,
      label: null,
      color: null,
      income: "0.00",
      expense,
      net: `-${expense}`,
      count: 1,
      ...extra,
    });
    const categories = [
      totals("4", "42.50", { label: "Alimentation", color: "#55AA22" }),
      totals("7", "18.00", { label: "Loisirs" }),
    ];
    const buckets =
      params.get("groupBy") === "category"
        ? categories
        : ["2026-08", "2026-09", "2026-10"].map((month, index) => ({
            ...totals(month, (60.5 + index * 10).toFixed(2)),
            ...(params.get("splitBy") === "category"
              ? { series: categories }
              : {}),
          }));
    return route.fulfill({
      contentType: "application/json",
      json: {
        data: {
          currency: "EUR",
          from: params.get("from"),
          to: params.get("to"),
          groupBy: params.get("groupBy"),
          splitBy: params.get("splitBy"),
          kind: params.get("kind"),
          buckets,
        },
      },
    });
  });
  await page.route(/\/v1\/event-occurrences\/pending/, (route) => {
    const through = new URL(route.request().url()).searchParams.get("through");
    return route.fulfill({
      contentType: "application/json",
      json: {
        data: [
          {
            eventId: 8,
            occurrenceDate: `${through.slice(0, 7)}-20`,
            title: "Assurance",
            amount: "120.00",
            currency: "EUR",
            kind: "DEPENSE",
            overdue: false,
          },
        ],
        meta: { limit: 100, hasNext: false, nextCursor: null },
      },
    });
  });
};
