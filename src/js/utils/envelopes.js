import { forecastToday } from "./budgetForecast";
export const envelopeMonth = () => forecastToday().slice(0, 7);
export const shiftEnvelopeMonth = (month, delta) => {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
};
export const effectiveMonthOptions = () =>
  Array.from({ length: 24 }, (_, i) => shiftEnvelopeMonth(envelopeMonth(), i));
export const validEffectiveMonth = (value) =>
  !value || effectiveMonthOptions().includes(value);
export const percentLabel = (value) =>
  value === null
    ? "Sans pourcentage (prévu nul)"
    : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(
        value
      )} %`;
export const envelopeStatusLabel = (metrics, currency, format) =>
  metrics.status === "EXCEEDED"
    ? `⚠ Dépassement de ${format(metrics.overrun, currency)}`
    : metrics.status === "REACHED"
    ? "✓ Budget atteint"
    : `✓ ${format(metrics.remaining, currency)} disponibles`;
