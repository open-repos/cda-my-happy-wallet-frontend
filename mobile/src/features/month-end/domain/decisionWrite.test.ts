import { describe, expect, it, vi } from "vitest";

import {
  createDecisionKey,
  describeDecisionFailure,
  loadAllPages,
  loadAllSavingsAccounts,
  nextDecisionAttempt,
  settleDecisionAttempt,
} from "@/src/features/month-end/domain/decisionWrite";

const plan = {
  savings: [{ accountId: 12, amountMinorUnits: 10000 }],
  coverage: [],
  exceptionalIncomeMinorUnits: 0,
};
const request = {
  month: "2026-10",
  currency: "EUR",
  expectedRevision: 0,
  plan,
};

describe("decision attempts (#420)", () => {
  it("creates an ASCII key outside the manual prefixes", () => {
    const key = createDecisionKey("2026-10");
    expect(key).toMatch(/^decision-2026-10-[a-z0-9]+-[A-Za-z0-9]{20}$/);
    expect(key.length).toBeLessThanOrEqual(100);
    expect(createDecisionKey("2026-10")).not.toBe(key);
  });

  it("keeps the key of an uncertain attempt while the split is identical", () => {
    const createKey = vi
      .fn()
      .mockReturnValueOnce("k1")
      .mockReturnValueOnce("k2");
    const first = nextDecisionAttempt(null, request, createKey);
    expect(first.key).toBe("k1");
    const kept = settleDecisionAttempt(first, { status: "uncertain" });
    expect(nextDecisionAttempt(kept, request, createKey).key).toBe("k1");
    // Une autre répartition est une autre tentative.
    const changed = nextDecisionAttempt(
      kept,
      { ...request, plan: { ...plan, savings: [] } },
      createKey,
    );
    expect(changed.key).toBe("k2");
    expect(createKey).toHaveBeenCalledTimes(2);
  });

  it("releases the key once saved or refused with a known code", () => {
    const attempt = nextDecisionAttempt(null, request, () => "k1");
    expect(
      settleDecisionAttempt(attempt, { status: "saved", refreshed: true }),
    ).toBeNull();
    expect(
      settleDecisionAttempt(attempt, {
        status: "refused",
        code: "REVISION_CONFLICT",
      }),
    ).toBeNull();
    // Refus sans code pendant une reprise : il ne dit rien du premier envoi.
    expect(
      settleDecisionAttempt(attempt, { status: "refused", code: null }, true),
    ).toBe(attempt);
    expect(
      settleDecisionAttempt(attempt, { status: "refused", code: null }),
    ).toBeNull();
  });

  it("explains a refused or uncertain decision", () => {
    expect(
      describeDecisionFailure({
        status: "refused",
        code: "INSUFFICIENT_SAVINGS",
      }),
    ).toBe(
      "Un compte d’épargne ne contient pas assez d’argent pour ce prélèvement ou cette correction.",
    );
    expect(describeDecisionFailure({ status: "refused", code: null })).toBe(
      "La décision n’a pas été enregistrée. Vérifiez les montants puis réessayez.",
    );
    expect(describeDecisionFailure({ status: "uncertain" })).toBe(
      "Le résultat de l’enregistrement est incertain. Vos montants sont conservés : vérifiez la décision, puis reprenez la même tentative, sans doublon.",
    );
  });
});

describe("loadAllPages", () => {
  it("removes rows already seen with their own identity", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ accountId: 1, month: "2026-11" }],
        meta: { limit: 20, hasNext: true, nextCursor: "c1" },
      })
      .mockResolvedValueOnce({
        data: [
          { accountId: 1, month: "2026-11" },
          { accountId: 2, month: "2026-11" },
        ],
        meta: { limit: 20, hasNext: false, nextCursor: null },
      });
    expect(
      await loadAllPages<{ accountId: number; month: string }>(
        load,
        (row) => `${row.accountId}:${row.month}`,
      ),
    ).toEqual([
      { accountId: 1, month: "2026-11" },
      { accountId: 2, month: "2026-11" },
    ]);
  });
});

describe("loadAllSavingsAccounts", () => {
  const page = (ids: number[], nextCursor: string | null) => ({
    data: ids.map((id) => ({ id })),
    meta: { limit: 20, hasNext: nextCursor !== null, nextCursor },
  });

  it("follows the cursor and removes duplicated rows", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(page([1, 2], "c1"))
      .mockResolvedValueOnce(page([2, 3], null));
    expect(await loadAllSavingsAccounts(load)).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
    expect(load).toHaveBeenNthCalledWith(1, null);
    expect(load).toHaveBeenNthCalledWith(2, "c1");
  });

  it("refuses a repeated cursor and stops after ten pages", async () => {
    const repeated = vi
      .fn()
      .mockResolvedValueOnce(page([1], "c1"))
      .mockResolvedValueOnce(page([2], "c1"));
    await expect(loadAllSavingsAccounts(repeated)).rejects.toThrow();
    let index = 0;
    const endless = vi.fn(async () => page([++index], `c${index}`));
    await expect(loadAllSavingsAccounts(endless)).rejects.toThrow();
    expect(endless).toHaveBeenCalledTimes(10);
  });
});
