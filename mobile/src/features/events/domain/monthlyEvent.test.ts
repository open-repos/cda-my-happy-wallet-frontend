import { describe, expect, it } from "vitest";

import {
  EventDraft,
  FORM_RECURRENCES,
  parseMonthlyEvent,
  recurrenceLabel,
  toEventPayload,
  validateEventDraft,
} from "@/src/features/events/domain/monthlyEvent";

const event = {
  id: 4,
  title: "Assurance",
  amount: "120.00",
  currency: "EUR",
  kind: "DEPENSE" as const,
  startDate: "2026-09-20",
  recurrence: "MENSUELLE" as const,
  endDate: null,
};
const draft = (overrides: Partial<EventDraft> = {}): EventDraft => ({
  title: "Assurance",
  amount: "120",
  kind: "DEPENSE",
  startDate: "2026-09-20",
  recurrence: "MENSUELLE",
  endDate: null,
  ...overrides,
});

describe("monthly event domain (#225)", () => {
  it("keeps only the public event fields", () => {
    expect(
      parseMonthlyEvent({ ...event, ownerId: 9, status: "CONFIRME" }),
    ).toEqual(event);
  });

  it("accepts every API recurrence, so Web events stay readable", () => {
    for (const recurrence of [
      "AUCUNE",
      "HEBDOMADAIRE",
      "MENSUELLE",
      "TRIMESTRIELLE",
      "ANNUELLE",
    ]) {
      expect(parseMonthlyEvent({ ...event, recurrence }).recurrence).toBe(
        recurrence,
      );
    }
    expect(recurrenceLabel("TRIMESTRIELLE")).toBe("Chaque trimestre");
  });

  it("rejects malformed events", () => {
    expect(() => parseMonthlyEvent({ ...event, amount: 120 })).toThrow();
    expect(() => parseMonthlyEvent({ ...event, kind: "AUTRE" })).toThrow();
    expect(() =>
      parseMonthlyEvent({ ...event, startDate: "2026-02-30" }),
    ).toThrow();
    expect(() =>
      parseMonthlyEvent({ ...event, recurrence: "QUOTIDIENNE" }),
    ).toThrow();
    expect(() => parseMonthlyEvent({ ...event, endDate: "demain" })).toThrow();
  });

  it("offers the five Web repetitions, in the Web order (#216)", () => {
    expect(FORM_RECURRENCES.map(recurrenceLabel)).toEqual([
      "Une seule fois",
      "Chaque semaine",
      "Chaque mois",
      "Chaque trimestre",
      "Chaque année",
    ]);
  });

  it("validates like the Web form", () => {
    expect(validateEventDraft(draft())).toEqual({});
    expect(
      validateEventDraft(
        draft({ title: " A ", amount: "0", startDate: "2026-13-01" }),
      ),
    ).toEqual({
      title: "Le titre doit contenir entre 2 et 50 caractères.",
      amount: "Saisissez un montant positif avec deux décimales maximum.",
      startDate: "Choisissez une date valide.",
    });
    expect(validateEventDraft(draft({ endDate: "2026-09-19" }))).toEqual({
      endDate:
        "Choisissez une date de fin valide, au plus tôt à la date de début.",
    });
    // Fin incluse : le jour même du début est accepté ; une date
    // impossible est refusée.
    expect(validateEventDraft(draft({ endDate: "2026-09-20" }))).toEqual({});
    expect(validateEventDraft(draft({ endDate: "2026-02-30" }))).toEqual({
      endDate:
        "Choisissez une date de fin valide, au plus tôt à la date de début.",
    });
    // Une date de fin n'a de sens que pour une répétition : ignorée sinon.
    expect(
      validateEventDraft(
        draft({ recurrence: "AUCUNE", endDate: "2026-01-01" }),
      ),
    ).toEqual({});
  });

  it("builds the API payload", () => {
    expect(
      toEventPayload(draft({ title: " Loyer ", amount: "650,5" })),
    ).toEqual({
      title: "Loyer",
      amount: "650.50",
      currency: "EUR",
      kind: "DEPENSE",
      startDate: "2026-09-20",
      recurrence: "MENSUELLE",
      endDate: null,
    });
    expect(
      toEventPayload(draft({ recurrence: "AUCUNE", endDate: "2026-12-31" }))
        .endDate,
    ).toBeNull();
    expect(toEventPayload(draft({ endDate: "2026-12-31" })).endDate).toBe(
      "2026-12-31",
    );
  });
});
