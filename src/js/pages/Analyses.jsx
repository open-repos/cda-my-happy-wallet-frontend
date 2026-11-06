import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { longDate } from "../components/BudgetCalendar/budgetFormat";
import { EChart } from "../components/charts/EChart";
import {
  analyticsChartOption,
  pieSlices,
} from "../components/charts/analyticsChartOptions";
import { useChartTokens } from "../components/charts/useChartTokens";
import { AnalyticsTable } from "../components/Analytics/AnalyticsTable";
import { LiveMessage } from "../components/LiveMessage";
import { useAnalytics } from "../hooks/useAnalytics";
import { useCategoryRanks } from "../hooks/useCategoryRanks";
import {
  CHART_TYPES,
  GROUPINGS,
  METRICS,
  PERIODS,
  SPLITS,
  allowedChartTypes,
  isCivilDate,
  isTemporal,
  parisToday,
  parseExplorerParams,
  rangeProblem,
  toApiQuery,
  toSearchParams,
} from "../utils/analyticsExplorer";
import "../../css/Analyses.css";
import { EnvelopeSection } from "../components/Envelopes/EnvelopeSection";

const LOADING = "Chargement du graphique…";
const EMPTY = "Aucune opération sur cette période.";
const ERRORS = {
  ANALYTICS_RANGE_TOO_LARGE:
    "Trop de points à afficher pour cette période : réduisez la période ou choisissez un regroupement plus large.",
  ANALYTICS_QUERY_INVALID: "La date de début doit précéder la date de fin.",
};

