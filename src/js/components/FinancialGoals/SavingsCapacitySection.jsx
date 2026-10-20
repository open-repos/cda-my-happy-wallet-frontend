import React from "react";
import { Link } from "react-router-dom";
import { useSavingsCapacity } from "../../hooks/useSavingsCapacity";
import { forecastToday } from "../../utils/budgetForecast";
import { formatMoney, monthLabel } from "../BudgetCalendar/budgetFormat";
import { LiveMessage } from "../LiveMessage";
import "../../../css/SavingsCapacity.css";

const indicators = {
  TENABLE: [
    "Tenable",
    "Les soldes après versements prévus et requis sont tous deux strictement positifs.",
  ],
  TENDU: [
    "Tendu",
    "Au moins un des soldes après versements prévus ou requis est nul, sans solde négatif.",
  ],
  NON_TENABLE: [
    "Non tenable",
    "Au moins un solde après versements prévus ou requis est négatif.",
  ],
  INDETERMINE: [
    "Indéterminé",
    "Au moins une échéance absente ou déjà atteinte empêche le calcul du versement requis, sans déficit déjà établi.",
  ],
};

export const SavingsCapacitySection = ({
  refreshKey = "",
  onAdjust,
  adjustDisabled = false,
}) => {
  const from = forecastToday().slice(0, 7);
  const state = useSavingsCapacity(from, refreshKey);
  const data = state.data;
  const money = (value) =>
    value === null ? "Non calculable" : formatMoney(value, data.currency);
  const month = data?.months[0];
  const indicator = month && indicators[month.sustainability];
  const loading = "Chargement de la capacité d’épargne…";
  const error =
    "La capacité d’épargne n’a pas pu être chargée. Réessayez pour obtenir une synthèse à jour.";
  return (
    <section
      className="savings-capacity"
      aria-labelledby="savings-capacity-title"
    >
      <h2 id="savings-capacity-title">Capacité d’épargne</h2>
      <LiveMessage
        message={
          state.status === "loading"
            ? loading
            : state.status === "error"
            ? error
            : ""
        }
        isError={state.status === "error"}
        visible={false}
      />
      {state.status === "loading" && <p aria-hidden="true">{loading}</p>}
      {state.status === "error" && (
        <div>
          <p aria-hidden="true">{error}</p>
          <button
            className="monthly-event-button"
            type="button"
            onClick={state.reload}
            aria-label="Réessayer la capacité d’épargne"
          >
            Réessayer
          </button>
        </div>
      )}
      {state.status === "success" && data && (
        <>
          <p>
            Prévision de {monthLabel(from)}. Les versements prévus sont réservés
            dans le budget ; ils ne modifient pas l’épargne déclarée.
          </p>
          <dl className="savings-capacity__facts">
            {[
              [
                "Versements prévus par mois",
                data.totalPlannedMonthlyContribution,
              ],
              [
                "Versements requis par mois",
                data.totalRequiredMonthlyContribution,
              ],
              ["Reste avant objectifs", month.beforeGoals],
              ["Reste après versements requis", month.afterRequired],
              ["Disponible par mois après objectifs", data.allowances.monthly],
              [
                "Disponible par semaine après objectifs",
                data.allowances.weekly,
              ],
              ["Disponible par jour après objectifs", data.allowances.daily],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd
                  className={
                    Number(value) < 0 ? "savings-capacity__negative" : undefined
                  }
                >
                  {money(value)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="savings-capacity__indicator">
            <strong>{indicator[0]}</strong> — {indicator[1]}
          </p>
          <p className="savings-capacity__help">
            Indicateur arithmétique sur les données saisies, sans conseil
            financier ni garantie de paiement dans le mois. Le jour répartit le
            reste sur {data.allowances.remainingDays} jours restants ; la
            semaine couvre au plus sept jours.
          </p>
          {data.goals.length === 0 ? (
            <p>Aucun objectif actif à prendre en compte.</p>
          ) : (
            <ul
              className="savings-capacity__goals"
              aria-label="Effort mensuel par objectif"
            >
              {data.goals.map((goal) => (
                <li key={goal.id}>
                  <h3>{goal.title}</h3>
                  <dl className="savings-capacity__facts">
                    {[
                      ["Versement prévu", goal.plannedMonthlyContribution],
                      [
                        "Versement requis pour tenir la date",
                        goal.requiredMonthlyContribution,
                      ],
                      ["Écart requis − prévu", goal.monthlyContributionGap],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{money(value)}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="savings-capacity__help">
                    Un écart positif indique un versement manquant pour la date
                    ; un écart négatif indique un excédent prévu. Sans échéance
                    future, le requis et l’écart sont non calculables.
                  </p>
                  {!goal.includedInTotals && (
                    <p>Exclu des totaux : aucun versement mensuel prévu.</p>
                  )}
                  {onAdjust ? (
                    <button
                      type="button"
                      disabled={adjustDisabled}
                      className="monthly-event-button monthly-event-button--secondary"
                      aria-label={`Ajuster le versement pour ${goal.title}`}
                      onClick={(event) =>
                        onAdjust(goal.id, event.currentTarget)
                      }
                    >
                      Ajuster le versement
                    </button>
                  ) : (
                    <Link
                      className="monthly-event-button monthly-event-button--secondary"
                      to={`/objectifs-evenements?ajuster=${goal.id}`}
                      aria-label={`Ajuster le versement pour ${goal.title}`}
                    >
                      Ajuster le versement
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};
