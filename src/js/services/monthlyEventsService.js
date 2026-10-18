import { apiPrivate } from "../../utils/axiosHelper";

export const MONTHLY_EVENTS_PAGE_LIMIT = 100;

const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
const isPaginationMeta = (meta) =>
  Number.isInteger(meta?.limit) &&
  typeof meta?.hasNext === "boolean" &&
  (typeof meta?.nextCursor === "string" || meta?.nextCursor === null);

export const parseMonthlyEvent = (event) => {
  if (
    !Number.isInteger(event?.id) ||
    event.id <= 0 ||
    typeof event?.title !== "string" ||
    event.title.length < 2 ||
    event.title.length > 50 ||
    typeof event?.amount !== "string" ||
    !/^(0|[1-9]\d{0,7})\.\d{2}$/.test(event.amount) ||
    !/^[A-Z]{3}$/.test(event?.currency || "") ||
    !["DEPENSE", "ENTREE"].includes(event?.kind) ||
    !isDate(event?.startDate) ||
    !["AUCUNE", "MENSUELLE"].includes(event?.recurrence) ||
    (event?.endDate !== null && !isDate(event?.endDate))
  ) {
    throw new Error("Invalid monthly event response");
  }
  return {
    id: event.id,
    title: event.title,
    amount: event.amount,
    currency: event.currency,
    kind: event.kind,
    startDate: event.startDate,
    recurrence: event.recurrence,
    endDate: event.endDate,
  };
};

export const parseMonthlyEventOccurrence = (occurrence) => ({
  ...parseMonthlyEvent(occurrence),
  ...(isDate(occurrence?.occurrenceDate)
    ? { occurrenceDate: occurrence.occurrenceDate }
    : (() => {
        throw new Error("Invalid monthly event occurrence response");
      })()),
});

const loadAll = async (path, params, parseItem) => {
  const data = [];
  const cursors = new Set();
  let cursor = null;
  do {
    const response = await apiPrivate.get(path, {
      params: {
        ...params,
        limit: MONTHLY_EVENTS_PAGE_LIMIT,
        ...(cursor ? { cursor } : {}),
      },
      withCredentials: true,
    });
    if (
      !Array.isArray(response.data?.data) ||
      !isPaginationMeta(response.data?.meta)
    ) {
      throw new Error("Invalid monthly event collection response");
    }
    data.push(...response.data.data.map(parseItem));
    cursor = response.data.meta.hasNext ? response.data.meta.nextCursor : null;
    if (cursor && cursors.has(cursor))
      throw new Error("Repeated monthly event cursor");
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return data;
};

export const monthlyEventsService = {
  listEvents: () => loadAll("/events", {}, parseMonthlyEvent),
  listOccurrences: (month) =>
    loadAll("/event-occurrences", { month }, parseMonthlyEventOccurrence),
  async createEvent(event) {
    const response = await apiPrivate.post("/events", event, {
      withCredentials: true,
    });
    return parseMonthlyEvent(response.data?.data);
  },
  async updateEvent(id, event) {
    const response = await apiPrivate.put(`/events/${id}`, event, {
      withCredentials: true,
    });
    return parseMonthlyEvent(response.data?.data);
  },
  async deleteEvent(id) {
    await apiPrivate.delete(`/events/${id}`, { withCredentials: true });
  },
};
