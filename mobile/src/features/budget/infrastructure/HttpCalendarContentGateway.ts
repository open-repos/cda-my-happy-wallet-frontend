import {
  parseCollectionPage,
  parseOperation,
  isCalendarDate,
} from "@/src/features/operations/domain/oneOffOperation";
import { parseMonthlyEvent } from "@/src/features/events/domain/monthlyEvent";
import {
  CalendarResolution,
  CalendarOccurrence,
  CalendarElement,
  calendarContent,
} from "../domain/calendarContent";
import { monthBounds } from "../domain/budgetCalendar";
import { currentParisDate } from "../domain/budgetSummary";
import { BudgetHttpClient } from "./HttpBudgetSummaryGateway";
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
export const parseCalendarResolution = (v: unknown): CalendarResolution => {
  if (
    !record(v) ||
    !Number.isInteger(v.eventId) ||
    Number(v.eventId) < 1 ||
    !isCalendarDate(String(v.occurrenceDate)) ||
    !["REALIZED", "CANCELED"].includes(String(v.status)) ||
    typeof v.title !== "string" ||
    !/^\d+\.\d{2}$/.test(String(v.amount)) ||
    !/^[A-Z]{3}$/.test(String(v.currency)) ||
    !["DEPENSE", "ENTREE"].includes(String(v.kind)) ||
    !Number.isFinite(Date.parse(String(v.resolvedAt)))
  )
    throw new Error("Invalid resolution");
  if (
    v.operation !== null &&
    (!record(v.operation) ||
      !Number.isInteger(v.operation.id) ||
      typeof v.operation.title !== "string" ||
      !/^\d+\.\d{2}$/.test(String(v.operation.amount)) ||
      !isCalendarDate(String(v.operation.operationDate)) ||
      !Number.isInteger(v.operation.categoryId))
  )
    throw new Error("Invalid linked operation");
  return v as unknown as CalendarResolution;
};
export interface CalendarContentGateway {
  listMonth(month: string): Promise<CalendarElement[]>;
}
export class HttpCalendarContentGateway implements CalendarContentGateway {
  constructor(private readonly client: BudgetHttpClient) {}
  private async all<T>(
    path: string,
    params: Record<string, string>,
    parse: (v: unknown) => T,
  ): Promise<T[]> {
    const items: T[] = [],
      seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({
        ...params,
        limit: "100",
        ...(cursor ? { cursor } : {}),
      });
      const response = await this.client.request(`${path}?${query}`);
      if (!response.ok) throw new Error("Calendar read failed");
      const page = parseCollectionPage(await response.json(), parse);
      items.push(...page.data);
      cursor = page.meta.hasNext ? page.meta.nextCursor : null;
      if (cursor && seen.has(cursor))
        throw new Error("Repeated calendar cursor");
      if (cursor) seen.add(cursor);
    } while (cursor);
    return items;
  }
  async listMonth(month: string) {
    const bounds = monthBounds(month);
    const [operations, occurrences, resolutions] = await Promise.all([
      this.all("/operations", bounds, parseOperation),
      this.all(
        "/event-occurrences",
        { month, scenario: "simulation" },
        (v): CalendarOccurrence => {
          const e = parseMonthlyEvent(v);
          if (!record(v) || !isCalendarDate(String(v.occurrenceDate)))
            throw new Error("Invalid occurrence date");
          return { ...e, occurrenceDate: String(v.occurrenceDate) };
        },
      ),
      this.all(
        "/event-occurrence-resolutions",
        bounds,
        parseCalendarResolution,
      ),
    ]);
    return calendarContent(
      operations,
      occurrences,
      resolutions,
      currentParisDate(),
    );
  }
}
