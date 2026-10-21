import {
  BudgetForecast,
  MAX_FORECAST_MONTHS,
  isForecastMonth,
  parseBudgetForecast,
} from "@/src/features/forecast/domain/budgetForecast";

export interface ForecastHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface ForecastQuery {
  from: string;
  months: number;
}

export interface BudgetForecastGateway {
  forecast(query: ForecastQuery): Promise<BudgetForecast>;
}

export class ForecastRequestError extends Error {
  public constructor(public readonly status: number) {
    super("Forecast request failed");
    this.name = "ForecastRequestError";
  }
}

const CURRENCY = "EUR";

/** Prévision via `/v1/budget-forecast`, même contrôle que le Web (#214). */
export class HttpBudgetForecastGateway implements BudgetForecastGateway {
  public constructor(private readonly httpClient: ForecastHttpClient) {}

  public async forecast({
    from,
    months,
  }: ForecastQuery): Promise<BudgetForecast> {
    if (
      !isForecastMonth(from) ||
      !Number.isInteger(months) ||
      months < 1 ||
      months > MAX_FORECAST_MONTHS
    ) {
      throw new Error("Invalid budget forecast query");
    }
    const params = new URLSearchParams({
      from,
      months: `${months}`,
      currency: CURRENCY,
    });
    const response = await this.httpClient.request(
      `/budget-forecast?${params.toString()}`,
    );
    if (!response.ok) throw new ForecastRequestError(response.status);
    const payload: unknown = await response.json();
    const forecast = parseBudgetForecast(
      typeof payload === "object" && payload !== null && "data" in payload
        ? payload.data
        : null,
    );
    // Réponse d'une autre requête, ou partielle : refusée comme sur le Web.
    if (
      forecast.from !== from ||
      forecast.currency !== CURRENCY ||
      (forecast.months.length !== 0 && forecast.months.length !== months)
    ) {
      throw new Error("Invalid budget forecast response");
    }
    return forecast;
  }
}
