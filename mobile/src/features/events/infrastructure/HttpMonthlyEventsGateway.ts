import {
  EventDraft,
  MonthlyEvent,
  parseMonthlyEvent,
  toEventPayload,
} from "@/src/features/events/domain/monthlyEvent";
import { parseCollectionPage } from "@/src/features/operations/domain/oneOffOperation";

export interface EventsHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface MonthlyEventsGateway {
  listAllEvents(): Promise<MonthlyEvent[]>;
  createEvent(draft: EventDraft): Promise<MonthlyEvent>;
  updateEvent(id: number, draft: EventDraft): Promise<MonthlyEvent>;
  deleteEvent(id: number): Promise<void>;
}

export const EVENTS_PAGE_LIMIT = 100;

export class EventRequestError extends Error {
  public constructor(public readonly status: number) {
    super("Event request failed");
    this.name = "EventRequestError";
  }
}

const readJson = async (response: Response): Promise<unknown> => {
  if (!response.ok) throw new EventRequestError(response.status);
  return response.json() as Promise<unknown>;
};

/** Événements confirmés via `/v1/events`, même contrat que le Web (#225). */
export class HttpMonthlyEventsGateway implements MonthlyEventsGateway {
  public constructor(private readonly httpClient: EventsHttpClient) {}

  public async listAllEvents(): Promise<MonthlyEvent[]> {
    const events: MonthlyEvent[] = [];
    const visitedCursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const params = new URLSearchParams({ limit: `${EVENTS_PAGE_LIMIT}` });
      if (cursor != null) params.set("cursor", cursor);
      const response = await this.httpClient.request(
        `/events?${params.toString()}`,
      );
      const page = parseCollectionPage(
        await readJson(response),
        parseMonthlyEvent,
      );
      events.push(...page.data);
      cursor = page.meta.hasNext ? page.meta.nextCursor : null;
      if (cursor != null && visitedCursors.has(cursor)) {
        throw new Error("Repeated event cursor");
      }
      if (cursor != null) visitedCursors.add(cursor);
    } while (cursor != null);
    return events;
  }

  public createEvent(draft: EventDraft): Promise<MonthlyEvent> {
    return this.saveEvent("/events", "POST", draft);
  }

  public updateEvent(id: number, draft: EventDraft): Promise<MonthlyEvent> {
    return this.saveEvent(`/events/${id}`, "PUT", draft);
  }

  public async deleteEvent(id: number): Promise<void> {
    const response = await this.httpClient.request(`/events/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new EventRequestError(response.status);
  }

  private async saveEvent(
    path: string,
    method: "POST" | "PUT",
    draft: EventDraft,
  ): Promise<MonthlyEvent> {
    const response = await this.httpClient.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toEventPayload(draft)),
    });
    const payload = await readJson(response);
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("data" in payload)
    ) {
      throw new Error("Invalid monthly event response");
    }
    return parseMonthlyEvent(payload.data);
  }
}
