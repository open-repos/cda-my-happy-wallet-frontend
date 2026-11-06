import React, { useId, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useEnvelopePage } from "../../hooks/useEnvelopePage";
import { useAnnouncesLoading } from "../../hooks/useAnnouncesLoading";
import { envelopeMonth, shiftEnvelopeMonth } from "../../utils/envelopes";
import {
  formatMoney,
  monthLabel,
  longDate,
} from "../BudgetCalendar/budgetFormat";
import { CategoryLabel } from "../Categories/CategoryLabel";
import { LiveMessage } from "../LiveMessage";
import { EnvelopeMetrics } from "./EnvelopeMetrics";
import { EnvelopeStatistics } from "./EnvelopeStatistics";
import { EnvelopeDetail } from "./EnvelopeDetail";
import "../../../css/Envelopes.css";

export const EnvelopeSection = ({ analysis = false }) => {
  const unique = useId(),
    [search] = useSearchParams();
  const [period, setPeriod] = useState("month"),
    [month, setMonth] = useState(() =>
      /^\d{4}-(0[1-9]|1[0-2])$/.test(search.get("envelopeMonth") ?? "")
        ? search.get("envelopeMonth")
        : envelopeMonth()
    );
  const [year, setYear] = useState(envelopeMonth().slice(0, 4)),
    [currency, setCurrency] = useState("EUR");
  const [selected, setSelected] = useState(() =>
    /^\d+$/.test(search.get("occurrence") ?? "")
      ? Number(search.get("occurrence"))
      : null
  );
  const [filter, setFilter] = useState(""),
    [state, setState] = useState("all"),
    [category, setCategory] = useState("all"),
    [horizon, setHorizon] = useState("6");
  const returnId = useRef(null);
  const valid =
    period === "month"
      ? /^(19[7-9]\d|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(month)
      : /^(19[7-9]\d|[2-9]\d{3})$/.test(year);
  const page = useEnvelopePage(
    "overview",
    { [period]: period === "month" ? month : year, currency },
    valid
  );
  const to = shiftEnvelopeMonth(envelopeMonth(), -1),
    from = shiftEnvelopeMonth(to, 1 - Number(horizon));
  const trends = useEnvelopePage("analytics", { from, to, currency }, analysis);
  const loading = useAnnouncesLoading(page.status, page.loadingKey),
    trendLoading = useAnnouncesLoading(trends.status, trends.loadingKey);
  const categories = [
    ...new Map(
      page.data.map((e) => [
        e.category?.id ?? 0,
        e.category?.name ?? "Sans catégorie",
      ])
    ).entries(),
  ];
  const visible = page.data.filter(
    (e) =>
      (category === "all" || String(e.category?.id ?? 0) === category) &&
      (state === "all" || e.totals.status === state) &&
      `${e.title} ${e.category?.name ?? ""}`
        .toLocaleLowerCase("fr")
        .includes(filter.toLocaleLowerCase("fr"))
  );
  const open = (id, e) => {
    returnId.current = e.currentTarget.id;
    setSelected(id);
  };
  const close = () => {
    setSelected(null);
    requestAnimationFrame(() =>
      document.getElementById(returnId.current)?.focus()
    );
  };
  return (
    <section className="envelope-section" aria-labelledby={`${unique}-title`}>
      <div className="envelope-row">
        <div>
          <h2 id={`${unique}-title`}>
            {analysis ? "Analyse des enveloppes" : "Mes enveloppes"}
          </h2>
          <p>Dépenses réelles rattachées à vos budgets mensuels.</p>
        </div>
        <Link to="/home/operations-fixes">Gérer les enveloppes</Link>
      </div>
      <div className="envelope-controls">
        <label className="envelope-field">
          Afficher
          <select
            aria-label="Afficher"
            value={period}
            disabled={Boolean(selected)}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="month">Un mois</option>
            <option value="year">Une année</option>
          </select>
        </label>
        {period === "month" ? (
          <label className="envelope-field">
            Mois des enveloppes
            <input
              type="month"
              min="1970-01"
              max={envelopeMonth()}
              value={month}
              disabled={Boolean(selected)}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
        ) : (
          <label className="envelope-field">
            Année des enveloppes
            <input
              type="number"
              inputMode="numeric"
              min="1970"
              max={envelopeMonth().slice(0, 4)}
              value={year}
              disabled={Boolean(selected)}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
        )}
        <label className="envelope-field">
          Devise des enveloppes
          <select
            aria-label="Devise des enveloppes"
            value={currency}
            disabled={Boolean(selected)}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option>EUR</option>
            <option>USD</option>
          </select>
        </label>
      </div>
      {!valid && <p role="alert">Choisissez une période valide.</p>}
      <LiveMessage
        message={loading ? "Chargement des enveloppes…" : ""}
        visible={false}
      />
      <LiveMessage message={page.message} isError />
      {selected ? (
        <EnvelopeDetail
          key={selected}
          occurrenceId={selected}
          onClose={close}
        />
      ) : (
        <>
          {page.status === "loading" && (
            <p aria-hidden="true">Chargement des enveloppes…</p>
          )}
          {page.status === "error" && (
            <button
              type="button"
              className="one-off-button"
              onClick={page.reload}
            >
              Réessayer les enveloppes
            </button>
          )}
          {page.status === "success" && (
            <>
              {page.data.length === 0 ? (
                <p>
                  Aucune enveloppe suivie pour cette période et cette devise.
                  Dans les charges fixes mensuelles, cochez « Utiliser comme
                  enveloppe budgétaire » pour démarrer.
                </p>
              ) : (
                <>
                  <details className="envelope-filters">
                    <summary>Rechercher / filtrer les enveloppes</summary>
                    <div className="envelope-controls">
                      <label className="envelope-field">
                        Rechercher dans les enveloppes chargées
                        <input
                          type="search"
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                        />
                      </label>
                      <label className="envelope-field">
                        État des enveloppes
                        <select
                          aria-label="État des enveloppes"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                        >
                          <option value="all">Tous les états</option>
                          <option value="AVAILABLE">Disponible</option>
                          <option value="REACHED">Budget atteint</option>
                          <option value="EXCEEDED">Dépassé</option>
                        </select>
                      </label>
                      <label className="envelope-field">
                        Catégorie des enveloppes
                        <select
                          aria-label="Catégorie des enveloppes"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          <option value="all">Toutes les catégories</option>
                          {categories.map(([id, name]) => (
                            <option key={id} value={id}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </details>
                  <div className="envelope-grid">
                    {visible.map((envelope) => (
                      <article
                        className="envelope-card"
                        key={envelope.id}
                        aria-label={envelope.title}
                      >
                        <div className="envelope-row">
                          <h3>{envelope.title}</h3>
                          <CategoryLabel category={envelope.category} />
                        </div>
                        <EnvelopeMetrics
                          metrics={envelope.totals}
                          currency={envelope.currency}
                        />
                        <p>
                          {envelope.totals.operationCount} opération(s) ·{" "}
                          {envelope.totals.observedMonths} mois suivi(s)
                        </p>
                        {period === "year" && (
                          <>
                            <p className="envelope-help">
                              Le dépassement du total annuel compense les écarts
                              entre mois. Somme des dépassements mensuels :{" "}
                              {formatMoney(
                                envelope.totals.sumMonthlyOverrun,
                                currency
                              )}
                              .
                            </p>
                            <EnvelopeStatistics
                              statistics={envelope.statistics}
                              currency={currency}
                            />
                          </>
                        )}
                        {envelope.months.map((m) => (
                          <div className="envelope-month" key={m.occurrenceId}>
                            {period === "year" && (
                              <h4>
                                {monthLabel(m.month)} ·{" "}
                                {formatMoney(m.actual, currency)} /{" "}
                                {formatMoney(m.planned, currency)}
                              </h4>
                            )}
                            {period === "month" && (
                              <ul className="envelope-preview">
                                {m.paymentsPreview.map((p) => (
                                  <li key={p.id}>
                                    <span>
                                      {p.title}
                                      <small>{longDate(p.operationDate)}</small>
                                    </span>
                                    <span>
                                      {formatMoney(p.amount, currency)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            <button
                              id={`${unique}-open-${m.occurrenceId}`}
                              type="button"
                              className="one-off-button one-off-button--secondary"
                              onClick={(e) => open(m.occurrenceId, e)}
                            >
                              Voir les dépenses
                              {period === "year"
                                ? ` · ${monthLabel(m.month)}`
                                : ` (${m.operationCount})`}
                            </button>
                          </div>
                        ))}
                      </article>
                    ))}
                  </div>
                  {visible.length === 0 && (
                    <p>
                      Aucune enveloppe parmi les éléments chargés pour ces
                      filtres.
                    </p>
                  )}
                  <p className="envelope-help">
                    Filtres et recherche sur les {page.data.length} enveloppes
                    chargées. Aucun mois sans historique n’est inventé.
                  </p>
                </>
              )}
              {page.meta?.hasNext && (
                <button
                  type="button"
                  className="one-off-button one-off-button--secondary"
                  disabled={page.paging}
                  onClick={page.loadMore}
                >
                  {page.paging
                    ? "Chargement…"
                    : "Afficher la suite des enveloppes"}
                </button>
              )}
            </>
          )}
        </>
      )}
      {analysis && (
        <section
          className="envelope-trends"
          aria-labelledby={`${unique}-trends`}
        >
          <h3 id={`${unique}-trends`}>Tendance par catégorie</h3>
          <label className="envelope-field">
            Moyennes sur
            <select
              aria-label="Moyennes sur"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
            >
              <option value="3">3 derniers mois terminés</option>
              <option value="6">6 derniers mois terminés</option>
              <option value="12">12 derniers mois terminés</option>
            </select>
          </label>
          <p>
            {monthLabel(from)} à {monthLabel(to)} · {currency}. Seules les
            dépenses rattachées sont observées.
          </p>
          <LiveMessage
            message={
              trendLoading ? "Chargement des moyennes des enveloppes…" : ""
            }
            visible={false}
          />
          <LiveMessage message={trends.message} isError />
          {trends.status === "loading" && (
            <p aria-hidden="true">Chargement des moyennes…</p>
          )}
          {trends.status === "error" && (
            <button
              type="button"
              className="one-off-button"
              onClick={trends.reload}
            >
              Réessayer les moyennes
            </button>
          )}
          {trends.status === "success" && (
            <>
              {trends.data.length === 0 && (
                <p>
                  Aucun historique de catégorie disponible pour cette période.
                </p>
              )}
              <div className="envelope-grid">
                {trends.data.map((c) => (
                  <article className="envelope-card" key={c.id}>
                    <h4>{c.category?.name ?? "Sans catégorie"}</h4>
                    <EnvelopeStatistics
                      statistics={c.statistics}
                      currency={currency}
                    />
                  </article>
                ))}
              </div>
              {trends.meta?.hasNext && (
                <button
                  type="button"
                  className="one-off-button one-off-button--secondary"
                  disabled={trends.paging}
                  onClick={trends.loadMore}
                >
                  Afficher la suite des catégories d’enveloppes
                </button>
              )}
            </>
          )}
        </section>
      )}
      <p className="envelope-help">
        Pendant le mois, le budget reste réservé jusqu’à son montant prévu. À la
        clôture, le réalisé rattaché le remplace. Sans dépense rattachée, le
        prévu reste réservé. Le solde mensuel intègre ce rapprochement.
      </p>
    </section>
  );
};
