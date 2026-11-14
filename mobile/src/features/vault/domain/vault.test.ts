import { describe, expect, it } from "vitest";

import {
  currentMovementLabels,
  eligibleGoals,
  formatVaultMoney,
  parseAmountInput,
  parseCurrentAccount,
  parseCurrentMovement,
  parseSavingsAccount,
  parseSavingsMovement,
  savingsMovementLabels,
  shiftMonth,
  signedMovementAmount,
  validateAccountDraft,
  validateTransferDraft,
  vaultErrorMessage,
  vaultToday,
} from "@/src/features/vault/domain/vault";
import {
  currentAccount,
  currentMovement,
  savingsAccount,
  savingsMovement,
} from "@/src/features/vault/testing/vaultFixtures";

const spaces = (value: string) => value.replace(/\s/g, " ");

describe("vault contracts (#419, backend #183)", () => {
  it("keeps the server fields of a savings account", () => {
    expect(parseSavingsAccount({ ...savingsAccount(), owner: 9 })).toEqual(
      savingsAccount(),
    );
  });

  it.each([
    { id: 0 },
    { name: "A" },
    { name: "x".repeat(51) },
    { currency: "eur" },
    { balanceMinorUnits: 12.5 },
    { balanceMinorUnits: -1 },
    { initialBalanceMinorUnits: 10_000_000_000 },
    { archived: "false" },
    { goalId: 0 },
  ])("rejects an invalid savings account %o", (override) => {
    expect(() =>
      parseSavingsAccount({ ...savingsAccount(), ...override }),
    ).toThrow();
  });

  it("reads a transfer and defaults the month-end fields", () => {
    expect(parseSavingsMovement(savingsMovement())).toMatchObject({
      id: 10,
      direction: "TO_SAVINGS",
      amountMinorUnits: 25000,
      monthEndRevision: null,
      isCompensation: false,
    });
    expect(
      parseSavingsMovement({
        ...savingsMovement(),
        reason: "MONTH_END",
        monthEndRevision: 2,
        isCompensation: true,
      }),
    ).toMatchObject({ monthEndRevision: 2, isCompensation: true });
  });

  it.each([
    { amountMinorUnits: 0 },
    { direction: "SIDEWAYS" },
    { type: "DEPENSE" },
    { operationDate: "2026-02-30" },
    { reason: "GIFT" },
  ])("rejects an invalid transfer %o", (override) => {
    expect(() =>
      parseSavingsMovement({ ...savingsMovement(), ...override }),
    ).toThrow();
  });

  it("reads the available budget, which may be negative", () => {
    const account = parseCurrentAccount({
      ...currentAccount(),
      balanceMinorUnits: -1500,
    });
    expect(account.balanceMinorUnits).toBe(-1500);
    expect(account.budget.carryInMinorUnits).toBe(5000);
    expect(() =>
      parseCurrentAccount({ ...currentAccount(), balanceBasis: "BANK" }),
    ).toThrow();
    expect(() =>
      parseCurrentAccount({ ...currentAccount(), month: "2026-13" }),
    ).toThrow();
  });

  it("identifies a current movement by its source and its id", () => {
    const operation = parseCurrentMovement(currentMovement());
    const transfer = parseCurrentMovement({
      ...currentMovement(),
      source: "VIREMENT",
      kind: "VIREMENT",
      accountId: 1,
    });
    expect(operation.id).toBe(transfer.id);
    expect(operation.key).toBe("OPERATION:7");
    expect(transfer.key).toBe("VIREMENT:7");
    expect(() =>
      parseCurrentMovement({
        ...currentMovement(),
        source: "EXCEPTIONAL_INCOME",
        kind: "DEPENSE",
      }),
    ).toThrow();
  });
});

