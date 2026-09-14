import {
  FixedOperation,
  FixedOperationDraft,
  FixedOperationType,
  parseFixedOperationPage,
  toFixedOperationPayload,
} from "@/src/features/dashboard/domain/fixedBudget";
import { CollectionPage } from "@/src/features/operations/domain/oneOffOperation";

export interface DashboardHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface FixedBudgetGateway {
  list(cursor?: string | null): Promise<CollectionPage<FixedOperation>>;
  listAll(): Promise<FixedOperation[]>;
  create(draft: FixedOperationDraft): Promise<void>;
  update(operation: FixedOperation, draft: FixedOperationDraft): Promise<void>;
  delete(operation: FixedOperation): Promise<void>;
}

export const FIXED_BUDGET_PAGE_LIMIT = 20;
const DASHBOARD_PAGE_LIMIT = 100;

export class FixedBudgetRequestError extends Error {
  public constructor(public readonly status: number) {
    super("Fixed budget request failed");
    this.name = "FixedBudgetRequestError";
  }
}

const resourceFor = (type: FixedOperationType): string =>
  type === "REVENU" ? "revenus" : "charges";

const collectionPath = (limit: number, cursor?: string | null): string => {
  const params = new URLSearchParams({ limit: `${limit}` });
  if (cursor != null) params.set("cursor", cursor);
  return `/operations-fixes?${params.toString()}`;
};

export class HttpFixedBudgetGateway implements FixedBudgetGateway {
  public constructor(private readonly httpClient: DashboardHttpClient) {}

  public async list(
    cursor: string | null = null,
  ): Promise<CollectionPage<FixedOperation>> {
    const response = await this.httpClient.request(
      collectionPath(FIXED_BUDGET_PAGE_LIMIT, cursor),
    );
    if (!response.ok) throw new FixedBudgetRequestError(response.status);
    return parseFixedOperationPage(await response.json());
  }

  public async listAll(): Promise<FixedOperation[]> {
    const operations: FixedOperation[] = [];
    const visitedCursors = new Set<string>();
    let cursor: string | null = null;

    do {
      const response = await this.httpClient.request(
        collectionPath(DASHBOARD_PAGE_LIMIT, cursor),
      );
      if (!response.ok) throw new FixedBudgetRequestError(response.status);
      const page = parseFixedOperationPage(await response.json());
      operations.push(...page.data);
      cursor = page.meta.hasNext ? page.meta.nextCursor : null;
      if (cursor != null && visitedCursors.has(cursor)) {
        throw new Error("Repeated fixed budget cursor");
      }
      if (cursor != null) visitedCursors.add(cursor);
    } while (cursor != null);

    return operations;
  }

  public create(draft: FixedOperationDraft): Promise<void> {
    return this.save(
      `/operations-fixes/${resourceFor(draft.type)}`,
      "POST",
      draft,
    );
  }

  public update(
    operation: FixedOperation,
    draft: FixedOperationDraft,
  ): Promise<void> {
    return this.save(
      `/operations-fixes/${resourceFor(operation.type)}/${operation.id}`,
      "PUT",
      draft,
    );
  }

  public async delete(operation: FixedOperation): Promise<void> {
    const response = await this.httpClient.request(
      `/operations-fixes/${resourceFor(operation.type)}/${operation.id}`,
      { method: "DELETE" },
    );
    if (!response.ok) throw new FixedBudgetRequestError(response.status);
  }

  private async save(
    path: string,
    method: "POST" | "PUT",
    draft: FixedOperationDraft,
  ): Promise<void> {
    const response = await this.httpClient.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toFixedOperationPayload(draft)),
    });
    if (!response.ok) throw new FixedBudgetRequestError(response.status);
  }
}
