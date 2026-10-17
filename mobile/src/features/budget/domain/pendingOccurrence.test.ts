import { describe, expect, it } from "vitest";

import { money } from "@/src/features/budget/domain/budgetSummary";
import {
  closesRealizeForm,
  decisionErrorMessage,
  occurrenceLabel,
  parsePendingOccurrence,
  realizeDraft,
  splitPending,
  toRealizeBody,
} from "@/src/features/budget/domain/pendingOccurrence";

const item = {
  eventId: 3,
  occurrenceDate: "2026-10-05",
  title: "Loyer",
  amount: "900.00",
  currency: "EUR",
  kind: "DEPENSE",
  overdue: true,
};

describe("parsePendingOccurrence", () => {
  it("keeps a valid occurrence", () => {
    expect(parsePendingOccurrence(item)).toEqual(item);
  });

  it.each([
    { eventId: 0 },
    { occurrenceDate: "2026-10" },
    { amount: "9" },
    { currency: "eur" },
    { kind: "CHARGE" },
    { overdue: "yes" },
  ])("rejects an invalid field %o", (field) => {
    expect(() => parsePendingOccurrence({ ...item, ...field })).toThrow(
      "Invalid pending occurrence",
    );
  });
});

describe("splitPending", () => {
  const late = parsePendingOccurrence(item);
  const upcoming = {
    ...late,
    eventId: 4,
    occurrenceDate: "2026-10-20",
    overdue: false,
  };

  it("puts overdue occurrences first", () => {
    expect(splitPending([upcoming, late], null)).toEqual({
      overdue: [late],
      upcoming: [upcoming],
    });
  });

  it("keeps only the selected day", () => {
    expect(splitPending([upcoming, late], "2026-10-20")).toEqual({
      overdue: [],
      upcoming: [upcoming],
    });
  });
});

describe("realizeDraft", () => {
  const occurrence = parsePendingOccurrence(item);

  it("prefills the occurrence and leaves the category to choose", () => {
    expect(realizeDraft(occurrence, "2026-10-11")).toEqual({
      title: "Loyer",
      amount: "900,00",
      operationDate: "2026-10-05",
      categoryId: null,
      kind: "DEPENSE",
    });
  });

  it("uses today for an occurrence of an earlier month", () => {
    expect(
      realizeDraft(
        { ...occurrence, occurrenceDate: "2026-09-28" },
        "2026-10-11",
      ).operationDate,
    ).toBe("2026-10-11");
  });

  it("builds the realize body", () => {
    expect(
      toRealizeBody({
        ...realizeDraft(occurrence, "2026-10-11"),
        title: " Loyer octobre ",
        amount: "905,5",
        categoryId: 2,
      }),
    ).toEqual({
      categoryId: 2,
      title: "Loyer octobre",
      amount: "905.50",
      operationDate: "2026-10-05",
    });
  });
});

describe("decision messages", () => {
  it("explains the business codes", () => {
    expect(decisionErrorMessage("PERIOD_CLOSED")).toMatch(/mois est clôturé/);
    expect(decisionErrorMessage("OCCURRENCE_ALREADY_RESOLVED")).toMatch(
      /déjà été traité/,
    );
    expect(decisionErrorMessage(null)).toMatch(/connexion/);
  });

  it("describes an occurrence for screen readers", () => {
    expect(occurrenceLabel(parsePendingOccurrence(item))).toBe(
      `Loyer, 5 octobre 2026, en retard. Dépense prévue ${money(-90000, "EUR")}.`,
    );
  });
});

describe("closesRealizeForm", () => {
  it("closes after a success or an occurrence resolved elsewhere", () => {
    expect(closesRealizeForm({ ok: true, code: null })).toBe(true);
    expect(
      closesRealizeForm({ ok: false, code: "OCCURRENCE_ALREADY_RESOLVED" }),
    ).toBe(true);
  });

  it("stays open so the user can fix the date or retry", () => {
    expect(closesRealizeForm({ ok: false, code: "PERIOD_CLOSED" })).toBe(false);
    expect(closesRealizeForm({ ok: false, code: null })).toBe(false);
  });
});