describe("vault amounts and dates", () => {
  it("converts an entry to whole cents without floating point", () => {
    expect(parseAmountInput("150")).toBe(15000);
    expect(parseAmountInput("0,1")).toBe(10);
    expect(parseAmountInput("1 234,56")).toBe(123456);
    expect(parseAmountInput("1 234.5")).toBe(123450);
    expect(parseAmountInput("19.99")).toBe(1999);
    expect(parseAmountInput("0")).toBe(0);
  });

  it.each(["", "abc", "-5", "1,234", "1,2,3", "12.345", "1e3"])(
    "refuses the entry %s",
    (entry) => {
      expect(parseAmountInput(entry)).toBeNull();
    },
  );

  it("formats cents in French, with an explicit sign on request", () => {
    expect(spaces(formatVaultMoney(124760, "EUR"))).toBe("1 247,60 €");
    expect(spaces(formatVaultMoney(25000, "EUR", true))).toBe("+250,00 €");
    expect(spaces(formatVaultMoney(-8000, "EUR", true))).toBe("-80,00 €");
    expect(spaces(formatVaultMoney(0, "EUR", true))).toBe("0,00 €");
  });

  it("uses the Paris calendar day", () => {
    expect(vaultToday(new Date("2026-11-10T23:30:00Z"))).toBe("2026-11-11");
    expect(vaultToday(new Date("2026-11-11T22:59:00Z"))).toBe("2026-11-11");
    // Heure d'été (UTC+2) et ses deux bascules, à 1 h UTC.
    expect(vaultToday(new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01");
    expect(vaultToday(new Date("2026-03-28T23:30:00Z"))).toBe("2026-03-29");
    expect(vaultToday(new Date("2026-03-29T22:30:00Z"))).toBe("2026-03-30");
    expect(vaultToday(new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
    expect(vaultToday(new Date("2026-10-25T22:30:00Z"))).toBe("2026-10-25");
  });

  it("moves between months without passing the current one", () => {
    expect(shiftMonth("2026-01", -1, "2026-11")).toBe("2025-12");
    expect(shiftMonth("2026-10", 1, "2026-11")).toBe("2026-11");
    expect(shiftMonth("2026-11", 1, "2026-11")).toBeNull();
  });
});

describe("vault forms", () => {
  it("accepts an account draft and trims its name", () => {
    expect(
      validateAccountDraft({
        name: "  Projet maison ",
        currency: "eur",
        initialBalance: "2 000,00",
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Projet maison",
        currency: "EUR",
        initialBalanceMinorUnits: 200000,
      },
    });
  });

  it("explains each refused field of an account draft", () => {
    const result = validateAccountDraft({
      name: "A",
      currency: "EURO",
      initialBalance: "-1",
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        name: "Le nom doit contenir entre 2 et 50 caractères.",
        currency: "Indiquez une devise sur trois lettres, par exemple EUR.",
        initialBalance:
          "Saisissez un solde positif ou nul avec au plus deux décimales.",
      },
    });
  });

  it("builds a transfer with its own idempotency key", () => {
    const result = validateTransferDraft(
      { direction: "withdraw", amount: "150", date: "2026-11-11" },
      "2026-11-11",
      () => "manual:abc12345",
    );
    expect(result).toEqual({
      ok: true,
      value: {
        direction: "FROM_SAVINGS",
        amountMinorUnits: 15000,
        operationDate: "2026-11-11",
        idempotencyKey: "manual:abc12345",
      },
    });
  });

  it("refuses a null amount, a future day and an impossible day", () => {
    const key = () => "manual:abc12345";
    expect(
      validateTransferDraft(
        { direction: "deposit", amount: "0", date: "2026-11-12" },
        "2026-11-11",
        key,
      ),
    ).toEqual({
      ok: false,
      errors: {
        amount:
          "Saisissez un montant strictement positif avec au plus deux décimales.",
        date: "Choisissez une date valide, au plus tard aujourd’hui.",
      },
    });
    expect(
      validateTransferDraft(
        { direction: "deposit", amount: "5", date: "2026-02-30" },
        "2026-11-11",
        key,
      ).ok,
    ).toBe(false);
  });
});

describe("vault texts", () => {
  it("labels savings movements like the Web", () => {
    const deposit = parseSavingsMovement(savingsMovement());
    expect(savingsMovementLabels(deposit)).toEqual({
      title: "Virement manuel",
      kind: "Dépôt",
    });
    expect(signedMovementAmount(deposit)).toBe(25000);
    const correction = parseSavingsMovement({
      ...savingsMovement(),
      direction: "FROM_SAVINGS",
      reason: "MONTH_END",
      isCompensation: true,
      monthEndRevision: 2,
    });
    expect(savingsMovementLabels(correction)).toEqual({
      title: "Correction : épargne de fin de mois",
      kind: "Retrait",
    });
    expect(signedMovementAmount(correction)).toBe(-25000);
  });

  it("labels current movements by kind and source", () => {
    expect(currentMovementLabels(parseCurrentMovement(currentMovement()))).toBe(
      "Dépense",
    );
    expect(
      currentMovementLabels(
        parseCurrentMovement({
          ...currentMovement(),
          source: "EXCEPTIONAL_INCOME",
          kind: "ENTREE",
          accountId: null,
        }),
      ),
    ).toBe("Entrée exceptionnelle de fin de mois");
  });

  it("explains known refusals and falls back otherwise", () => {
    expect(vaultErrorMessage("INSUFFICIENT_SAVINGS", "x")).toBe(
      "Le solde de ce compte ne suffit pas pour ce retrait.",
    );
    expect(vaultErrorMessage("UNKNOWN", "Repli")).toBe("Repli");
    expect(vaultErrorMessage(null, "Repli")).toBe("Repli");
  });

  it("offers the goals of the same currency that have no account", () => {
    const goals = [
      { id: 1, currency: "EUR", savingsAccountId: null },
      { id: 2, currency: "USD", savingsAccountId: null },
      { id: 3, currency: "EUR", savingsAccountId: 4 },
    ];
    expect(eligibleGoals(goals, "EUR").map((goal) => goal.id)).toEqual([1]);
  });
});
