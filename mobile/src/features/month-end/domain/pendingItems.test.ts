import { describe, expect, it } from "vitest";

import { parseMonthEndDecision } from "@/src/features/month-end/domain/monthEnd";
import {
  attentionItems,
  bellLabel,
  closedMonthCard,
} from "@/src/features/month-end/domain/pendingItems";
import {
  correctedDecision,
  coveredDeficit,
  decidedDecision,
  pendingDecision,
} from "@/src/features/month-end/testing/monthEndFixtures";
import { parseSavingsOccurrence } from "@/src/features/vault/domain/savingsOccurrence";
import { savingsOccurrence } from "@/src/features/vault/testing/vaultFixtures";

const spaces = (value: string) => value.replace(/\s/g, " ");
const occurrence = parseSavingsOccurrence(savingsOccurrence());

describe("« À traiter » bell (#425)", () => {
  it("lists the pending decision first, then the planned payments", () => {
    const items = attentionItems(parseMonthEndDecision(pendingDecision()), [
      occurrence,
    ]);
    expect(
      items.map((item) => [item.kind, item.title, spaces(item.text)]),
    ).toEqual([
      [
        "decision",
        "Décision d’octobre en attente",
        "150,00 € reportés pour l’instant.",
      ],
      [
        "occurrence",
        "Versement mensuel à confirmer",
        "Voyage au Japon · 120,00 € prévus le 1 novembre 2026.",
      ],
    ]);
    expect(items[0]).toMatchObject({ month: "2026-10" });
    expect(bellLabel(items.length)).toBe("À traiter : 2 éléments");
  });

  it("shows a decision to review and a deficit kept for now", () => {
    expect(
      attentionItems(parseMonthEndDecision(correctedDecision()), []).map(
        (item) => [item.kind, item.title, item.text],
      ),
    ).toEqual([
      [
        "review",
        "Décision d’octobre à revoir",
        "Octobre a changé après votre décision.",
      ],
    ]);
    const deficit = parseMonthEndDecision({
      ...pendingDecision(),
      resultBeforeDecisionMinorUnits: -15000,
    });
    expect(spaces(attentionItems(deficit, [])[0].text)).toBe(
      "-150,00 € de déficit reporté pour l’instant.",
    );
  });

  it("is empty once everything is handled or when a read failed", () => {
    expect(
      attentionItems(parseMonthEndDecision(decidedDecision()), []),
    ).toEqual([]);
    expect(attentionItems(null, null)).toEqual([]);
    expect(bellLabel(0)).toBe("À traiter : rien pour le moment");
    expect(bellLabel(1)).toBe("À traiter : 1 élément");
  });
});

describe("closed month card of the calendar (#425)", () => {
  it("is shown only for a decidable month", () => {
    const now = new Date("2026-11-11T10:00:00Z");
    expect(closedMonthCard("2026-11", null, now)).toBeNull();
    expect(closedMonthCard("2026-12", null, now)).toBeNull();
  });

  it("invites to decide while no decision exists", () => {
    const card = closedMonthCard(
      "2026-10",
      null,
      new Date("2026-11-11T10:00:00Z"),
    );
    expect(card).toEqual({
      status: "pending",
      tag: "En attente",
      text: "Décision en attente · tout le solde est reporté.",
      rows: [],
      action: "Décider",
    });
  });

  it("summarises a decided surplus and a covered deficit", () => {
    const now = new Date("2026-11-11T10:00:00Z");
    const surplus = closedMonthCard(
      "2026-10",
      parseMonthEndDecision(decidedDecision()),
      now,
    );
    expect(surplus?.status).toBe("decided");
    expect(surplus?.tag).toBe("✓ Décidée");
    expect(spaces(surplus?.text ?? "")).toBe(
      "100,00 € épargnés ; 50,00 € reportés.",
    );
    expect(
      surplus?.rows.map(([label, value]) => [label, spaces(value)]),
    ).toEqual([
      ["Disponible avant décision", "150,00 €"],
      ["Épargne", "-100,00 €"],
      ["Report sur novembre", "+50,00 €"],
    ]);
    expect(surplus?.action).toBe("Voir ou modifier la décision");

    const deficit = closedMonthCard(
      "2026-10",
      parseMonthEndDecision(coveredDeficit()),
      now,
    );
    expect(spaces(deficit?.text ?? "")).toBe(
      "50,00 € prélevés sur l’épargne et 70,00 € d’entrée exceptionnelle ; 30,00 € de déficit restent reportés.",
    );
    expect(
      deficit?.rows.map(([label, value]) => [label, spaces(value)]),
    ).toEqual([
      ["Déficit avant décision", "-150,00 €"],
      ["Prélèvements d’épargne", "+50,00 €"],
      ["Entrée exceptionnelle", "+70,00 €"],
      ["Déficit reporté sur novembre", "-30,00 €"],
    ]);
  });

  it("says when a deficit is fully covered", () => {
    const card = closedMonthCard(
      "2026-10",
      parseMonthEndDecision({
        ...coveredDeficit(),
        coverage: [{ accountId: 15, amountMinorUnits: 8000 }],
        coverageMinorUnits: 8000,
        carryMinorUnits: 0,
      }),
      new Date("2026-11-11T10:00:00Z"),
    );
    expect(spaces(card?.text ?? "")).toBe(
      "80,00 € prélevés sur l’épargne et 70,00 € d’entrée exceptionnelle ; le déficit est entièrement couvert.",
    );
  });

  it("flags a decision to review", () => {
    const card = closedMonthCard(
      "2026-10",
      parseMonthEndDecision(correctedDecision()),
      new Date("2026-11-11T10:00:00Z"),
    );
    expect(card?.status).toBe("review");
    expect(card?.tag).toBe("! À revoir");
    expect(card?.action).toBe("Revoir la décision");
  });
});
