import {
  CollectionPage,
  OneOffOperation,
  OperationCategory,
  OperationDraft,
  parseCategory,
  parseCollectionPage,
  parseOperation,
  toOperationPayload,
} from "@/src/features/operations/domain/oneOffOperation";
import { OperationRequestFilter } from "../domain/operationQuery";

export interface OperationsHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

/** Filtre facultatif de `GET /operations` : dates incluses et devise. */
export type OperationFilter = OperationRequestFilter;
export interface TitleSuggestion {
  value: string;
  label: string;
}
export interface TitleSuggestionsRequest {
  query?: string;
  cursor?: string | null;
  signal?: AbortSignal;
}

export interface OneOffOperationsGateway {
  listOperations(
    cursor?: string | null,
    filter?: OperationFilter,
  ): Promise<CollectionPage<OneOffOperation>>;
  listAllCategories(): Promise<OperationCategory[]>;
  listTitleSuggestions(
    request?: TitleSuggestionsRequest,
  ): Promise<CollectionPage<TitleSuggestion>>;
  createOperation(draft: OperationDraft): Promise<OneOffOperation>;
  updateOperation(id: number, draft: OperationDraft): Promise<OneOffOperation>;
  deleteOperation(id: number): Promise<void>;
}

export const OPERATIONS_PAGE_LIMIT = 20;
const CATEGORIES_PAGE_LIMIT = 100;

export class OperationRequestError extends Error {
  public constructor(public readonly status: number) {
    super("Operation request failed");
    this.name = "OperationRequestError";
  }
}

const readJson = async (response: Response): Promise<unknown> => {
  if (!response.ok) throw new OperationRequestError(response.status);
  return response.json() as Promise<unknown>;
};

const buildCollectionPath = (
  resource: string,
  limit: number,
  cursor?: string | null,
  filter?: OperationFilter,
): string => {
  const params = new URLSearchParams({ limit: `${limit}` });
  if (filter != null) {
    for (const key of [
      "from",
      "to",
      "currency",
      "sort",
      "order",
      "title",
      "type",
      "minAmount",
      "maxAmount",
    ] as const) {
      if (filter[key]) params.set(key, filter[key]);
    }
    for (const id of filter.categoryId ?? [])
      params.append("categoryId", String(id));
  }
  if (cursor != null) params.set("cursor", cursor);
  return `/${resource}?${params.toString()}`;
};

export class HttpOneOffOperationsGateway implements OneOffOperationsGateway {
  public constructor(private readonly httpClient: OperationsHttpClient) {}

  public async listOperations(
    cursor: string | null = null,
    filter?: OperationFilter,
  ): Promise<CollectionPage<OneOffOperation>> {
    const response = await this.httpClient.request(
      buildCollectionPath("operations", OPERATIONS_PAGE_LIMIT, cursor, filter),
    );
    return parseCollectionPage(await readJson(response), parseOperation);
  }

  public async listAllCategories(): Promise<OperationCategory[]> {
    const categories: OperationCategory[] = [];
    const visitedCursors = new Set<string>();
    let cursor: string | null = null;

    do {
      const response = await this.httpClient.request(
        buildCollectionPath(
          "operation-categories",
          CATEGORIES_PAGE_LIMIT,
          cursor,
        ),
      );
      const page = parseCollectionPage(await readJson(response), parseCategory);
      categories.push(...page.data);
      cursor = page.meta.hasNext ? page.meta.nextCursor : null;
      if (cursor != null && visitedCursors.has(cursor)) {
        throw new Error("Repeated category cursor");
      }
      if (cursor != null) visitedCursors.add(cursor);
    } while (cursor != null);

    return categories;
  }

  public async listTitleSuggestions({
    query = "",
    cursor = null,
    signal,
  }: TitleSuggestionsRequest = {}): Promise<CollectionPage<TitleSuggestion>> {
    const params = new URLSearchParams({ limit: "10" });
    if (query.trim()) params.set("q", query.trim().slice(0, 50));
    if (cursor != null) params.set("cursor", cursor);
    const response = await this.httpClient.request(
      `/operations/suggestions/titles?${params}`,
      { signal },
    );
    return parseCollectionPage(await readJson(response), (item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        !("title" in item) ||
        typeof item.title !== "string" ||
        item.title.length === 0 ||
        item.title.length > 50
      )
        throw new Error("Invalid title suggestion response");
      return { value: item.title, label: item.title };
    });
  }

  public async createOperation(
    draft: OperationDraft,
  ): Promise<OneOffOperation> {
    return this.saveOperation("/operations", "POST", draft);
  }

  public async updateOperation(
    id: number,
    draft: OperationDraft,
  ): Promise<OneOffOperation> {
    return this.saveOperation(`/operations/${id}`, "PUT", draft);
  }

  public async deleteOperation(id: number): Promise<void> {
    const response = await this.httpClient.request(`/operations/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new OperationRequestError(response.status);
  }

  private async saveOperation(
    path: string,
    method: "POST" | "PUT",
    draft: OperationDraft,
  ): Promise<OneOffOperation> {
    const response = await this.httpClient.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toOperationPayload(draft)),
    });
    const payload = await readJson(response);
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("data" in payload)
    ) {
      throw new Error("Invalid operation response");
    }
    return parseOperation(payload.data);
  }
}
