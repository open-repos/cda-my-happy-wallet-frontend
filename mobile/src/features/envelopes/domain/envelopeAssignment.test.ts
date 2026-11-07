import { describe, expect, it } from "vitest";

import { parseEnvelopeOccurrence } from "@/src/features/envelopes/domain/budgetEnvelope";
import { envelopeOccurrence } from "@/src/features/envelopes/testing/envelopeFixtures";

import {
  AssignmentState,
  assignmentProblem,
  reconciliationBody,
  suggestedOccurrences,
} from "./envelopeAssignment";

const occurrence = parseEnvelopeOccurrence(envelopeOccurrence("2026-10"));
const base: AssignmentState = {
  link: { status: "success", occurrenceId: null, occurrence: null },
  optionsStatus: "success",
  options: [occurrence],
  touched: false,
  selectedId: null,
  contextChanged: false,
  context: { month: "2026-10", currency: "EUR", kind: "DEPENSE" },
};

describe("envelope assignment rules (#389, Web #314)", () => {
  it("omits the block until the user explicitly chooses", () => {
    expect(reconciliationBody(base)).toBeUndefined();
    expect(
      reconciliationBody({ ...base, touched: true, selectedId: 41 }),
    ).toEqual({ occurrenceId: 41, expectedOccurrenceId: null });
    // Dissocier envoie `null` et le lien attendu.
    expect(
      reconciliationBody({
        touched: true,
        selectedId: null,
        link: { status: "success", occurrenceId: 41, occurrence },
      }),
    ).toEqual({ occurrenceId: null, expectedOccurrenceId: 41 });
  });

  it("accepts a compatible choice", () => {
    expect(
      assignmentProblem({ ...base, touched: true, selectedId: 41 }),
    ).toBeNull();
  });

  it("refuses an incompatible month, type or unknown envelope", () => {
    const wrongMonth = {
      ...base,
      touched: true,
      selectedId: 41,
      context: { ...base.context, month: "2026-11" },
    };
    expect(assignmentProblem(wrongMonth)).toMatch(
      /^Le rattachement est incompatible/,
    );
    expect(
      assignmentProblem({
        ...base,
        selectedId: 41,
        context: { ...base.context, kind: "ENTREE" },
      }),
    ).toMatch(/incompatible/);
    expect(
      assignmentProblem({ ...base, touched: true, selectedId: 99 }),
    ).toMatch(/incompatible/);
  });

  it("protects closed months and unverified links", () => {
    const closed = { ...occurrence, closed: true };
    expect(
      assignmentProblem({
        ...base,
        link: { status: "success", occurrenceId: 41, occurrence: closed },
        selectedId: 41,
        options: [closed],
      }),
    ).toBe(
      "Ce mois est clôturé : cette opération liée ne peut plus être modifiée.",
    );
    expect(
      assignmentProblem({
        ...base,
        contextChanged: true,
        link: { status: "error", occurrenceId: null, occurrence: null },
      }),
    ).toMatch(/^Vérifiez le rattachement actuel/);
    expect(
      assignmentProblem({
        ...base,
        touched: true,
        selectedId: 41,
        optionsStatus: "loading",
      }),
    ).toMatch(/^Les enveloppes doivent être chargées/);
  });

  it("suggests open envelopes of the same category only", () => {
    expect(suggestedOccurrences([occurrence], 4)).toEqual([occurrence]);
    expect(suggestedOccurrences([occurrence], 5)).toEqual([]);
    expect(suggestedOccurrences([{ ...occurrence, closed: true }], 4)).toEqual(
      [],
    );
  });
});
