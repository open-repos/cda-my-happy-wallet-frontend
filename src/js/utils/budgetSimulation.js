import { shiftForecastMonth } from "./budgetForecast";

export const scenarioParams = (scenario = "standard") => {
  if (!["standard", "simulation"].includes(scenario))
    throw new Error("Invalid budget scenario");
  return scenario === "simulation" ? { scenario } : {};
};

/** The entire recurring rule expires according to its first occurrence. */
export const potentialExpiration = (startDate) => {
  const parsed = new Date(`${startDate}T00:00:00.000Z`);
  if (
    typeof startDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== startDate
  )
    throw new Error("Invalid potential anchor date");
  return `${shiftForecastMonth(startDate.slice(0, 7), 1)}-01`;
};
