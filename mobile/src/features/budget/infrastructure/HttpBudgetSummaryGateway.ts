import {
  BudgetSummary,
  parseBudgetSummary,
} from "@/src/features/budget/domain/budgetSummary";
import {
  Scenario,
  withScenario,
} from "@/src/features/simulation/domain/scenario";

export interface BudgetHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface BudgetSummaryGateway {
  getSummary(month: string, scenario?: Scenario): Promise<BudgetSummary>;
}

/** Synthèse d'un mois quelconque; `null` pour un mois futur (`FUTURE_PERIOD`). */
export interface BudgetMonthGateway extends BudgetSummaryGateway {
  getMonth(month: string, scenario?: Scenario): Promise<BudgetSummary | null>;
}

/** Code métier stable porté par `error.details.code`, s'il existe. */
export const errorCodeOf = async (
  response: Response,
): Promise<string | null> => {
  try {
    const body = (await response.json()) as {
      error?: { details?: { code?: unknown } };
    };
    const code = body.error?.details?.code;
    return typeof code === "string" ? code : null;
  } catch {
    return null;
  }
};

export class BudgetSummaryRequestError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super("Budget summary request failed");
    this.name = "BudgetSummaryRequestError";
  }
}

export class HttpBudgetSummaryGateway implements BudgetMonthGateway {
  public constructor(private readonly httpClient: BudgetHttpClient) {}

  public async getSummary(
    month: string,
    scenario: Scenario = "standard",
  ): Promise<BudgetSummary> {
    const params = withScenario(
      new URLSearchParams({ currency: "EUR" }),
      scenario,
    );
    const response = await this.httpClient.request(
      `/budget-periods/${encodeURIComponent(month)}/summary?${params.toString()}`,
    );
    if (!response.ok) {
      throw new BudgetSummaryRequestError(
        response.status,
        await errorCodeOf(response),
      );
    }
    const body = (await response.json()) as { data?: unknown };
    return parseBudgetSummary(body.data);
  }

  public async getMonth(
    month: string,
    scenario: Scenario = "standard",
  ): Promise<BudgetSummary | null> {
    try {
      return await this.getSummary(month, scenario);
    } catch (error) {
      if (
        error instanceof BudgetSummaryRequestError &&
        error.code === "FUTURE_PERIOD"
      ) {
        return null;
      }
      throw error;
    }
  }
}
