import {
  DecisionPlan,
  MonthEndDecision,
  parseMonthEndDecision,
} from "@/src/features/month-end/domain/monthEnd";
import {
  VaultHttpClient,
  requestRefusal,
} from "@/src/features/vault/infrastructure/HttpVaultGateway";

export interface DecisionWrite {
  expectedRevision: number;
  idempotencyKey: string;
  plan: DecisionPlan;
}

export interface MonthEndGateway {
  get(month: string, currency: string): Promise<MonthEndDecision>;
  save(month: string, currency: string, write: DecisionWrite): Promise<void>;
}

const allocations = (rows: DecisionPlan["savings"]) =>
  rows.map(({ accountId, amountMinorUnits }) => ({
    accountId,
    amountMinorUnits,
  }));

/**
 * `GET/PUT /v1/budget-periods/:month/decision` (backend #184). Un refus
 * lève `VaultRequestError` avec le code stable, comme le Coffre (#419).
 */
export class HttpMonthEndGateway implements MonthEndGateway {
  public constructor(private readonly httpClient: VaultHttpClient) {}

  public async get(month: string, currency: string) {
    const response = await this.httpClient.request(this.path(month, currency));
    if (!response.ok) throw await requestRefusal(response);
    const payload: unknown = await response.json();
    return parseMonthEndDecision(
      typeof payload === "object" && payload !== null && "data" in payload
        ? payload.data
        : null,
    );
  }

  /**
   * Remplace intégralement la décision. Une réponse 2xx clôt l'écriture,
   * même illisible ou rejouée : l'appelant relit ensuite l'état courant.
   */
  public async save(month: string, currency: string, write: DecisionWrite) {
    const response = await this.httpClient.request(this.path(month, currency), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedRevision: write.expectedRevision,
        idempotencyKey: write.idempotencyKey,
        savings: allocations(write.plan.savings),
        coverage: allocations(write.plan.coverage),
        exceptionalIncomeMinorUnits: write.plan.exceptionalIncomeMinorUnits,
      }),
    });
    if (!response.ok) throw await requestRefusal(response);
  }

  private path(month: string, currency: string) {
    return `/budget-periods/${encodeURIComponent(month)}/decision?${new URLSearchParams({ currency }).toString()}`;
  }
}
