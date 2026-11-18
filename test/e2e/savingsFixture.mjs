import { prepareProtectedPage } from "../visual/fixtures.mjs";
import {
  savingsAccount,
  savingsGoal,
  savingsMovement,
  currentAccount,
  savingsPage,
} from "../fixtures/savings.mjs";

export const prepareSavingsPage = async (page, options = {}) => {
  await prepareProtectedPage(page);
  await page.clock.setFixedTime(new Date("2026-11-08T12:00:00Z"));
  let accounts = options.empty
    ? []
    : [
        { ...savingsAccount },
        {
          ...savingsAccount,
          id: 2,
          name: "Épargne de sécurité",
          balanceMinorUnits: 390000,
          initialBalanceMinorUnits: 390000,
          goalId: null,
        },
      ];
  let goals = [
    { ...savingsGoal },
    {
      ...savingsGoal,
      id: 4,
      title: "Projet maison",
      savedAmount: "0.00",
      savingsAccountId: undefined,
    },
  ];
  let movements = [{ ...savingsMovement }];
  let error = options.error || false;
  let transferError = options.transferError || null;
  let readError = false,
    lostOnce = false;
  const writes = [],
    transfers = new Map();
  const state = {
    writes,
    setError(value) {
      error = value;
    },
    setTransferError(value) {
      transferError = value;
    },
    setReadError(value) {
      readError = value;
    },
  };
  await page.route(/\/v1\/goals(?:\?.*)?$/, (route) =>
    route.fulfill({ json: savingsPage(goals) })
  );
  await page.route(
    /\/v1\/(savings-accounts|accounts\/current)(?:\/[^?]*)?(?:\?.*)?$/,
    async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        method = request.method();
      const path = url.pathname.replace("/v1", "");
      const body = method === "GET" ? null : request.postDataJSON();
      if (method !== "GET") writes.push({ path, body, method });
      const fail = (code) =>
        route.fulfill({ status: 409, json: { error: { details: { code } } } });
      if (method === "GET" && (error || readError))
        return route.fulfill({ status: 503, json: {} });
      if (path === "/accounts/current")
        return route.fulfill({
          json: {
            data: {
              ...currentAccount,
              month: url.searchParams.get("month"),
              currency: url.searchParams.get("currency"),
            },
          },
        });
      if (path === "/accounts/current/movements")
        return route.fulfill({
          json: savingsPage([
            {
              id: 10,
              source: "VIREMENT",
              kind: "VIREMENT",
              title: "Voyage au Japon",
              signedAmountMinorUnits: -25000,
              operationDate: "2026-11-07",
              accountId: 1,
              currency: "EUR",
            },
            {
              id: 10,
              source: "OPERATION",
              kind: "DEPENSE",
              title: "Courses",
              signedAmountMinorUnits: -4250,
              operationDate: "2026-11-06",
              accountId: null,
              currency: "EUR",
            },
          ]),
        });
      if (path === "/savings-accounts") {
        if (method === "POST") {
          const account = {
            id: accounts.length + 1,
            ...body,
            balanceMinorUnits: body.initialBalanceMinorUnits,
            archived: false,
            goalId: null,
          };
          accounts.push(account);
          return route.fulfill({ status: 201, json: { data: account } });
        }
        const next = url.searchParams.get("cursor");
        return route.fulfill({
          json:
            options.paginated && !next
              ? savingsPage(accounts.slice(0, 1), "opaque-next")
              : savingsPage(accounts),
        });
      }
      const [, rawId, suffix] =
        /\/savings-accounts\/(\d+)(?:\/(.*))?/.exec(path) || [];
      const account = accounts.find((a) => a.id === Number(rawId));
      if (!account) return fail("NOT_FOUND");
      if (suffix === "movements")
        return route.fulfill({
          json: savingsPage(
            movements.filter((m) => m.accountId === account.id)
          ),
        });
      if (suffix === "goal") {
        if (options.linkConflict) return fail("OPENING_BALANCE_CONFLICT");
        account.goalId = body.goalId;
        goals = goals.map((goal) =>
          goal.id === body.goalId
            ? {
                ...goal,
                savingsAccountId: account.id,
                savedAmount: (account.balanceMinorUnits / 100).toFixed(2),
              }
            : goal
        );
      } else if (suffix === "transfers") {
        if (transferError && transferError !== "lost")
          return fail(transferError);
        if (!transfers.has(body.idempotencyKey)) {
          const movement = {
            ...savingsMovement,
            ...body,
            id: movements.length + 11,
            accountId: account.id,
            currency: account.currency,
          };
          account.balanceMinorUnits +=
            body.amountMinorUnits * (body.direction === "TO_SAVINGS" ? 1 : -1);
          goals = goals.map((goal) =>
            goal.id === account.goalId
              ? {
                  ...goal,
                  savedAmount: (account.balanceMinorUnits / 100).toFixed(2),
                }
              : goal
          );
          movements = [movement, ...movements];
          transfers.set(body.idempotencyKey, movement);
        }
        if (transferError === "lost" && !lostOnce) {
          lostOnce = true;
          return route.abort("connectionreset");
        }
        return route.fulfill({
          status: 201,
          json: { data: transfers.get(body.idempotencyKey) },
        });
      } else if (method === "PATCH") Object.assign(account, body);
      return route.fulfill({ json: { data: account } });
    }
  );
  return state;
};
