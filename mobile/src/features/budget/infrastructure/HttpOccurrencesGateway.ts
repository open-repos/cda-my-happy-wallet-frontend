import {
  PendingOccurrence,
  RealizeBody,
  parsePendingOccurrence,
} from "@/src/features/budget/domain/pendingOccurrence";
import {
  BudgetHttpClient,
  errorCodeOf,
} from "@/src/features/budget/infrastructure/HttpBudgetSummaryGateway";
import { parseCollectionPage } from "@/src/features/operations/domain/oneOffOperation";

export interface OccurrencesGateway {
  listPending(through: string): Promise<PendingOccurrence[]>;
  realize(eventId: number, date: string, body: RealizeBody): Promise<void>;
  cancel(eventId: number, date: string): Promise<void>;
}

const PENDING_PAGE_LIMIT = 100;

export class OccurrenceRequestError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super("Occurrence request failed");
    this.name = "OccurrenceRequestError";
  }
}

const ensureOk = async (response: Response): Promise<Response> => {
  if (!response.ok) {
    throw new OccurrenceRequestError(
      response.status,
      await errorCodeOf(response),
    );
  }
  return response;
};

export class HttpOccurrencesGateway implements OccurrencesGateway {
  public constructor(private readonly httpClient: BudgetHttpClient) {}

  /** Toute la file jusqu'à `through` (le backend la borne à douze mois). */
  public async listPending(through: string): Promise<PendingOccurrence[]> {
    const items: PendingOccurrence[] = [];
    const cursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const params = new URLSearchParams({
        through,
        limit: `${PENDING_PAGE_LIMIT}`,
      });
      if (cursor !== null) params.set("cursor", cursor);
      const response = await ensureOk(
        await this.httpClient.request(
          `/event-occurrences/pending?${params.toString()}`,
        ),
      );
      const page = parseCollectionPage(
        await response.json(),
        parsePendingOccurrence,
      );
      items.push(...page.data);
      cursor = page.meta.hasNext ? page.meta.nextCursor : null;
      if (cursor !== null && cursors.has(cursor)) {
        throw new Error("Repeated pending cursor");
      }
      if (cursor !== null) cursors.add(cursor);
    } while (cursor !== null);
    return items;
  }

  public realize(
    eventId: number,
    date: string,
    body: RealizeBody,
  ): Promise<void> {
    return this.decide(eventId, date, "realize", body);
  }

  public cancel(eventId: number, date: string): Promise<void> {
    return this.decide(eventId, date, "cancel", {});
  }

  private async decide(
    eventId: number,
    date: string,
    action: "realize" | "cancel",
    body: object,
  ): Promise<void> {
    await ensureOk(
      await this.httpClient.request(
        `/event-occurrences/${eventId}/${encodeURIComponent(date)}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      ),
    );
  }
}
