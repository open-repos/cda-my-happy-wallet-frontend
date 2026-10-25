import React, { useMemo, useState } from "react";
import { useSavingsTrajectory } from "../../hooks/useSavingsTrajectory";
import { LiveMessage } from "../LiveMessage";
import { EChart } from "../charts/EChart";
import { useChartTokens } from "../charts/useChartTokens";
import {
  COMPARISONS,
  savingsComparisonOption,
} from "../charts/savingsComparisonOptions";
import { formatMoney, monthLabel } from "../BudgetCalendar/budgetFormat";

const ZERO = {
  currentRemainingVariableExpense: "0.00",
  futureAdditionalVariableExpense: "0.00",
  monthlySafetyMargin: "0.00",
};
const INPUTS = [
  [
    "currentRemainingVariableExpense",
    "Complément variable restant ce mois-ci",
    "Uniquement ce qui reste à prévoir, en plus du réel et des événements déjà comptés.",
  ],
  [
    "futureAdditionalVariableExpense",
    "Complément variable par mois futur",
    "Alimentation, loisirs, transports, achats… uniquement en plus des dépenses déjà prévues.",
  ],
  [
    "monthlySafetyMargin",
    "Marge de sécurité mensuelle",
    "Somme laissée de côté chaque mois, non affectée aux objectifs ; ce n’est pas un seuil permanent.",
  ],
];
export const normalizedAssumption = (value) => {
  const match = /^(0|[1-9]\d{0,7})(?:[,.](\d{0,2}))?$/.exec(value.trim());
  return match ? `${match[1]}.${(match[2] || "").padEnd(2, "0")}` : null;
};
const reachText = (projection) => {
  if (projection.reachReason === "REACHED") return "Objectif déjà atteint";
  if (projection.estimatedReachMonth)
    return monthLabel(projection.estimatedReachMonth);
  return {
    NO_CONTRIBUTION: "Sans versement dans cette période",
    OUTSIDE_HORIZON: "Non atteint dans cet horizon",
    BUDGET_DEFICIT: "Budget déficitaire dans cet horizon",
  }[projection.reachReason];
};
export const SavingsTrajectorySimulation = ({ goal, onRefresh }) => {
  const [draft, setDraft] = useState(ZERO);
  const [assumptions, setAssumptions] = useState(ZERO);
  const [months, setMonths] = useState(24);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(COMPARISONS.map((item) => item.key));
  const state = useSavingsTrajectory(goal, months, assumptions);
  const tokens = useChartTokens();
  const chart = useMemo(
    () =>
      state.data
        ? savingsComparisonOption(goal, state.data, tokens, visible)
        : null,
    [goal, state.data, tokens, visible]
  );
  const money = (value) => formatMoney(value, goal.currency);
  const dirty = INPUTS.some(
    ([key]) => normalizedAssumption(draft[key]) !== assumptions[key]
  );
  const apply = (event) => {
    event.preventDefault();
    const values = Object.fromEntries(
      INPUTS.map(([key]) => [key, normalizedAssumption(draft[key])])
    );
    if (Object.values(values).some((value) => value === null)) {
      setError(
        "Saisissez des montants positifs ou nuls, avec deux décimales au maximum."
      );
      return;
    }
    setError("");
    setAssumptions(values);
  };
  return (
    <section
      className="savings-simulation"
      aria-label="Comparaison des trajectoires d’épargne"
    >
      <h4>Que puis-je épargner avec mon budget ?</h4>
      <p className="goal-card__help">
        Le maximum théorique utilise le budget connu et les engagements.
        L’estimation raisonnable retire aussi vos compléments variables et votre
        marge. Ce sont des projections, sans modification de vos opérations ni
        de vos objectifs.
      </p>
      <form onSubmit={apply} className="savings-simulation__form">
        {INPUTS.map(([key, label, help]) => (
          <label key={key} htmlFor={`saving-${goal.id}-${key}`}>
            {label} ({goal.currency})
            <input
              id={`saving-${goal.id}-${key}`}
              type="text"
              inputMode="decimal"
              required
              maxLength={11}
              value={draft[key]}
              aria-describedby={`saving-${goal.id}-${key}-help`}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value })
              }
            />
            <span
              id={`saving-${goal.id}-${key}-help`}
              className="goal-card__help"
            >
              {help}
            </span>
          </label>
        ))}
        <label htmlFor={`saving-${goal.id}-window`}>
          Période, mois courant inclus
          <select
            id={`saving-${goal.id}-window`}
            value={months}
            onChange={(event) => setMonths(Number(event.target.value))}
          >
            <option value={12}>12 mois · 11 versements futurs</option>
            <option value={24}>24 mois · 23 versements futurs</option>
          </select>
        </label>
        <div className="savings-simulation__actions">
          <button type="submit" className="monthly-event-button">
            Appliquer les hypothèses
          </button>
          <button
            type="button"
            className="monthly-event-button monthly-event-button--secondary"
            onClick={() => {
              setDraft(ZERO);
              setAssumptions(ZERO);
              setError("");
            }}
          >
            Réinitialiser les hypothèses
          </button>
        </div>
      </form>
      <p role="status">
        {error ||
          (dirty
            ? "Modifications non appliquées : les résultats utilisent encore les dernières hypothèses calculées."
            : "Hypothèses réversibles ; aucune épargne réelle n’est enregistrée.")}
      </p>
      <LiveMessage
        message={
          state.status === "loading"
            ? "Calcul des trajectoires…"
            : state.status === "success"
            ? "Comparaison recalculée."
            : ""
        }
        visible={false}
      />
      {state.status === "loading" && (
        <p aria-hidden="true">Calcul des trajectoires…</p>
      )}
      {["error", "conflict"].includes(state.status) && (
        <div role="alert">
          <p>
            {state.status === "conflict"
              ? "L’objectif a changé pendant la lecture. Actualisez les objectifs pour comparer un même état de vos données."
              : "La comparaison est momentanément indisponible. Vos hypothèses et vos données restent inchangées."}
          </p>
          <button
            type="button"
            className="monthly-event-button"
            onClick={state.status === "conflict" ? onRefresh : state.reload}
          >
            {state.status === "conflict"
              ? "Actualiser les objectifs"
              : "Réessayer la comparaison"}
          </button>
        </div>
      )}
      {state.status === "success" && (
        <>
          <p className="goal-card__help">
            Référence : {monthLabel(state.data.referenceDate.slice(0, 7))} ·{" "}
            {state.data.scenario === "simulation"
              ? "Simulation avec événements potentiels"
              : "Budget habituel, événements confirmés"}
            . Les capacités varient selon chaque mois.
          </p>
          <div className="savings-simulation__results">
            {COMPARISONS.map((item) => {
              const projection = state.data.projections[item.key],
                first = projection.months[0];
              return (
                <article
                  key={item.key}
                  aria-label={item.label}
                  className="savings-simulation__result"
                >
                  <h5>{item.label}</h5>
                  <strong>{reachText(projection)}</strong>
                  {first && (
                    <>
                      <p>
                        {money(first.selectedTotalContribution)} projetés pour
                        cet objectif en {monthLabel(first.month)}
                      </p>
                      <dl>
                        <div>
                          <dt>Capacité totale avant objectifs</dt>
                          <dd>{money(first.capacityBeforeGoals)}</dd>
                        </div>
                        <div>
                          <dt>Versement possible pour cet objectif</dt>
                          <dd>{money(first.selectedPossibleContribution)}</dd>
                        </div>
                        <div>
                          <dt>Supplément affecté</dt>
                          <dd>{money(first.allocatedSupplement)}</dd>
                        </div>
                      </dl>
                      {!first.fundable && (
                        <p>
                          Engagements ou marge non financés : déficit conservé
                          dans les reports.
                        </p>
                      )}
                    </>
                  )}
                  {projection.scheduledReachMonth &&
                    projection.scheduledReachMonth !==
                      projection.estimatedReachMonth && (
                      <p>
                        Rythme nominal :{" "}
                        {monthLabel(projection.scheduledReachMonth)}. Cette date
                        seule ne garantit pas son financement.
                      </p>
                    )}
                </article>
              );
            })}
          </div>
          <fieldset className="savings-simulation__legend">
            <legend>Courbes affichées</legend>
            {COMPARISONS.map((item) => (
              <label key={item.key}>
                <input
                  type="checkbox"
                  checked={visible.includes(item.key)}
                  onChange={(event) =>
                    setVisible((old) =>
                      event.target.checked
                        ? [...old, item.key]
                        : old.filter((key) => key !== item.key)
                    )
                  }
                />
                <span>
                  {item.label} · {item.pattern}
                </span>
              </label>
            ))}
          </fieldset>
          <EChart
            className="goal-trajectory__chart"
            option={chart}
            label={`Comparaison des trois trajectoires de ${goal.title}. Les dates et montants détaillés sont disponibles ci-dessous.`}
          />
          <p className="goal-card__help">
            ● Départ : épargne déclarée. Courbes : projections futures. ◇ Point
            non finançable avec le budget disponible. Repères : cible, mois
            souhaité et dates d’atteinte finançables présentes dans la période.
            Aucune donnée passée n’est reconstituée.
          </p>
          <details className="goal-trajectory__details">
            <summary>Lire les trois trajectoires en tableau</summary>
            <div
              className="savings-simulation__table"
              tabIndex={0}
              role="region"
              aria-label="Tableau des trajectoires, défilement horizontal"
            >
              <table>
                <caption>
                  Montants cumulés projetés en {goal.currency} ; non finançable
                  indiqué explicitement
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Mois</th>
                    {COMPARISONS.map((item) => (
                      <th scope="col" key={item.key}>
                        {item.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.data.projections.planned.points.map((point, index) => (
                    <tr key={point.month}>
                      <th scope="row">
                        {monthLabel(point.month)}
                        {index === 0 ? " · déclaré" : " · projeté"}
                      </th>
                      {COMPARISONS.map((item) => {
                        const value =
                          state.data.projections[item.key].points[index];
                        return (
                          <td key={item.key}>
                            {money(value.savedAmount)}
                            {!value.fundable && <span> · non finançable</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <details className="goal-trajectory__details">
            <summary>Comprendre le mois courant et l’allocation</summary>
            <p>
              Le mois courant est partiellement écoulé. Le budget réel et les
              événements prévus sont déjà pris en compte : seul le complément
              restant saisi est ajouté aux dépenses.
            </p>
            <dl className="goal-card__facts">
              <div>
                <dt>Reste après réservations, avant hypothèses</dt>
                <dd>
                  {money(
                    state.data.projections.reasonable.current.serverRemaining
                  )}
                </dd>
              </div>
              <div>
                <dt>Réservé aux objectifs ce mois-ci</dt>
                <dd>
                  {money(
                    state.data.projections.reasonable.current
                      .reservedContributions
                  )}
                </dd>
              </div>
              <div>
                <dt>Reste après complément et marge</dt>
                <dd>
                  {money(
                    state.data.projections.reasonable.current
                      .remainingUnderAssumptions
                  )}
                </dd>
              </div>
            </dl>
            <p>
              Ce reste n’augmente pas la jauge. Le solde courant positif est
              protégé car il pourrait déjà contenir l’épargne déclarée. Les
              reports négatifs doivent être couverts avant d’affecter un
              supplément. La marge est conservée chaque mois.
            </p>
            <p>
              Les versements des autres objectifs sont maintenus. Seul «{" "}
              {goal.title} » reçoit le supplément. Aucune somme n’est affectée
              plusieurs fois ni automatiquement réaffectée après atteinte.
            </p>
            {state.data.projections.reasonable.months[0] && (
              <ul>
                {state.data.projections.reasonable.months[0].allocations.map(
                  (allocation) => (
                    <li key={allocation.goalId}>
                      {
                        state.data.goals.find(
                          (item) => item.id === allocation.goalId
                        )?.title
                      }{" "}
                      : {money(allocation.reservedContribution)} réservés,{" "}
                      {money(allocation.projectedContribution)} projetés au
                      premier mois futur.
                    </li>
                  )
                )}
              </ul>
            )}
          </details>
        </>
      )}
    </section>
  );
};
