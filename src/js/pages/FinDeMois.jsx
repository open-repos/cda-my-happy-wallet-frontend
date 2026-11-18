import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/Actions/Button";
import { LiveMessage } from "../components/LiveMessage";
import {
  DecisionForm,
  decisionAccounts,
} from "../components/MonthEnd/DecisionForm";
import {
  DecisionCalculation,
  accountLabel,
} from "../components/MonthEnd/DecisionCalculation";
import { useMonthEnd } from "../components/MonthEnd/MonthEndContext";
import { ReviewNotice } from "../components/MonthEnd/ReviewNotice";
import { useMonthEndDecision } from "../hooks/useMonthEndDecision";
import { useAnnouncesLoading } from "../hooks/useAnnouncesLoading";
import { savingsMoney } from "../components/Savings/savingsFormat";
import {
  monthLabel,
  monthName,
} from "../components/BudgetCalendar/budgetFormat";
import {
  canKeepDecision,
  carryBeforeCorrection,
  previewCarry,
  previousParisMonth,
  shiftMonth,
} from "../utils/monthEnd";
import "../../css/MonthEnd.css";

/** « d’octobre 2026 » ou « de mai 2026 ». */
const ofLabel = (month) => {
  const label = monthLabel(month);
  return /^[aeiouy]/i.test(label) ? `d’${label}` : `de ${label}`;
};
const capitalized = (text) => `${text[0].toUpperCase()}${text.slice(1)}`;
const isMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");
const planOf = (decision) => ({
  savings: decision.savings,
  coverage: decision.coverage,
  exceptionalIncomeMinorUnits: decision.exceptionalIncomeMinorUnits,
});

const DecidedView = ({ decision, accounts, onEdit, onKeep, busy }) => {
  const deficit = decision.resultBeforeDecisionMinorUnits < 0;
  const plan = planOf(decision);
  const money = (value, signed) =>
    savingsMoney(value, decision.currency, signed);
  const carry = previewCarry(decision.resultBeforeDecisionMinorUnits, plan);
  const next = monthName(shiftMonth(decision.month, 1));
  const rows = deficit
    ? [
        ...decision.coverage.map((row) => [
          `Prélèvement sur ${accountLabel(accounts, row.accountId)}`,
          "Retrait vers le compte courant",
          row.amountMinorUnits,
        ]),
        ...(decision.exceptionalIncomeMinorUnits > 0
          ? [
              [
                "Entrée exceptionnelle",
                "Catégorie « Entrée exceptionnelle » des Analyses",
                decision.exceptionalIncomeMinorUnits,
              ],
            ]
          : []),
      ]
    : decision.savings.map((row) => [
        `Épargne sur ${accountLabel(accounts, row.accountId)}`,
        "Virement depuis le compte courant",
        -row.amountMinorUnits,
      ]);
  return (
    <>
      {decision.requiresReview && (
        <ReviewNotice decision={decision} titleId="month-end-review-title">
          {!canKeepDecision(decision) && (
            <p>
              Cette répartition ne correspond plus au nouveau solde : modifiez
              la décision pour l’ajuster.
            </p>
          )}
          <div className="month-end-actions month-end-actions--start">
            {canKeepDecision(decision) && (
              <Button variant="primary" onClick={onKeep} busy={busy}>
                Garder ma décision
              </Button>
            )}
            <Button onClick={onEdit} disabled={busy}>
              Modifier la décision
            </Button>
          </div>
        </ReviewNotice>
      )}
      <div className="month-end-layout">
        <section
          className="month-end-panel"
          aria-labelledby="month-end-split-title"
        >
          <h2 id="month-end-split-title">
            {deficit ? "Couverture du déficit" : "Répartition du solde"}
          </h2>
          {rows.length === 0 ? (
            <p>Aucun virement : tout le solde est reporté.</p>
          ) : (
            <ul className="month-end-lines">
              {rows.map(([title, detail, amount]) => (
                <li key={title}>
                  <div>
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </div>
                  <strong>{money(amount, true)}</strong>
                </li>
              ))}
            </ul>
          )}
          <div className="month-end-actions month-end-actions--start">
            <Button variant="primary" onClick={onEdit} disabled={busy}>
              Modifier la décision
            </Button>
            <Link
              className="month-end-button-link"
              to={`/calendrier?mois=${decision.month}`}
            >
              Voir le résumé {ofLabel(decision.month)}
            </Link>
            <Link className="month-end-button-link" to="/coffre">
              Voir le Coffre
            </Link>
          </div>
        </section>
        <aside
          className="month-end-panel"
          aria-labelledby="month-end-calc-title"
        >
          <h2 id="month-end-calc-title">Calcul du report</h2>
          <DecisionCalculation
            decision={decision}
            plan={plan}
            accounts={accounts}
            previousCarry={
              decision.requiresReview ? carryBeforeCorrection(decision) : null
            }
          />
          <p className="month-end-help">
            {carry < 0
              ? `Le déficit restant (${money(
                  carry
                )}) réduit le reste à vivre de ${next}.`
              : `Les ${money(
                  carry
                )} reportés s’ajoutent au reste à vivre de ${next}.`}
          </p>
        </aside>
      </div>
    </>
  );
};

