import React, { useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../Actions/Button";
import { LiveMessage } from "../LiveMessage";
import { savingsMoney } from "../Savings/savingsFormat";
import { monthName, ofMonth } from "../BudgetCalendar/budgetFormat";
import { DecisionCalculation } from "./DecisionCalculation";
import {
  buildDecisionPlan,
  draftFromDecision,
  previewCarry,
  shiftMonth,
} from "../../utils/monthEnd";

const SURPLUS_CHOICES = [
  [
    "carry",
    "Tout reporter",
    (amount, next) => `Les ${amount} s’ajoutent à ${next}.`,
  ],
  ["all", "Tout épargner", () => "Sur un ou plusieurs comptes du Coffre."],
  ["split", "Répartir", () => "Une partie en épargne, le reste reporté."],
];
const DEFICIT_CHOICES = [
  [
    "carry",
    "Tout reporter",
    (amount, next) => `Le déficit réduit le reste à vivre de ${next}.`,
  ],
  [
    "cover",
    "Couvrir tout ou partie",
    () =>
      "Avec votre épargne et/ou une entrée exceptionnelle. Le reste est reporté.",
  ],
];

/**
 * Comptes proposés : comptes actifs dans la devise du budget, plus les
 * comptes archivés qui portent déjà une allocation (conservable ou réductible).
 */
export const decisionAccounts = (accounts, decision) => {
  const allocated = new Set(
    [...decision.savings, ...decision.coverage].map((row) => row.accountId)
  );
  return accounts.filter(
    (account) =>
      account.currency === decision.currency &&
      (!account.archived || allocated.has(account.id))
  );
};

export const DecisionForm = ({
  decision,
  accounts,
  editing,
  busy,
  serverMessage,
  serverError,
  onSubmit,
  onCancel,
}) => {
  const ids = useId();
  const errorBox = useRef(null);
  const result = decision.resultBeforeDecisionMinorUnits;
  const deficit = result < 0;
  const currency = decision.currency;
  const next = monthName(shiftMonth(decision.month, 1));
  const [draft, setDraft] = useState(() =>
    editing
      ? draftFromDecision(decision)
      : { mode: "carry", amounts: {}, exceptional: "" }
  );
  const [showErrors, setShowErrors] = useState(false);
  const built = buildDecisionPlan({
    result,
    draft,
    accounts,
    decision: editing ? decision : null,
    currency,
  });
  const choices = deficit ? DEFICIT_CHOICES : SURPLUS_CHOICES;
  const setAmount = (key, value) =>
    setDraft((current) =>
      key === "exceptional"
        ? { ...current, exceptional: value }
        : { ...current, amounts: { ...current.amounts, [key]: value } }
    );
  const fillRest = (accountId) => {
    const others = built.plan.savings
      .filter((row) => row.accountId !== accountId)
      .reduce((sum, row) => sum + row.amountMinorUnits, 0);
    const rest = Math.max(0, result - others);
    setAmount(accountId, (rest / 100).toFixed(2).replace(".", ","));
  };
  const submit = (event) => {
    event.preventDefault();
    setShowErrors(true);
    if (built.errors.length) {
      const field = Object.keys(built.fieldErrors)[0];
      const target = field
        ? document.getElementById(`${ids}-${field}`)
        : errorBox.current;
      requestAnimationFrame(() => target?.focus());
      return;
    }
    onSubmit(built.plan);
  };
  const fieldError = (key) => (showErrors ? built.fieldErrors[key] : null);
  const amountField = (key, label, hint, archived = false) => {
    const error = fieldError(key);
    const value =
      key === "exceptional" ? draft.exceptional : draft.amounts[key];
    return (
      <div
        className={`month-end-field${error ? " month-end-field--invalid" : ""}`}
        key={key}
      >
        <label htmlFor={`${ids}-${key}`}>
          {label}
          {hint && <span className="month-end-field__hint">{hint}</span>}
        </label>
        <div className="month-end-money">
          <input
            id={`${ids}-${key}`}
            inputMode="decimal"
            autoComplete="off"
            value={value ?? ""}
            disabled={busy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${ids}-${key}-error` : undefined}
            onChange={(event) => setAmount(key, event.target.value)}
          />
          <span aria-hidden="true">€</span>
        </div>
        {error && (
          <p className="month-end-field__error" id={`${ids}-${key}-error`}>
            {error}
          </p>
        )}
        {!deficit && key !== "exceptional" && !archived && (
          <button
            type="button"
            className="month-end-link"
            disabled={busy}
            onClick={() => fillRest(Number(key))}
          >
            Mettre le reste sur ce compte
          </button>
        )}
      </div>
    );
  };
  return (
    <div className="month-end-layout">
      <form className="month-end-panel" onSubmit={submit} noValidate>
        <div className="month-end-balance">
          <div>
            <p className="month-end-balance__label">
              {deficit ? "Déficit" : "Disponible"} fin{" "}
              {monthName(decision.month)}
            </p>
            <p className="month-end-balance__value">
              {savingsMoney(result, currency)}
            </p>
            <p className="month-end-balance__hint">
              Report du mois précédent inclus.
            </p>
          </div>
          <span className="month-end-tag">
            <span aria-hidden="true">{deficit ? "▼" : "▲"}</span>{" "}
            {deficit ? "Déficit" : "Excédent"}
          </span>
        </div>
        <fieldset className="month-end-choices" disabled={busy}>
          <legend>
            {deficit ? "Que faire du déficit ?" : "Que faire de ce solde ?"}
          </legend>
          {choices.map(([value, label, describe]) => (
            <label className="month-end-choice" key={value}>
              <input
                type="radio"
                name={`${ids}-mode`}
                value={value}
                checked={draft.mode === value}
                onChange={() =>
                  setDraft((current) => ({ ...current, mode: value }))
                }
              />
              <strong>{label}</strong>
              <span>
                {describe(savingsMoney(Math.abs(result), currency), next)}
              </span>
            </label>
          ))}
        </fieldset>
        {draft.mode !== "carry" && (
          <>
            <section className="month-end-section">
              <h3>
                {deficit ? "Prélèvements d’épargne" : "Comptes du Coffre"}
              </h3>
              <p>
                {deficit
                  ? `Un retrait vers le compte courant, daté du dernier jour ${ofMonth(
                      decision.month
                    )}. Il n’est pas compté comme un revenu dans les Analyses.`
                  : `Un virement du compte courant vers chaque compte, daté du dernier jour ${ofMonth(
                      decision.month
                    )}. Il fait progresser l’objectif rattaché et n’est pas une dépense dans les Analyses.`}
              </p>
              {accounts.length === 0 ? (
                <p>
                  Aucun compte d’épargne dans cette devise.{" "}
                  <Link to="/coffre">Créer un compte dans le Coffre</Link>
                </p>
              ) : (
                accounts.map((account) =>
                  amountField(
                    account.id,
                    `${deficit ? "Prélever sur" : "Épargner sur"} ${
                      account.name
                    }`,
                    `Solde ${savingsMoney(
                      account.balanceMinorUnits,
                      account.currency
                    )}${account.archived ? " · compte archivé" : ""}`,
                    account.archived
                  )
                )
              )}
            </section>
            {deficit && (
              <section className="month-end-section">
                <h3>Entrée exceptionnelle</h3>
                <p>
                  Aide extérieure, remboursement… Elle appartient à{" "}
                  {monthName(decision.month)} et apparaît dans les Analyses dans
                  la catégorie « Entrée exceptionnelle », hors revenus
                  habituels.
                </p>
                {amountField(
                  "exceptional",
                  `Montant reçu pour couvrir ${monthName(decision.month)}`,
                  "Laissez vide si aucune"
                )}
              </section>
            )}
          </>
        )}
        {showErrors && built.errors.length > 0 && (
          <div
            className="month-end-errors"
            role="alert"
            tabIndex={-1}
            ref={errorBox}
          >
            <p>La décision n’a pas été enregistrée :</p>
            <ul>
              {built.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        <LiveMessage message={serverMessage} isError={serverError} />
        <p className="month-end-note">
          Besoin d’un virement à une autre date ?{" "}
          <Link to="/coffre">Faire un virement manuel dans le Coffre</Link>
        </p>
        <div className="month-end-actions">
          <Button onClick={onCancel} disabled={busy}>
            {editing ? "Annuler" : "Plus tard"}
          </Button>
          <Button type="submit" variant="primary" busy={busy}>
            Valider la décision
          </Button>
        </div>
      </form>
      <aside
        className="month-end-panel month-end-preview"
        aria-labelledby={`${ids}-preview`}
      >
        <h3 id={`${ids}-preview`}>Votre décision</h3>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {built.errors.length === 0 &&
            `Aperçu : ${
              previewCarry(result, built.plan) < 0
                ? "déficit reporté"
                : "report"
            } ${savingsMoney(previewCarry(result, built.plan), currency)}.`}
        </p>
        <div>
          <DecisionCalculation
            decision={decision}
            plan={built.plan}
            accounts={accounts}
            preview
            previousCarry={editing ? decision.carryMinorUnits : null}
          />
        </div>
        <p className="month-end-help">
          Report = solde disponible − épargne + prélèvements d’épargne + entrée
          exceptionnelle. Aperçu indicatif : le montant définitif est confirmé
          après validation.
        </p>
      </aside>
    </div>
  );
};
