import {
  formatMoney,
  monthLabel,
} from "../components/BudgetCalendar/budgetFormat";

/** Pourcentage atteint, plafonné à 100 et arrondi à l'inférieur. */
export const goalPercent = (goal) => {
  const toCents = (amount) => Math.round(Number(amount) * 100);
  const target = toCents(goal.targetAmount);
  return target > 0
    ? Math.min(100, Math.floor((toCents(goal.savedAmount) * 100) / target))
    : 0;
};

export const GOAL_STATUS_LABELS = {
  REACHED: "Atteint",
  NO_DEADLINE: "Sans échéance",
  ON_TRACK: "Dans les temps",
  BEHIND: "En retard",
  MISSED: "Échéance dépassée",
};

/** Phrase explicative de la prévision calculée par le backend. */
export const forecastMessage = ({ forecast, currency }) => {
  const reach = forecast.estimatedReachMonth
    ? monthLabel(forecast.estimatedReachMonth)
    : null;
  switch (forecast.status) {
    case "REACHED":
      return "Objectif atteint : votre épargne couvre le montant visé.";
    case "ON_TRACK":
      return reach
        ? `À ce rythme, objectif atteint en ${reach}, avant la date souhaitée.`
        : "À ce rythme, objectif atteint avant la date souhaitée.";
    case "BEHIND":
      return forecast.requiredMonthlyContribution
        ? `Pour tenir la date, versez ${formatMoney(
            forecast.requiredMonthlyContribution,
            currency
          )} par mois.`
        : "Le versement prévu ne suffit pas pour tenir la date.";
    case "MISSED":
      return "La date souhaitée est passée ou tombe ce mois-ci : plus aucun versement n’est possible avant elle.";
    default:
      return reach
        ? `À ce rythme, objectif atteint en ${reach}.`
        : "Ajoutez un versement mensuel pour estimer la date d’atteinte.";
  }
};
