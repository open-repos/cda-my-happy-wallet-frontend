import {
  FinancialGoal,
  GoalDraft,
  parseFinancialGoal,
  toGoalPayload,
} from "@/src/features/goals/domain/financialGoal";
import { parseCollectionPage } from "@/src/features/operations/domain/oneOffOperation";

export interface GoalsHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface FinancialGoalsGateway {
  listAllGoals(): Promise<FinancialGoal[]>;
  createGoal(draft: GoalDraft): Promise<FinancialGoal>;
  updateGoal(id: number, draft: GoalDraft): Promise<FinancialGoal>;
  deleteGoal(id: number): Promise<void>;
}

export const GOALS_PAGE_LIMIT = 100;

export class GoalRequestError extends Error {
  public constructor(public readonly status: number) {
    super("Goal request failed");
    this.name = "GoalRequestError";
  }
}

const readJson = async (response: Response): Promise<unknown> => {
  if (!response.ok) throw new GoalRequestError(response.status);
  return response.json() as Promise<unknown>;
};

/** Objectifs financiers via `/v1/goals`, même contrat que le Web (#226). */
export class HttpFinancialGoalsGateway implements FinancialGoalsGateway {
  public constructor(private readonly httpClient: GoalsHttpClient) {}

  public async listAllGoals(): Promise<FinancialGoal[]> {
    const goals: FinancialGoal[] = [];
    const visitedCursors = new Set<string>();
    let cursor: string | null = null;
    do {
      const params = new URLSearchParams({ limit: `${GOALS_PAGE_LIMIT}` });
      if (cursor != null) params.set("cursor", cursor);
      const response = await this.httpClient.request(
        `/goals?${params.toString()}`,
      );
      const page = parseCollectionPage(
        await readJson(response),
        parseFinancialGoal,
      );
      goals.push(...page.data);
      cursor = page.meta.hasNext ? page.meta.nextCursor : null;
      if (cursor != null && visitedCursors.has(cursor)) {
        throw new Error("Repeated goal cursor");
      }
      if (cursor != null) visitedCursors.add(cursor);
    } while (cursor != null);
    return goals;
  }

  public createGoal(draft: GoalDraft): Promise<FinancialGoal> {
    return this.saveGoal("/goals", "POST", draft);
  }

  public updateGoal(id: number, draft: GoalDraft): Promise<FinancialGoal> {
    return this.saveGoal(`/goals/${id}`, "PUT", draft);
  }

  public async deleteGoal(id: number): Promise<void> {
    const response = await this.httpClient.request(`/goals/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new GoalRequestError(response.status);
  }

  private async saveGoal(
    path: string,
    method: "POST" | "PUT",
    draft: GoalDraft,
  ): Promise<FinancialGoal> {
    const response = await this.httpClient.request(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toGoalPayload(draft)),
    });
    const payload = await readJson(response);
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("data" in payload)
    ) {
      throw new Error("Invalid goal response");
    }
    return parseFinancialGoal(payload.data);
  }
}
