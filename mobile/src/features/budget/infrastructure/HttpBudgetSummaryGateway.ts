import {
  BudgetSummary,
  parseBudgetSummary,
} from "@/src/features/budget/domain/budgetSummary";

export interface BudgetHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface BudgetSummaryGateway {
  getSummary(month: string): Promise<BudgetSummary>;
}

export class BudgetSummaryRequestError extends Error {
  public constructor(public readonly status: number) {
    super("Budget summary request failed");
    this.name = "BudgetSummaryRequestError";
  }
}

export class HttpBudgetSummaryGateway implements BudgetSummaryGateway {
  public constructor(private readonly httpClient: BudgetHttpClient) {}

  public async getSummary(month: string): Promise<BudgetSummary> {
    const params = new URLSearchParams({ currency: "EUR" });
    const response = await this.httpClient.request(
      `/budget-periods/${encodeURIComponent(month)}/summary?${params.toString()}`,
    );
    if (!response.ok) throw new BudgetSummaryRequestError(response.status);
    const body = (await response.json()) as { data?: unknown };
    return parseBudgetSummary(body.data);
  }
}
