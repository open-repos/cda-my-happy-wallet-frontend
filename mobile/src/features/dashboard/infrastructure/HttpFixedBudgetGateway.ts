import {
  FixedOperation,
  parseFixedOperationPage,
} from "@/src/features/dashboard/domain/fixedBudget";

export interface DashboardHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface FixedBudgetGateway {
  listAll(): Promise<FixedOperation[]>;
}

const PAGE_LIMIT = 100;

export class HttpFixedBudgetGateway implements FixedBudgetGateway {
  public constructor(private readonly httpClient: DashboardHttpClient) {}

  public async listAll(): Promise<FixedOperation[]> {
    const operations: FixedOperation[] = [];
    const visitedCursors = new Set<string>();
    let cursor: string | null = null;

    do {
      const params = new URLSearchParams({ limit: `${PAGE_LIMIT}` });
      if (cursor != null) params.set("cursor", cursor);
      const response = await this.httpClient.request(
        `/operations-fixes?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Fixed budget request failed");
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
}
