import { beforeEach, expect, it, vi } from "vitest";
import { apiPrivate } from "../../src/utils/axiosHelper";
import {
  monthEndErrorCode,
  monthEndErrorMessage,
  monthEndService,
  parseMonthEndDecision,
} from "../../src/js/services/monthEndService";
import { isAcknowledgedWrite } from "../../src/js/utils/acknowledgedWrite";
import {
  decidedDecision,
  deficitDecision,
  pendingDecision,
  reviewDecision,
} from "../fixtures/monthEnd.mjs";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), put: vi.fn() },
}));
beforeEach(() => vi.resetAllMocks());

const apiError = (code, status = 409) => ({
  response: { status, data: { error: { details: { code } } } },
});

it("keeps only the documented decision fields", () => {
  expect(parseMonthEndDecision({ ...pendingDecision(), userId: 7 })).toEqual(
    pendingDecision()
  );
  for (const fixture of [
    decidedDecision(),
    reviewDecision(),
    deficitDecision(),
  ])
    expect(parseMonthEndDecision(fixture)).toEqual(fixture);
});

it("rejects malformed decisions", () => {
  for (const changes of [
    { month: "2026-13" },
    { currency: "eur" },
    { status: "DRAFT" },
    { revision: -1 },
    { savings: [{ accountId: 0, amountMinorUnits: 100 }] },
    { savings: [{ accountId: 1, amountMinorUnits: 0 }] },
    { coverage: "none" },
    { exceptionalIncomeMinorUnits: 1.5 },
    { carryMinorUnits: "50.00" },
    { requiresReview: "false" },
    {
      savings: Array.from({ length: 101 }, (_, i) => ({
        accountId: i + 1,
        amountMinorUnits: 1,
      })),
    },
  ])
    expect(() =>
      parseMonthEndDecision({ ...pendingDecision(), ...changes })
    ).toThrow();
});

it("reads one month with credentials and the currency filter", async () => {
  apiPrivate.get.mockResolvedValue({ data: { data: decidedDecision() } });
  await expect(monthEndService.get("2026-10")).resolves.toEqual(
    decidedDecision()
  );
  expect(apiPrivate.get).toHaveBeenCalledWith(
    "/budget-periods/2026-10/decision",
    { params: { currency: "EUR" }, withCredentials: true }
  );
});

it("replaces the decision with whitelisted fields only", async () => {
  apiPrivate.put.mockResolvedValue({ data: { data: decidedDecision() } });
  await monthEndService.save("2026-10", {
    expectedRevision: 0,
    idempotencyKey: "decision-2026-10-abc123",
    savings: [{ accountId: 1, amountMinorUnits: 10000, name: "x" }],
    coverage: [],
    exceptionalIncomeMinorUnits: 0,
    userId: 9,
  });
  expect(apiPrivate.put).toHaveBeenCalledWith(
    "/budget-periods/2026-10/decision",
    {
      expectedRevision: 0,
      idempotencyKey: "decision-2026-10-abc123",
      savings: [{ accountId: 1, amountMinorUnits: 10000 }],
      coverage: [],
      exceptionalIncomeMinorUnits: 0,
    },
    { params: { currency: "EUR" }, withCredentials: true }
  );
});

it("marks an unreadable write acknowledgement for a display refresh", async () => {
  apiPrivate.put.mockResolvedValue({ data: { data: { status: "?" } } });
  const error = await monthEndService
    .save("2026-10", {
      expectedRevision: 0,
      idempotencyKey: "decision-2026-10-abc123",
      savings: [],
      coverage: [],
      exceptionalIncomeMinorUnits: 0,
    })
    .catch((caught) => caught);
  expect(isAcknowledgedWrite(error)).toBe(true);
});

it("explains every documented error code in French", () => {
  for (const code of [
    "PERIOD_NOT_CLOSED",
    "REVISION_CONFLICT",
    "IDEMPOTENCY_CONFLICT",
    "INSUFFICIENT_SAVINGS",
    "ACCOUNT_ARCHIVED",
    "CURRENCY_MISMATCH",
    "BALANCE_LIMIT",
    "ALLOCATION_EXCEEDS_RESULT",
    "INVALID_ALLOCATION",
    "NOT_FOUND",
  ]) {
    expect(monthEndErrorCode(apiError(code))).toBe(code);
    expect(monthEndErrorMessage(apiError(code))).toMatch(/[a-zé]/);
  }
  expect(monthEndErrorCode(apiError("OTHER"))).toBeNull();
  expect(monthEndErrorMessage({})).toMatch(/connexion/);
});
