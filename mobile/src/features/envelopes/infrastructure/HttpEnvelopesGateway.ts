import {
  EnvelopeOccurrence,
  EnvelopeOverview,
  EnvelopePayment,
  EnvelopeStatistics,
  parseEnvelopeOccurrence,
  parseEnvelopeOverview,
  parseEnvelopePayment,
} from "@/src/features/envelopes/domain/budgetEnvelope";
import {
  CollectionPage,
  parseCollectionPage,
} from "@/src/features/operations/domain/oneOffOperation";

export interface EnvelopesHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface EnvelopesGateway {
  overview(
    month: string,
    cursor?: string | null,
  ): Promise<CollectionPage<EnvelopeOverview>>;
  occurrence(id: number): Promise<EnvelopeOccurrence>;
  payments(
    occurrenceId: number,
    cursor?: string | null,
  ): Promise<CollectionPage<EnvelopePayment>>;
  yearStatistics(
    envelopeId: number,
    year: string,
  ): Promise<EnvelopeStatistics | null>;
}

export class EnvelopesRequestError extends Error {
  public constructor(public readonly status: number) {
    super("Envelope request failed");
    this.name = "EnvelopesRequestError";
  }
}

// Le mobile suit le budget en euros, comme ses autres écrans.
const CURRENCY = "EUR";
const LIMIT = "20";

const query = (params: Record<string, string>, cursor?: string | null) =>
  new URLSearchParams({
    ...params,
    limit: LIMIT,
    ...(cursor ? { cursor } : {}),
  }).toString();

/** Lecture des enveloppes budgétaires (#384), mêmes routes que le Web #314. */
export class HttpEnvelopesGateway implements EnvelopesGateway {
  public constructor(private readonly httpClient: EnvelopesHttpClient) {}

  public async overview(month: string, cursor?: string | null) {
    return parseCollectionPage(
      await this.get(
        `/envelope-overview?${query({ month, currency: CURRENCY }, cursor)}`,
      ),
      parseEnvelopeOverview,
    );
  }

  public async occurrence(id: number) {
    const payload = await this.get(`/reconciliation/occurrences/${id}`);
    return parseEnvelopeOccurrence(
      typeof payload === "object" && payload !== null && "data" in payload
        ? payload.data
        : null,
    );
  }

  public async payments(occurrenceId: number, cursor?: string | null) {
    return parseCollectionPage(
      await this.get(
        `/reconciliation/occurrences/${occurrenceId}/operations?${query(
          { unassociated: "false" },
          cursor,
        )}`,
      ),
      parseEnvelopePayment,
    );
  }

  /**
   * Statistiques de l'enveloppe sur l'année (vue annuelle du Web) : les
   * pages sont parcourues jusqu'à la trouver ; un curseur répété arrête.
   */
  public async yearStatistics(envelopeId: number, year: string) {
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const result: CollectionPage<EnvelopeOverview> = parseCollectionPage(
        await this.get(
          `/envelope-overview?${query({ year, currency: CURRENCY }, cursor)}`,
        ),
        parseEnvelopeOverview,
      );
      const found = result.data.find((row) => row.id === envelopeId);
      if (found) return found.statistics;
      cursor = result.meta.hasNext ? result.meta.nextCursor : null;
      if (cursor !== null && seen.has(cursor)) {
        throw new Error("Repeated envelope cursor");
      }
      if (cursor !== null) seen.add(cursor);
    } while (cursor !== null);
    return null;
  }

  private async get(path: string): Promise<unknown> {
    const response = await this.httpClient.request(path);
    if (!response.ok) throw new EnvelopesRequestError(response.status);
    return response.json();
  }
}
