import { FinancialGoal } from "@/src/features/goals/domain/financialGoal";
import {
  SavingsTrajectories,
  TrajectoryRequest,
  parseSavingsTrajectories,
  toTrajectoryBody,
} from "@/src/features/goals/domain/savingsTrajectory";

export interface TrajectoryHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface SavingsTrajectoryGateway {
  simulate(
    request: TrajectoryRequest,
    expectedGoal?: FinancialGoal,
  ): Promise<SavingsTrajectories>;
}

export class TrajectoryRequestError extends Error {
  public constructor(public readonly status: number) {
    super("Savings trajectory request failed");
    this.name = "TrajectoryRequestError";
  }
}

/**
 * Simulation réversible : `POST` sans écriture côté serveur (backend #132).
 * Aucune opération, objectif ni virement n'est créé.
 */
export class HttpSavingsTrajectoryGateway implements SavingsTrajectoryGateway {
  public constructor(private readonly httpClient: TrajectoryHttpClient) {}

  public async simulate(
    request: TrajectoryRequest,
    expectedGoal?: FinancialGoal,
  ): Promise<SavingsTrajectories> {
    const body = toTrajectoryBody(request);
    const response = await this.httpClient.request(
      "/savings-capacity/trajectories",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) throw new TrajectoryRequestError(response.status);
    const payload: unknown = await response.json();
    return parseSavingsTrajectories(
      typeof payload === "object" && payload !== null && "data" in payload
        ? payload.data
        : null,
      body,
      expectedGoal,
    );
  }
}
