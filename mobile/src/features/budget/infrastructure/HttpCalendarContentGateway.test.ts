import { describe, it, expect } from "vitest";
import {
  HttpCalendarContentGateway,
  parseCalendarResolution,
} from "./HttpCalendarContentGateway";
import {
  calendarContent,
  calendarCounts,
  CalendarOccurrence,
  CalendarResolution,
} from "../domain/calendarContent";
const date = "2026-10-25";
const operation = {
  id: 1,
  title: "Courses",
  amount: "20.00",
  currency: "EUR",
  type: "DEPENSE" as const,
  operationDate: date,
  categoryId: 4,
};
const event: CalendarOccurrence = {
  id: 9,
  title: "Loyer",
  amount: "50.00",
  currency: "EUR",
  kind: "DEPENSE",
  startDate: date,
  occurrenceDate: date,
  recurrence: "MENSUELLE",
  endDate: null,
  status: "CONFIRME",
};
const resolution: CalendarResolution = {
  eventId: 9,
  occurrenceDate: date,
  title: "Loyer",
  amount: "50.00",
  currency: "EUR",
  kind: "DEPENSE",
  status: "REALIZED",
  operation,
  resolvedAt: "2026-10-25T10:00:00Z",
};
describe("native complete calendar", () => {
  it("reads every page with month civil bounds, all currencies and simulation only for visibility", async () => {
    const seen: string[] = [];
    const client = {
      request: async (path: string) => {
        seen.push(path);
        const url = new URL(path, "https://test.invalid");
        let data: unknown[] = [];
        if (url.pathname === "/operations")
          data = [{ ...operation, id: url.searchParams.has("cursor") ? 2 : 1 }];
        if (url.pathname === "/event-occurrences")
          data = [event, { ...event, id: 10, status: "POTENTIEL" }];
        const more =
          url.pathname === "/operations" && !url.searchParams.has("cursor");
        return Response.json({
          data,
          meta: { limit: 100, hasNext: more, nextCursor: more ? "next" : null },
        });
      },
    };
    const items = await new HttpCalendarContentGateway(client).listMonth(
      "2026-10",
    );
    expect(items).toHaveLength(4);
    const operations = seen.filter((p) => p.startsWith("/operations?"));
    expect(operations).toHaveLength(2);
    expect(
      operations.every(
        (p) =>
          p.includes("from=2026-10-01") &&
          p.includes("to=2026-10-31") &&
          !p.includes("currency"),
      ),
    ).toBe(true);
    expect(seen.find((p) => p.startsWith("/event-occurrences?"))).toContain(
      "scenario=simulation",
    );
  });
  it("rejects incomplete pages and unavailable reads without announcing an empty month", async () => {
    const gateway = new HttpCalendarContentGateway({
      request: async () =>
        Response.json({
          data: [],
          meta: { limit: 100, hasNext: true, nextCursor: null },
        }),
    });
    await expect(gateway.listMonth("2026-10")).rejects.toThrow();
  });
  it("uses occurrence identities and operation links, including moves and deletions", () => {
    expect(
      calendarContent([operation], [event], [resolution], date),
    ).toHaveLength(1);
    const moved = { ...operation, operationDate: "2026-11-01" };
    const items = calendarContent(
      [moved],
      [event],
      [{ ...resolution, operation: moved }],
      date,
    );
    expect(calendarCounts(items.filter((i) => i.date === date)).real).toBe(0);
    expect(items.find((i) => i.nature === "real")?.resolution?.eventId).toBe(9);
    expect(
      calendarContent([], [], [{ ...resolution, operation: null }], date)[0]
        .statusLabel,
    ).toContain("supprimée");
  });
  it("shows all types in one day with potentials excluded from the real type", () => {
    const items = calendarContent(
      [operation, { ...operation, id: 2, type: "ENTREE" }],
      [event, { ...event, id: 10, status: "POTENTIEL" }],
      [],
      "2026-10-26",
    );
    expect(calendarCounts(items)).toEqual({
      real: 2,
      planned: 1,
      potential: 1,
      overdue: 1,
    });
  });
  it("validates decisions and preserves a nullable link", () => {
    expect(parseCalendarResolution({ ...resolution, operation: null })).toEqual(
      { ...resolution, operation: null },
    );
    expect(() =>
      parseCalendarResolution({ ...resolution, status: "CONFIRME" }),
    ).toThrow();
  });
});
