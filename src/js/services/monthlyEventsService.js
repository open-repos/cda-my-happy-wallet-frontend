import { parseAcknowledgedWrite } from "../utils/acknowledgedWrite";
import { apiPrivate } from "../../utils/axiosHelper";
import { isEventRecurrence } from "../utils/eventRecurrences";
import { scenarioParams } from "../utils/budgetSimulation";
import { isForecastDate } from "./budgetForecastService";

export const MONTHLY_EVENTS_PAGE_LIMIT = 100;

const isDate = isForecastDate;
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
    !isEventRecurrence(event?.recurrence) ||
    (event?.endDate !== null && !isDate(event?.endDate)) ||
    (event?.status !== undefined &&
      !["CONFIRME", "POTENTIEL"].includes(event.status))
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
    ...(event.status !== undefined ? { status: event.status } : {}),
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

const toBody = (event) =>
  Object.fromEntries(
    [
      "title",
      "amount",
      "currency",
      "kind",
      "startDate",
      "recurrence",
      "endDate",
    ].map((key) => [key, event[key]])
  );
const parsePotential = (event) => {
  const parsed = parseMonthlyEvent(event);
  if (parsed.status !== "POTENTIEL")
    throw new Error("Invalid potential event response");
  return parsed;
};

export const monthlyEventsService = {
  listEvents: () => loadAll("/events", {}, parseMonthlyEvent),
  listPotentialEvents: () =>
    loadAll("/events", { status: "POTENTIEL" }, parsePotential),
  listOccurrences: (month, scenario = "standard") =>
    loadAll(
      "/event-occurrences",
      { month, ...scenarioParams(scenario) },
      parseMonthlyEventOccurrence
    ),
  async createPotentialEvent(event) {
    const response = await apiPrivate.post(
      "/events",
      { ...toBody(event), status: "POTENTIEL" },
      { withCredentials: true }
    );
    return parseAcknowledgedWrite(parsePotential, response.data?.data);
  },
  async confirmPotentialEvent(id) {
    const response = await apiPrivate.post(`/events/${id}/confirm`, undefined, {
      withCredentials: true,
    });
    const event = parseMonthlyEvent(response.data?.data);
    if (event.status !== "CONFIRME" || event.id !== id)
      throw new Error("Invalid confirmed event response");
    return event;
  },
  async clearPotentialEvents() {
    await apiPrivate.delete("/simulation/events", { withCredentials: true });
  },
  async createEvent(event) {
    const response = await apiPrivate.post("/events", toBody(event), {
      withCredentials: true,
    });
    return parseAcknowledgedWrite(parseMonthlyEvent, response.data?.data);
  },
  async updateEvent(id, event) {
    const response = await apiPrivate.put(`/events/${id}`, toBody(event), {
      withCredentials: true,
    });
    return parseAcknowledgedWrite(parseMonthlyEvent, response.data?.data);
  },
  async deleteEvent(id) {
    await apiPrivate.delete(`/events/${id}`, { withCredentials: true });
  },
};
