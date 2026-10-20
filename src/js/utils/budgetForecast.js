export const isForecastMonth = (value) =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

export const shiftForecastMonth = (month, offset) => {
  const index =
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + offset;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String(
    (index % 12) + 1
  ).padStart(2, "0")}`;
};

export const forecastToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const forecastQueryProblem = (query, today = forecastToday()) => {
  const current = today.slice(0, 7);
  if (
    !isForecastMonth(query.from) ||
    query.from < current ||
    query.from > shiftForecastMonth(current, 23)
  )
    return "Choisissez le mois courant ou l’un des 23 mois suivants.";
  if (!Number.isInteger(query.months) || query.months < 1 || query.months > 24)
    return "Choisissez une durée de 1 à 24 mois.";
  if (!/^[A-Z]{3}$/.test(query.currency || ""))
    return "Choisissez une devise valide.";
  return null;
};
