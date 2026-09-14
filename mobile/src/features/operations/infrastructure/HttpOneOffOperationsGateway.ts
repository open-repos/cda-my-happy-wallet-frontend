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

export interface OperationsHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface OneOffOperationsGateway {
  listOperations(
    cursor?: string | null,
  ): Promise<CollectionPage<OneOffOperation>>;
  listAllCategories(): Promise<OperationCategory[]>;
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
): string => {
  const params = new URLSearchParams({ limit: `${limit}` });
  if (cursor != null) params.set("cursor", cursor);
  return `/${resource}?${params.toString()}`;
};

export class HttpOneOffOperationsGateway implements OneOffOperationsGateway {
  public constructor(private readonly httpClient: OperationsHttpClient) {}

  public async listOperations(
    cursor: string | null = null,
  ): Promise<CollectionPage<OneOffOperation>> {
    const response = await this.httpClient.request(
      buildCollectionPath("operations", OPERATIONS_PAGE_LIMIT, cursor),
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
