import { prepareProtectedPage } from "../visual/fixtures.mjs";
import { forecastFixture } from "../visual/forecastFixture.mjs";

/** Stateful synthetic API, isolated from the immutable backend integration tests. */
export const prepareSimulationPage = async (
  page,
  { seedPotential = false } = {}
) => {
  await prepareProtectedPage(page);
  let nextId = 10;
  let events = [
    {
      id: 8,
      title: "Assurance",
      amount: "120.00",
      currency: "EUR",
      kind: "DEPENSE",
      startDate: "2026-09-20",
      recurrence: "MENSUELLE",
      endDate: null,
      status: "CONFIRME",
    },
  ];
  if (seedPotential)
    events.push({
      id: 9,
      title: "Voyage",
      amount: "300.00",
      currency: "EUR",
      kind: "DEPENSE",
      startDate: "2026-10-24",
      recurrence: "AUCUNE",
      endDate: null,
      status: "POTENTIEL",
    });
  const actual = [];
  const money = (cents) => (cents / 100).toFixed(2);
  const cents = (value) => Math.round(Number(value) * 100);
  const meta = { limit: 100, hasNext: false, nextCursor: null };
  const all = () => {
    events = events.filter(
      (event) =>
        event.status !== "POTENTIEL" || event.startDate.slice(0, 7) >= "2026-10"
    );
    return events;
  };
  const selected = (url) =>
    all().filter(
      (event) =>
        event.status === "CONFIRME" ||
        new URL(url).searchParams.get("scenario") === "simulation"
    );
  const occurs = (event, month) => {
    if (
      month < event.startDate.slice(0, 7) ||
      (event.endDate && month > event.endDate.slice(0, 7))
    )
      return false;
    const offset =
      (Number(month.slice(0, 4)) - Number(event.startDate.slice(0, 4))) * 12 +
      Number(month.slice(5)) -
      Number(event.startDate.slice(5, 7));
    return event.recurrence === "AUCUNE"
      ? offset === 0
      : event.recurrence === "ANNUELLE"
      ? offset % 12 === 0
      : event.recurrence === "TRIMESTRIELLE"
      ? offset % 3 === 0
      : true;
  };
  const actualDelta = () =>
    actual.reduce(
      (sum, item) =>
        sum +
        (item.type === "DEPENSE" ? cents(item.amount) : -cents(item.amount)),
      0
    );
  const projection = (url) => {
    const result = forecastFixture(url);
    const offset =
      (Number(result.from.slice(0, 4)) - 2026) * 12 +
      Number(result.from.slice(5)) -
      10;
    let cumulative = actualDelta();
    const rules = selected(url).filter((event) => event.id !== 8);
    for (let index = 0; index < offset + result.months.length; index++) {
      const month = new Date(Date.UTC(2026, 9 + index, 1))
        .toISOString()
        .slice(0, 7);
      const matching = rules.filter((event) => occurs(event, month));
      const expense = matching
        .filter((event) => event.kind === "DEPENSE")
        .reduce((sum, event) => sum + cents(event.amount), 0);
      const income = matching
        .filter((event) => event.kind === "ENTREE")
        .reduce((sum, event) => sum + cents(event.amount), 0);
      const previous = cumulative;
      cumulative += expense - income;
      const row = result.months[index - offset];
      if (!row) continue;
      const balance = cents(row.forecastRemaining) - cumulative;
      Object.assign(row, {
        carryIn: money(cents(row.carryIn) - previous),
        plannedExpense: money(cents(row.plannedExpense) + expense),
        plannedIncome: money(cents(row.plannedIncome) + income),
        forecastResult: money(cents(row.forecastResult) - expense + income),
        forecastRemaining: money(balance),
        prudentMonthlyAllowance: money(balance),
        prudentDailyAllowance: money(Math.round(balance / row.remainingDays)),
        prudentWeeklyAllowance: money(
          Math.round(
            (balance * Math.min(7, row.remainingDays)) / row.remainingDays
          )
        ),
      });
    }
    result.currentRealRemaining = money(103750 - actualDelta());
    return result;
  };
  await page.route(
    /\/v1\/events(?:\/\d+(?:\/confirm)?)?(?:\?.*)?$/,
    (route) => {
      const request = route.request(),
        url = new URL(request.url());
      all();
      const id = Number(url.pathname.match(/\/events\/(\d+)/)?.[1]);
      const found = events.find((event) => event.id === id);
      if (url.pathname.endsWith("/confirm")) {
        found.status = "CONFIRME";
        return route.fulfill({ json: { data: found } });
      }
      if (request.method() === "DELETE") {
        events = events.filter((event) => event.id !== id);
        return route.fulfill({ status: 204 });
      }
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        const item = {
          ...body,
          id: nextId++,
          amount: Number(body.amount).toFixed(2),
          status: body.status || "CONFIRME",
        };
        events.push(item);
        return route.fulfill({ status: 201, json: { data: item } });
      }
      if (request.method() === "PUT") {
        Object.assign(found, request.postDataJSON());
        found.amount = Number(found.amount).toFixed(2);
        return route.fulfill({ json: { data: found } });
      }
      const status = url.searchParams.get("status") || "CONFIRME";
      return route.fulfill({
        json: { data: events.filter((event) => event.status === status), meta },
      });
    }
  );
  await page.route(/\/v1\/simulation\/events$/, (route) => {
    events = events.filter((event) => event.status !== "POTENTIEL");
    return route.fulfill({ status: 204 });
  });
  await page.route(/\/v1\/event-occurrences(?:\?.*)?$/, (route) => {
    const url = route.request().url(),
      month = new URL(url).searchParams.get("month");
    return route.fulfill({
      json: {
        data: selected(url)
          .filter((event) => occurs(event, month))
          .map((event) => ({
            ...event,
            occurrenceDate: `${month}-${event.startDate.slice(8, 10)}`,
          })),
        meta,
      },
    });
  });
  await page.route(/\/v1\/event-occurrences\/pending(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: {
        data: all()
          .filter((event) => event.status === "CONFIRME")
          .map((event) => ({
            eventId: event.id,
            occurrenceDate: `2026-10-${event.startDate.slice(8, 10)}`,
            title: event.title,
            amount: event.amount,
            currency: event.currency,
            kind: event.kind,
            overdue: false,
          })),
        meta,
      },
    })
  );
  await page.route(/\/v1\/budget-forecast(?:\?.*)?$/, (route) =>
    route.fulfill({ json: { data: projection(route.request().url()) } })
  );
  await page.route(/\/v1\/savings-capacity(?:\?.*)?$/, (route) => {
    const result = projection(route.request().url()),
      row = result.months[0];
    return route.fulfill({
      json: {
        data: {
          from: result.from,
          currency: result.currency,
          referenceDate: result.referenceDate,
          totalPlannedMonthlyContribution: "150.00",
          totalRequiredMonthlyContribution: null,
          unassessableCount: 1,
          goals: [
            {
              id: 1,
              title: "Vélo",
              targetDate: null,
              plannedMonthlyContribution: "150.00",
              requiredMonthlyContribution: null,
              monthlyContributionGap: null,
              includedInTotals: true,
              status: "NO_DEADLINE",
            },
          ],
          months: [
            {
              month: row.month,
              beforeGoals: money(cents(row.forecastRemaining) + 15000),
              afterPlanned: row.forecastRemaining,
              afterRequired: null,
              sustainability:
                cents(row.forecastRemaining) < 0
                  ? "NON_TENABLE"
                  : "INDETERMINE",
            },
          ],
        },
      },
    });
  });
  await page.route(/\/v1\/budget-periods\/(\d{4}-\d{2})\/summary/, (route) => {
    const url = route.request().url(),
      month = url.match(/(\d{4}-\d{2})\/summary/)[1];
    const query = new URL("http://127.0.0.1:4173/v1/budget-forecast");
    query.searchParams.set("from", month);
    query.searchParams.set("months", "1");
    query.searchParams.set(
      "scenario",
      new URL(url).searchParams.get("scenario") || "standard"
    );
    const row = projection(query.href).months[0],
      real = 103750 - actualDelta();
    const rules = selected(url).filter((event) => occurs(event, month));
    const dates = [
      ...new Set([
        `${month}-18`,
        ...rules.map((event) => `${month}-${event.startDate.slice(8, 10)}`),
      ]),
    ].sort();
    let running = real - 15000;
    const days = dates.map((date) => {
      const current = rules.filter((event) =>
        date.endsWith(event.startDate.slice(8, 10))
      );
      const income = current
        .filter((event) => event.kind === "ENTREE")
        .reduce((s, event) => s + cents(event.amount), 0);
      const expense = current
        .filter((event) => event.kind === "DEPENSE")
        .reduce((s, event) => s + cents(event.amount), 0);
      running += income - expense;
      return {
        date,
        income: "0.00",
        expense: "0.00",
        realRemaining: money(real),
        plannedIncome: money(income),
        plannedExpense: money(expense),
        plannedCount: current.length,
        forecastRemaining: money(running),
      };
    });
    return route.fulfill({
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
          carryFromMonth: "2026-09",
          actualIncome: "0.00",
          actualExpense: money(4250 + actualDelta()),
          monthResult: money(115750 - actualDelta()),
          realRemaining: money(real),
          remainingDays: 14,
          realDailyAllowance: money(Math.round(real / 14)),
          unresolvedEvents: rules.length,
          forecast: {
            plannedIncome: row.plannedIncome,
            plannedExpense: row.plannedExpense,
            goalSavings: "150.00",
            forecastRemaining: row.forecastRemaining,
            prudentDailyAllowance: row.prudentDailyAllowance,
            unresolvedCount: rules.length,
            overdueCount: 0,
          },
          days,
        },
      },
    });
  });
  await page.route(/\/v1\/operations(?:\?.*)?$/, (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON(),
      operation = {
        ...body,
        id: nextId++,
        amount: Number(body.amount).toFixed(2),
        type: body.kind,
      };
    actual.push(operation);
    return route.fulfill({ status: 201, json: { data: operation } });
  });
};
