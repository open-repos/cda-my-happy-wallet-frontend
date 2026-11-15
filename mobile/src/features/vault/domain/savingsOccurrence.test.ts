import { describe, expect, it } from "vitest";

import {
  occurrenceKey,
  occurrenceTexts,
  parseSavingsOccurrence,
  resolutionMessage,
} from "@/src/features/vault/domain/savingsOccurrence";
import { vaultErrorMessage } from "@/src/features/vault/domain/vault";
import { savingsOccurrence } from "@/src/features/vault/testing/vaultFixtures";

const spaces = (value: string) => value.replace(/\s/g, " ");

describe("planned monthly payments (#425, backend #183)", () => {
  it("keeps the server fields of a planned payment", () => {
    expect(
      parseSavingsOccurrence({ ...savingsOccurrence(), owner: 9 }),
    ).toEqual(savingsOccurrence());
  });

  it.each([
    { accountId: 0 },
    { goalId: "3" },
    { month: "2026-13" },
    { operationDate: "2026-02-30" },
    { title: 12 },
    { amountMinorUnits: 0 },
    { amountMinorUnits: 1.5 },
    { currency: "eur" },
  ])("refuses an invalid planned payment %j", (change) => {
    expect(() =>
      parseSavingsOccurrence({ ...savingsOccurrence(), ...change }),
    ).toThrow();
  });

  it("identifies a payment by its account and its month", () => {
    expect(occurrenceKey(parseSavingsOccurrence(savingsOccurrence()))).toBe(
      "1:2026-11",
    );
  });

  it("describes the payment and its actions like the Web", () => {
    const texts = occurrenceTexts(parseSavingsOccurrence(savingsOccurrence()));
    expect(texts.title).toBe("Versement mensuel · Voyage au Japon");
    expect(spaces(texts.detail)).toBe(
      "Prévu le 1 novembre 2026 · 120,00 € du compte courant vers l’épargne",
    );
    expect(spaces(texts.confirm)).toBe(
      "Confirmer le virement de 120,00 € vers Voyage au Japon, prévu le 1 novembre 2026",
    );
    expect(spaces(texts.skip)).toBe(
      "Ne pas verser les 120,00 € prévus le 1 novembre 2026 pour Voyage au Japon",
    );
    expect(spaces(texts.bell)).toBe(
      "Voyage au Japon · 120,00 € prévus le 1 novembre 2026.",
    );
  });

  it("confirms the resolution with the Web texts", () => {
    const occurrence = parseSavingsOccurrence(savingsOccurrence());
    expect(spaces(resolutionMessage(occurrence, "CONFIRMED"))).toBe(
      "Virement de 120,00 € confirmé vers Voyage au Japon.",
    );
    expect(resolutionMessage(occurrence, "CANCELED")).toBe(
      "Versement de Voyage au Japon non effectué ce mois-ci.",
    );
  });

  it("explains a payment that was already resolved", () => {
    expect(vaultErrorMessage("OCCURRENCE_ALREADY_RESOLVED", "x")).toBe(
      "Ce versement a déjà été traité. La liste est actualisée.",
    );
  });
});
