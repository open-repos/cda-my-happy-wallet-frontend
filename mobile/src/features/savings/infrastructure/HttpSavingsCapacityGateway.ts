import { HttpBudgetForecastGateway } from "@/src/features/forecast/infrastructure/HttpBudgetForecastGateway";
import {
  SavingsOverview,
  parseSavingsCapacity,
} from "@/src/features/savings/domain/savingsCapacity";

export interface SavingsHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface SavingsCapacityGateway {
  overview(from: string): Promise<SavingsOverview>;
}

export class SavingsRequestError extends Error {
  public constructor(public readonly status: number) {
    super("Savings capacity request failed");
    this.name = "SavingsRequestError";
  }
}

const CURRENCY = "EUR";

/**
 * Capacité d'épargne du mois et disponibles de la prévision du même mois,
 * lues ensemble comme sur le Web (#217).
 */
export class HttpSavingsCapacityGateway implements SavingsCapacityGateway {
  private readonly forecast: HttpBudgetForecastGateway;

  public constructor(private readonly httpClient: SavingsHttpClient) {
    this.forecast = new HttpBudgetForecastGateway(httpClient);
  }

  public async overview(from: string): Promise<SavingsOverview> {
    const params = new URLSearchParams({
      from,
      months: "1",
      currency: CURRENCY,
    });
    const [response, projection] = await Promise.all([
      this.httpClient.request(`/savings-capacity?${params.toString()}`),
      this.forecast.forecast({ from, months: 1 }),
    ]);
    if (!response.ok) throw new SavingsRequestError(response.status);
    const payload: unknown = await response.json();
    const capacity = parseSavingsCapacity(
      typeof payload === "object" && payload !== null && "data" in payload
        ? payload.data
        : null,
    );
    const month = projection.months[0];
    // Deux lectures peuvent encadrer une modification : jamais de mélange.
    if (
      month == null ||
      capacity.from !== from ||
      capacity.currency !== CURRENCY ||
      capacity.referenceDate !== projection.referenceDate ||
      capacity.months[0].afterPlanned !== month.forecastRemaining
    ) {
      throw new Error("Invalid savings capacity response");
    }
    return {
      ...capacity,
      allowances: {
        monthly: month.prudentMonthlyAllowance,
        weekly: month.prudentWeeklyAllowance,
        daily: month.prudentDailyAllowance,
        remainingDays: month.remainingDays,
      },
    };
  }
}
