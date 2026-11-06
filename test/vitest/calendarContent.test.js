import { describe, expect, it } from "vitest";
import {
  calendarContent,
  calendarCounts,
} from "../../src/js/utils/calendarContent";
const date = "2026-10-25",
  today = "2026-10-26";
const operation = {
  id: 1,
  title: "Courses",
  operationDate: date,
  amount: "20.00",
  currency: "EUR",
  type: "DEPENSE",
  categoryId: 1,
};
const event = {
  id: 4,
  title: "Prévu",
  occurrenceDate: date,
  amount: "30.00",
  currency: "EUR",
  kind: "DEPENSE",
  status: "CONFIRME",
};
const resolution = {
  eventId: 4,
  occurrenceDate: date,
  status: "REALIZED",
  title: "Prévu",
  amount: "30.00",
  currency: "EUR",
  kind: "DEPENSE",
  operation,
};
const project = (overrides) =>
  calendarContent({
    operations: [],
    occurrences: [],
    resolutions: [],
    today,
    ...overrides,
  });
describe("calendar presentation", () => {
  it("shows all real, confirmed, potential and overdue types without a summary or calculation", () => {
    const items = project({
      operations: [operation, { ...operation, id: 2, type: "ENTREE" }],
      occurrences: [event, { ...event, id: 5, status: "POTENTIEL" }],
    });
    expect(items).toHaveLength(4);
    expect(calendarCounts(items)).toEqual({
      real: 2,
      planned: 1,
      potential: 1,
      overdue: 1,
    });
    expect(items.find((i) => i.nature === "potential").statusLabel).toContain(
      "exclu du réel"
    );
  });
  it("deduplicates a converted occurrence by identity and preserves its operation link", () => {
    const items = project({
      operations: [operation],
      occurrences: [event],
      resolutions: [resolution],
    });
    expect(items).toHaveLength(1);
    expect(items[0].resolution).toEqual(resolution);
    expect(calendarCounts(items).real).toBe(1);
  });
  it("keeps a moved conversion reference but no artificial real movement on its original date", () => {
    const moved = { ...operation, operationDate: "2026-11-01" };
    const items = project({
      operations: [moved],
      occurrences: [event],
      resolutions: [{ ...resolution, operation: moved }],
    });
    expect(calendarCounts(items.filter((i) => i.date === date))).toEqual({
      real: 0,
      planned: 0,
      potential: 0,
      overdue: 0,
    });
    expect(items.find((i) => i.date === date).statusLabel).toContain(
      "2026-11-01"
    );
  });
  it("preserves decisions after rule or operation deletion without counting them as real", () => {
    const items = project({
      resolutions: [
        { ...resolution, operation: null },
        { ...resolution, eventId: 8, status: "CANCELED", operation: null },
      ],
    });
    expect(items).toHaveLength(2);
    expect(calendarCounts(items).real).toBe(0);
  });
  it("keeps recurring occurrences distinct and civil dates unchanged at a month boundary", () => {
    const items = project({
      occurrences: [event, { ...event, occurrenceDate: "2026-11-01" }],
    });
    expect(items.map((i) => i.date)).toEqual([date, "2026-11-01"]);
    expect(new Set(items.map((i) => i.key)).size).toBe(2);
  });
});
