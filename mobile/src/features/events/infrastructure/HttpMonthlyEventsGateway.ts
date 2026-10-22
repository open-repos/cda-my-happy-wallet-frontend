import {
  EventDraft,
  MonthlyEvent,
  parseMonthlyEvent,
  toEventPayload,
} from "@/src/features/events/domain/monthlyEvent";
import { errorCodeOf } from "@/src/features/budget/infrastructure/HttpBudgetSummaryGateway";
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

/** Éléments potentiels de la Simulation (#241, backend #112). */
export interface PotentialEventsGateway {
  listPotentialEvents(): Promise<MonthlyEvent[]>;
  createPotentialEvent(draft: EventDraft): Promise<MonthlyEvent>;
  /** `PUT` sans statut : le potentiel reste potentiel. */
  updateEvent(id: number, draft: EventDraft): Promise<MonthlyEvent>;
  deleteEvent(id: number): Promise<void>;
  confirmPotentialEvent(id: number): Promise<MonthlyEvent>;
  clearPotentialEvents(): Promise<void>;
}

export const EVENTS_PAGE_LIMIT = 100;

export class EventRequestError extends Error {
  public constructor(
    public readonly status: number,
    /** Refus métier stable (`EXPIRED_POTENTIAL`…), s'il existe. */
    public readonly code: string | null = null,
  ) {
    super("Event request failed");
    this.name = "EventRequestError";
  }
}

const ensureOk = async (response: Response) => {
  if (!response.ok) {
    throw new EventRequestError(response.status, await errorCodeOf(response));
  }
};

const readJson = async (response: Response): Promise<unknown> => {
  await ensureOk(response);
  return response.json() as Promise<unknown>;
};

const readEvent = async (response: Response): Promise<MonthlyEvent> => {
  const payload = await readJson(response);
  if (typeof payload !== "object" || payload === null || !("data" in payload)) {
    throw new Error("Invalid monthly event response");
  }
  return parseMonthlyEvent(payload.data);
};

const parsePotential = (value: unknown): MonthlyEvent => {
  const event = parseMonthlyEvent(value);
  if (event.status !== "POTENTIEL") {
    throw new Error("Invalid potential event response");
  }
  return event;
};

/**
 * Événements via `/v1/events`, même contrat que le Web : confirmés (#225)
 * et potentiels de la Simulation (#241).
 */
export class HttpMonthlyEventsGateway
  implements MonthlyEventsGateway, PotentialEventsGateway
{
  public constructor(private readonly httpClient: EventsHttpClient) {}

  public listAllEvents(): Promise<MonthlyEvent[]> {
    return this.listPages({}, parseMonthlyEvent);
  }

  public listPotentialEvents(): Promise<MonthlyEvent[]> {
    return this.listPages({ status: "POTENTIEL" }, parsePotential);
  }

  public async createPotentialEvent(draft: EventDraft): Promise<MonthlyEvent> {
    return parsePotential(
      await this.saveEvent("/events", "POST", draft, { status: "POTENTIEL" }),
    );
  }

  /** Confirmation par la seule route dédiée ; la réponse doit la refléter. */
  public async confirmPotentialEvent(id: number): Promise<MonthlyEvent> {
    const event = await readEvent(
      await this.httpClient.request(`/events/${id}/confirm`, {
        method: "POST",
      }),
    );
    if (event.status !== "CONFIRME" || event.id !== id) {
      throw new Error("Invalid confirmed event response");
    }
    return event;
  }

  public async clearPotentialEvents(): Promise<void> {
    await ensureOk(
      await this.httpClient.request("/simulation/events", {
        method: "DELETE",
      }),
    );
  }

  private async listPages(
    filter: Record<string, string>,
    parseItem: (value: unknown) => MonthlyEvent,
  ): Promise<MonthlyEvent[]> {
    const events: MonthlyEvent[] = [];
    const visitedCursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const params = new URLSearchParams({
        ...filter,
        limit: `${EVENTS_PAGE_LIMIT}`,
      });
      if (cursor != null) params.set("cursor", cursor);
      const response = await this.httpClient.request(
        `/events?${params.toString()}`,
      );
      const page = parseCollectionPage(await readJson(response), parseItem);
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
    await ensureOk(
      await this.httpClient.request(`/events/${id}`, { method: "DELETE" }),
    );
  }

  private async saveEvent(
    path: string,
    method: "POST" | "PUT",
    draft: EventDraft,
    extra: { status?: "POTENTIEL" } = {},
  ): Promise<MonthlyEvent> {
    return readEvent(
      await this.httpClient.request(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...toEventPayload(draft), ...extra }),
      }),
    );
  }
}