const FinDeMois = () => {
  const { month } = useParams();
  const navigate = useNavigate();
  const context = useMonthEnd();
  const closed = isMonth(month) && month <= previousParisMonth();
  const { decision, accounts, mutation, save } = useMonthEndDecision(
    closed ? month : previousParisMonth()
  );
  const [editing, setEditing] = useState(false);
  const heading = useRef(null);
  const announce = useAnnouncesLoading(decision.status, `month-end:${month}`);
  const data = decision.data;
  const ready =
    decision.status === "success" && accounts.status === "success" && data;
  const showForm = ready && (data.status === "PENDING" || editing);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [showForm]);

  if (!closed)
    return (
      <main className="month-end-page">
        <PageHeader eyebrow="Fin de mois" title="Décision de fin de mois" />
        <p className="month-end-state">
          {isMonth(month)
            ? `${capitalized(
                monthLabel(month)
              )} n’est pas encore terminé. La décision sur son solde sera proposée le premier jour du mois suivant.`
            : "Ce mois n’existe pas."}
        </p>
        <Link to="/home">Retour à l’accueil</Link>
      </main>
    );

  const usable = ready ? decisionAccounts(accounts.data, data) : [];
  const success = (plan) => {
    const carry = previewCarry(data.resultBeforeDecisionMinorUnits, plan);
    return `Décision ${ofLabel(month)} enregistrée. ${
      carry < 0 ? "Déficit reporté" : "Report"
    } : ${savingsMoney(carry, data.currency)}.`;
  };
  const submit = async (plan) => {
    const result = await save(plan, data.revision, success(plan));
    if (result.ok) {
      setEditing(false);
      context?.decision.reload();
    }
  };

  return (
    <main className="month-end-page">
      <Link className="month-end-back" to="/home">
        ← Retour à l’accueil
      </Link>
      <header className="month-end-header">
        <div>
          <p className="atelier-eyebrow">Fin de mois</p>
          <h1 ref={heading} tabIndex={-1}>
            {showForm && data.status === "DECIDED"
              ? `Modifier la décision ${ofLabel(month)}`
              : data?.status === "DECIDED"
              ? `Décision ${ofLabel(month)}`
              : `Décider du solde ${ofLabel(month)}`}
          </h1>
          <p>
            {data?.status === "DECIDED"
              ? `Révision ${
                  data.revision
                }. La décision reste modifiable ; ${monthName(
                  shiftMonth(month, 1)
                )} et les mois suivants sont recalculés.`
              : "Tant que vous ne décidez pas, tout le solde reste reporté sur le mois suivant."}
          </p>
        </div>
        {data && (
          <span
            className={`month-end-tag month-end-tag--${
              data.requiresReview
                ? "warning"
                : data.status === "DECIDED"
                ? "ok"
                : "pending"
            }`}
          >
            {data.requiresReview
              ? "! À revoir"
              : data.status === "DECIDED"
              ? "✓ Décidée"
              : "⏳ En attente de décision"}
          </span>
        )}
      </header>
      <LiveMessage
        message={
          announce
            ? "Chargement de la décision…"
            : decision.status === "error"
            ? decision.message
            : accounts.status === "error"
            ? accounts.message
            : ""
        }
        isError={decision.status === "error" || accounts.status === "error"}
      />
      {(decision.status === "error" || accounts.status === "error") && (
        <div className="month-end-state">
          <p>Vos données n’ont pas été modifiées.</p>
          <Button
            onClick={() => {
              decision.reload();
              accounts.reload();
            }}
          >
            Réessayer
          </Button>
        </div>
      )}
      {!ready && decision.status !== "error" && accounts.status !== "error" && (
        <p className="month-end-state">Chargement de la décision…</p>
      )}
      {ready &&
        data.resultBeforeDecisionMinorUnits === 0 &&
        data.status === "PENDING" && (
          <p className="month-end-state">
            {capitalized(monthLabel(month))} se termine à l’équilibre : il n’y a
            rien à reporter ni à épargner.
          </p>
        )}
      {ready &&
        showForm &&
        (data.resultBeforeDecisionMinorUnits !== 0 ||
          data.status === "DECIDED") && (
          <>
            {data.requiresReview && (
              <ReviewNotice decision={data} titleId="month-end-review-title" />
            )}
            <DecisionForm
              key={`${data.revision}:${editing}`}
              decision={data}
              accounts={usable}
              editing={data.status === "DECIDED"}
              busy={mutation.busy}
              serverMessage={mutation.error ? mutation.message : ""}
              serverError={mutation.error}
              onSubmit={submit}
              onCancel={() => {
                mutation.clear();
                if (data.status === "DECIDED") setEditing(false);
                else {
                  context?.postpone();
                  navigate("/home");
                }
              }}
            />
          </>
        )}
      {ready && !showForm && (
        <>
          <LiveMessage message={mutation.message} isError={mutation.error} />
          <DecidedView
            decision={data}
            accounts={accounts.data}
            busy={mutation.busy}
            onEdit={() => {
              mutation.clear();
              setEditing(true);
            }}
            onKeep={() => submit(planOf(data))}
          />
        </>
      )}
    </main>
  );
};

export default FinDeMois;
