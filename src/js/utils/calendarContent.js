/** Presentation projection only: civil dates and explicit server identities. */
export const occurrenceKey = (item) =>
  `${item.eventId ?? item.id}:${item.occurrenceDate}`;
export const CALENDAR_TYPES = [
  { key: "real", label: "Opération réelle" },
  { key: "planned", label: "Événement prévu" },
  { key: "potential", label: "Élément potentiel" },
  { key: "overdue", label: "Événement en retard" },
];
export const calendarContent = ({
  operations,
  occurrences,
  resolutions,
  today,
}) => {
  const decisions = new Map(
    resolutions.map((item) => [occurrenceKey(item), item])
  );
  const linked = new Map(
    resolutions.filter((r) => r.operation).map((r) => [r.operation.id, r])
  );
  const items = operations.map((operation) => ({
    key: `operation:${operation.id}`,
    date: operation.operationDate,
    title: operation.title,
    amount: operation.amount,
    currency: operation.currency,
    kind: operation.type,
    nature: "real",
    statusLabel: "Opération réelle · réalisée",
    operation,
    resolution: linked.get(operation.id),
  }));
  for (const occurrence of occurrences) {
    if (decisions.has(occurrenceKey(occurrence))) continue;
    const potential = occurrence.status === "POTENTIEL";
    items.push({
      ...occurrence,
      key: `occurrence:${occurrenceKey(occurrence)}`,
      date: occurrence.occurrenceDate,
      nature: potential ? "potential" : "planned",
      overdue: !potential && occurrence.occurrenceDate < today,
      statusLabel: potential
        ? "Élément potentiel · à confirmer · exclu du réel"
        : "Événement prévu · confirmé",
      occurrence: {
        ...occurrence,
        eventId: occurrence.id,
        overdue: !potential && occurrence.occurrenceDate < today,
      },
    });
  }
  for (const resolution of resolutions) {
    // A realized occurrence and its operation describe one real movement.
    // A moved operation retains a reference on the original occurrence date.
    if (
      resolution.operation?.operationDate === resolution.occurrenceDate &&
      operations.some((o) => o.id === resolution.operation.id)
    )
      continue;
    items.push({
      ...resolution,
      key: `decision:${occurrenceKey(resolution)}`,
      date: resolution.occurrenceDate,
      nature: "decision",
      resolution,
      statusLabel:
        resolution.status === "CANCELED"
          ? "Occurrence annulée · aucun mouvement réel"
          : resolution.operation
          ? `Occurrence réalisée · opération du ${resolution.operation.operationDate}`
          : "Occurrence réalisée · opération supprimée",
    });
  }
  return items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.nature.localeCompare(b.nature) ||
      a.title.localeCompare(b.title, "fr") ||
      a.key.localeCompare(b.key)
  );
};
export const calendarCounts = (items) => ({
  real: items.filter((i) => i.nature === "real").length,
  planned: items.filter((i) => i.nature === "planned").length,
  potential: items.filter((i) => i.nature === "potential").length,
  overdue: items.filter((i) => i.overdue).length,
});

export const calendarCountLabel = (type, count) => {
  const labels = {
    real: ["opération réelle", "opérations réelles"],
    planned: ["événement prévu", "événements prévus"],
    potential: ["élément potentiel", "éléments potentiels"],
    overdue: ["événement en retard", "événements en retard"],
  };
  return `${count} ${labels[type][count > 1 ? 1 : 0]}`;
};
