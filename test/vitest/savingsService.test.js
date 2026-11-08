import { beforeEach, expect, it, vi } from "vitest";
import {
  savingsService,
  parseSavingsAccount,
  parseSavingsPage,
  parseSavingsMovement,
  parseCurrentMovement,
} from "../../src/js/services/savingsService";
import { apiPrivate } from "../../src/utils/axiosHelper";
import {
  savingsAccount,
  savingsMovement,
  savingsPage,
} from "../fixtures/savings.mjs";
import { parseGoal } from "../../src/js/services/goalsService";
import { savingsGoal } from "../fixtures/savings.mjs";
vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));
beforeEach(() => vi.resetAllMocks());
it("preserves a linked goal and rejects an invalid link", () => {
  expect(parseGoal(savingsGoal).savingsAccountId).toBe(1);
  expect(() => parseGoal({ ...savingsGoal, savingsAccountId: 0 })).toThrow();
});
it("validates integer cents, state, dates and cursor consistency", () => {
  expect(parseSavingsAccount({ ...savingsAccount, userId: 42 })).toEqual(
    savingsAccount
  );
  for (const changes of [
    { balanceMinorUnits: 0.5 },
    { balanceMinorUnits: -1 },
    { archived: "false" },
    { goalId: 0 },
  ])
    expect(() =>
      parseSavingsAccount({ ...savingsAccount, ...changes })
    ).toThrow();
  expect(() =>
    parseSavingsMovement({ ...savingsMovement, operationDate: "2026-02-30" })
  ).toThrow();
  expect(() =>
    parseSavingsPage(
      { data: [], meta: { limit: 101, hasNext: false, nextCursor: null } },
      parseSavingsAccount
    )
  ).toThrow();
  expect(() =>
    parseSavingsPage(
      { data: [], meta: { limit: 20, hasNext: true, nextCursor: null } },
      parseSavingsAccount
    )
  ).toThrow();
  expect(() => parseCurrentMovement({ id: 1, source: "OTHER" })).toThrow();
});
it("sends opaque cursors, credentials and only whitelisted write fields", async () => {
  apiPrivate.get.mockResolvedValue({ data: savingsPage([savingsAccount]) });
  await savingsService.accounts({}, "opaque/next==");
  expect(apiPrivate.get).toHaveBeenCalledWith("/savings-accounts", {
    params: { limit: 20, cursor: "opaque/next==" },
    withCredentials: true,
  });
  apiPrivate.post.mockResolvedValue({ data: { data: savingsAccount } });
  await savingsService.create({
    name: "Voyage",
    currency: "EUR",
    initialBalanceMinorUnits: 101,
    userId: 2,
    balanceMinorUnits: 999,
  });
  expect(apiPrivate.post).toHaveBeenLastCalledWith(
    "/savings-accounts",
    { name: "Voyage", currency: "EUR", initialBalanceMinorUnits: 101 },
    { withCredentials: true }
  );
  apiPrivate.post.mockResolvedValue({ data: { data: savingsMovement } });
  await savingsService.transfer(1, {
    ...savingsMovement,
    amountMinorUnits: 123,
    userId: 2,
  });
  expect(apiPrivate.post).toHaveBeenLastCalledWith(
    "/savings-accounts/1/transfers",
    {
      direction: "TO_SAVINGS",
      amountMinorUnits: 123,
      operationDate: "2026-11-07",
      reason: "MANUAL",
      idempotencyKey: "fixture-transfer-10",
    },
    { withCredentials: true }
  );
  apiPrivate.patch.mockResolvedValue({ data: { data: savingsAccount } });
  await savingsService.rename(1, "Nouveau nom");
  await savingsService.archive(1);
  expect(apiPrivate.patch).toHaveBeenLastCalledWith(
    "/savings-accounts/1",
    { archived: true },
    { withCredentials: true }
  );
  apiPrivate.put.mockResolvedValue({ data: { data: savingsAccount } });
  await savingsService.linkGoal(1, 3);
  expect(apiPrivate.put).toHaveBeenCalledWith(
    "/savings-accounts/1/goal",
    { goalId: 3 },
    { withCredentials: true }
  );
});
it("classifies an unreadable 2xx as committed rather than a failed transfer", async () => {
  apiPrivate.post.mockResolvedValue({ data: {} });
  await expect(
    savingsService.transfer(1, savingsMovement)
  ).rejects.toMatchObject({ name: "AcknowledgedWriteError" });
});
