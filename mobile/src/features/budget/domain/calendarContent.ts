import { OneOffOperation } from "@/src/features/operations/domain/oneOffOperation";
import { MonthlyEvent } from "@/src/features/events/domain/monthlyEvent";
import { PendingOccurrence } from "./pendingOccurrence";
export interface CalendarOccurrence extends MonthlyEvent {
  occurrenceDate: string;
}
export interface CalendarResolution {
  eventId: number;
  occurrenceDate: string;
  status: "REALIZED" | "CANCELED";
  title: string;
  amount: string;
  currency: string;
  kind: "DEPENSE" | "ENTREE";
  resolvedAt: string;
  operation: {
    id: number;
    title: string;
    amount: string;
    operationDate: string;
    categoryId: number;
  } | null;
}
export interface CalendarElement {
  key: string;
  date: string;
  title: string;
  amount: string;
  currency: string;
  kind: "DEPENSE" | "ENTREE";
  nature: "real" | "planned" | "potential" | "decision";
  statusLabel: string;
  overdue?: boolean;
  operation?: OneOffOperation;
  occurrence?: PendingOccurrence;
  event?: CalendarOccurrence;
  resolution?: CalendarResolution;
}
export const CALENDAR_TYPES = [
  { key: "real", label: "Opération réelle", symbol: "●" },
  { key: "planned", label: "Événement prévu", symbol: "□" },
  { key: "potential", label: "Élément potentiel", symbol: "◇" },
  { key: "overdue", label: "Événement en retard", symbol: "!" },
] as const;
const occurrenceKey = (id: number, date: string) => `${id}:${date}`;
export const calendarContent = (
  operations: OneOffOperation[],
  occurrences: CalendarOccurrence[],
  resolutions: CalendarResolution[],
  today: string,
): CalendarElement[] => {
  const decisions = new Map(
    resolutions.map((r) => [occurrenceKey(r.eventId, r.occurrenceDate), r]),
  );
  const linked = new Map(
    resolutions.filter((r) => r.operation).map((r) => [r.operation!.id, r]),
  );
  const items: CalendarElement[] = operations.map((o) => ({
    key: `operation:${o.id}`,
    date: o.operationDate,
    title: o.title,
    amount: o.amount,
    currency: o.currency,
    kind: o.type,
    nature: "real",
    statusLabel: "Opération réelle · réalisée",
    operation: o,
    resolution: linked.get(o.id),
  }));
  for (const e of occurrences) {
    if (decisions.has(occurrenceKey(e.id, e.occurrenceDate))) continue;
    const potential = e.status === "POTENTIEL",
      overdue = !potential && e.occurrenceDate < today;
    items.push({
      key: `occurrence:${occurrenceKey(e.id, e.occurrenceDate)}`,
      date: e.occurrenceDate,
      title: e.title,
      amount: e.amount,
      currency: e.currency,
      kind: e.kind,
      nature: potential ? "potential" : "planned",
      overdue,
      event: e,
      occurrence: {
        eventId: e.id,
        occurrenceDate: e.occurrenceDate,
        title: e.title,
        amount: e.amount,
        currency: e.currency,
        kind: e.kind,
        overdue,
      },
      statusLabel: potential
        ? "Élément potentiel · à confirmer · exclu du réel"
        : "Événement prévu · confirmé",
    });
  }
  for (const r of resolutions) {
    if (
      r.operation?.operationDate === r.occurrenceDate &&
      operations.some((o) => o.id === r.operation!.id)
    )
      continue;
    items.push({
      key: `decision:${occurrenceKey(r.eventId, r.occurrenceDate)}`,
      date: r.occurrenceDate,
      title: r.title,
      amount: r.amount,
      currency: r.currency,
      kind: r.kind,
      nature: "decision",
      resolution: r,
      statusLabel:
        r.status === "CANCELED"
          ? "Occurrence annulée · aucun mouvement réel"
          : r.operation
            ? `Occurrence réalisée · opération du ${r.operation.operationDate}`
            : "Occurrence réalisée · opération supprimée",
    });
  }
  return items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.nature.localeCompare(b.nature) ||
      a.title.localeCompare(b.title, "fr") ||
      a.key.localeCompare(b.key),
  );
};
export const calendarCounts = (items: CalendarElement[]) => ({
  real: items.filter((i) => i.nature === "real").length,
  planned: items.filter((i) => i.nature === "planned").length,
  potential: items.filter((i) => i.nature === "potential").length,
  overdue: items.filter((i) => i.overdue).length,
});