const Select = ({ id, label, value, options, onChange }) => (
  <div className="analytics-field">
    <label htmlFor={id}>{label}</label>
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

/** Graphique et tableau partagent les tokens et, en secteurs, les couleurs. */
const Result = ({ data, state, ranks }) => {
  const tokens = useChartTokens();
  const { metric: metricValue, chart: chartValue } = state;
  const option = useMemo(
    () =>
      analyticsChartOption(
        data,
        { metric: metricValue, chart: chartValue },
        tokens,
        ranks
      ),
    [data, metricValue, chartValue, tokens, ranks]
  );
  const slices = useMemo(
    () =>
      chartValue === "pie" ? pieSlices(data, metricValue, tokens, ranks) : null,
    [data, metricValue, chartValue, tokens, ranks]
  );
  const metric = METRICS.find((item) => item.value === metricValue).label;
  const chart = CHART_TYPES.find((item) => item.value === chartValue).label;
  return (
    <>
      <EChart
        className="analytics-chart"
        option={option}
        label={`Graphique en ${chart.toLowerCase()} : ${metric.toLowerCase()} du ${longDate(
          state.from
        )} au ${longDate(state.to)}, ${data.buckets.length} valeurs. ${
          slices ? "Couleurs, montants et parts" : "Détail"
        } dans le tableau qui suit.`}
      />
      <AnalyticsTable data={data} metric={metricValue} slices={slices} />
    </>
  );
};

/** Explorateur : indicateur, regroupement, ventilation, type et période dans l'URL. */
const Analyses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = parisToday();
  const state = parseExplorerParams(searchParams, today);
  const problem = rangeProblem(
    state.from,
    state.to,
    state.groupBy,
    state.splitBy
  );
  const query = toApiQuery(state);
  const result = useAnalytics(query, problem);
  // Mêmes couleurs de catégorie que l'accueil (#172), lues une fois pour la
  // page : un changement de filtre ne les relit pas et ne les fait pas varier.
  const palette = useCategoryRanks();
  const status =
    result.status === "success" && !palette.settled ? "loading" : result.status;
  const errorText =
    ERRORS[result.code] ??
    "Le graphique n’a pas pu être chargé. Vérifiez votre connexion puis réessayez.";
  const announcement =
    status === "loading"
      ? LOADING
      : result.status === "invalid"
      ? result.message
      : result.status === "error"
      ? errorText
      : result.status === "empty"
      ? EMPTY
      : "";

  // Les dates saisies remplacent l'entrée d'historique au lieu d'en ajouter.
  const update = (changes, { replace = false } = {}) => {
    const next = { ...state, ...changes };
    // Normalise les combinaisons incompatibles avant d'écrire l'URL.
    setSearchParams(
      toSearchParams(parseExplorerParams(toSearchParams(next), today)),
      { replace }
    );
  };

  const chartOptions = CHART_TYPES.filter((option) =>
    allowedChartTypes(state.groupBy, state.splitBy, state.metric).includes(
      option.value
    )
  );

  return (
    <main className="analytics">
      <header className="analytics__header">
        <h1>Analyses</h1>
        <p>Choisissez ce que vous visualisez et comment le regrouper.</p>
        <p className="analytics__hint">
          Limites : 366 jours par jour, 156 semaines, 120 mois (mois, catégorie,
          type), 30 ans, et 500 points au plus.
        </p>
      </header>
      <EnvelopeSection analysis />

      <form
        className="analytics__controls"
        onSubmit={(event) => event.preventDefault()}
      >
        <Select
          id="analytics-metric"
          label="Indicateur"
          value={state.metric}
          options={METRICS}
          onChange={(metric) => update({ metric })}
        />
        <Select
          id="analytics-group"
          label="Regrouper par"
          value={state.groupBy}
          options={GROUPINGS.filter(
            (option) => option.value !== "kind" || state.metric === "net"
          )}
          onChange={(groupBy) => update({ groupBy })}
        />
        {isTemporal(state.groupBy) && (
          <Select
            id="analytics-split"
            label="Ventiler"
            value={state.splitBy}
            options={SPLITS.filter(
              (option) => option.value !== "kind" || state.metric === "net"
            )}
            onChange={(splitBy) => update({ splitBy })}
          />
        )}
        <Select
          id="analytics-chart"
          label="Type de graphique"
          value={state.chart}
          options={chartOptions}
          onChange={(chart) => update({ chart })}
        />
        <Select
          id="analytics-period"
          label="Période"
          value={state.period}
          options={PERIODS}
          onChange={(period) => update({ period })}
        />
        {state.period === "custom" && (
          <>
            <div className="analytics-field">
              <label htmlFor="analytics-from">Du</label>
              <input
                id="analytics-from"
                type="date"
                value={state.from}
                onChange={(event) =>
                  isCivilDate(event.target.value) &&
                  update({ from: event.target.value }, { replace: true })
                }
              />
            </div>
            <div className="analytics-field">
              <label htmlFor="analytics-to">Au</label>
              <input
                id="analytics-to"
                type="date"
                value={state.to}
                onChange={(event) =>
                  isCivilDate(event.target.value) &&
                  update({ to: event.target.value }, { replace: true })
                }
              />
            </div>
          </>
        )}
      </form>

      {/* États annoncés par des régions live toujours montées (#164, #171) ;
          les copies visibles sont masquées aux lecteurs d'écran. */}
      <LiveMessage
        message={announcement}
        isError={result.status === "invalid" || result.status === "error"}
        visible={false}
      />
      <section className="analytics__result">
        {status === "loading" && (
          <p className="analytics__state" aria-hidden="true">
            {LOADING}
          </p>
        )}
        {result.status === "invalid" && (
          <p className="analytics__state" aria-hidden="true">
            {result.message}
          </p>
        )}
        {result.status === "error" && (
          <div className="analytics__state">
            <p aria-hidden="true">{errorText}</p>
            {/* Un refus métier se reproduirait : seule l'erreur réseau se relance. */}
            {result.code === null && (
              <button
                type="button"
                className="analytics__button"
                onClick={result.reload}
              >
                Réessayer
              </button>
            )}
          </div>
        )}
        {result.status === "empty" && (
          <p className="analytics__state" aria-hidden="true">
            {EMPTY}
          </p>
        )}
        {status === "success" && (
          <Result data={result.data} state={state} ranks={palette.ranks} />
        )}
      </section>
    </main>
  );
};

export default Analyses;
