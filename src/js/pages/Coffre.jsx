import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/Actions/Button";
import { ConfirmDialog } from "../components/Forms/ConfirmDialog";
import { LiveMessage } from "../components/LiveMessage";
import { SavingsForm } from "../components/Savings/SavingsForm";
import { SavingsGoal } from "../components/Savings/SavingsGoal";
import { SavingsMovements } from "../components/Savings/SavingsMovements";
import {
  savingsMoney,
  savingsToday,
} from "../components/Savings/savingsFormat";
import { savingsService } from "../services/savingsService";
import { goalsService } from "../services/goalsService";
import {
  useSavingsPage,
  useSavingsRead,
  useSavingsMutation,
} from "../hooks/useSavings";
import { useAnnouncesLoading } from "../hooks/useAnnouncesLoading";
import { useRefreshViews } from "../hooks/useRefreshViews";
import { monthLabel } from "../components/BudgetCalendar/budgetFormat";
import "../../css/Savings.css";

const AccountDetail = ({ accountId, goals, onAction, onBack }) => {
  const read = useSavingsRead(
    () => savingsService.account({ accountId }),
    `account:${accountId}`
  );
  const account = read.data;
  const title = useRef(null),
    focused = useRef(false);
  const announce = useAnnouncesLoading(read.status, `account:${accountId}`);
  useEffect(() => {
    if (account && !focused.current) {
      title.current?.focus({ preventScroll: true });
      focused.current = true;
    }
  }, [account]);
  const goal = goals.find((item) => item.id === account?.goalId);
  return (
    <>
      <Button onClick={onBack}>← Retour au Coffre</Button>
      <LiveMessage
        message={read.message || (announce ? "Chargement du compte…" : "")}
        isError={read.status === "error"}
      />
      {read.status === "error" && (
        <Button onClick={read.reload}>Réessayer le compte</Button>
      )}
      {account && (
        <>
          <header className="savings-detail-head">
            <div>
              <p>
                Compte d’épargne · {account.currency} ·{" "}
                {account.archived ? "Archivé" : "Actif"}
              </p>
              <h2 tabIndex={-1} ref={title}>
                {account.name}
              </h2>
            </div>
            <strong>
              {savingsMoney(account.balanceMinorUnits, account.currency)}
            </strong>
          </header>
          {!account.archived ? (
            <div className="savings-actions">
              <Button
                variant="primary"
                onClick={() => onAction("deposit", account)}
              >
                ↓ Déposer
              </Button>
              <Button onClick={() => onAction("withdraw", account)}>
                ↑ Retirer
              </Button>
              <Button onClick={() => onAction("rename", account)}>
                Renommer
              </Button>
              <Button
                variant="danger"
                onClick={() => onAction("archive", account)}
              >
                Archiver
              </Button>
            </div>
          ) : (
            <p className="savings-notice">
              Compte archivé : le solde et l’historique restent consultables.
              Aucun nouveau virement n’est possible.
            </p>
          )}
          <div className="savings-detail-grid">
            <SavingsMovements accountId={account.id} />
            <aside className="savings-panel">
              <h2>Objectif rattaché</h2>
              {goal ? (
                <SavingsGoal goal={goal} />
              ) : account.goalId ? (
                <p>L’objectif n’est plus disponible. Actualisez les données.</p>
              ) : (
                <>
                  <p>Aucun objectif rattaché.</p>
                  {!account.archived && (
                    <Button onClick={() => onAction("link", account)}>
                      Rattacher un objectif
                    </Button>
                  )}
                </>
              )}
              <p>La progression suit le solde réel du compte.</p>
              <dl>
                <dt>Solde initial</dt>
                <dd>
                  {savingsMoney(
                    account.initialBalanceMinorUnits,
                    account.currency
                  )}
                </dd>
              </dl>
            </aside>
          </div>
        </>
      )}
    </>
  );
};

export default function Coffre() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("compte");
  const accountId =
    selected &&
    /^\d+$/.test(selected) &&
    Number.isSafeInteger(Number(selected)) &&
    Number(selected) > 0
      ? Number(selected)
      : null;
  const isCurrent = selected === "current";
  const [archived, setArchived] = useState(false);
  const [month, setMonth] = useState(() => savingsToday().slice(0, 7));
  const [currency, setCurrency] = useState("EUR");
  const [dialog, setDialog] = useState(null);
  const heading = useRef(null);
  const dialogTrigger = useRef(null),
    wasDialogOpen = useRef(false);
  useEffect(() => {
    const closed = wasDialogOpen.current && !dialog;
    wasDialogOpen.current = Boolean(dialog);
    if (!closed) return;
    // Restore after React commits the close and FormDialog removes root inertness.
    // Archiving can remove the original control before this commit.
    const trigger = dialogTrigger.current;
    const target =
      trigger?.isConnected && !trigger.disabled
        ? trigger
        : document.querySelector(".savings-detail-head h2") ?? heading.current;
    target?.focus({ preventScroll: true });
  }, [dialog]);
  const accounts = useSavingsPage("accounts", {});
  const overview = useSavingsRead(async () => {
    const [current, goals] = await Promise.all([
      savingsService.current({ month, currency }),
      goalsService.listAllGoals(),
    ]);
    return { current, goals };
  }, `overview:${month}:${currency}`);
  const refresh = useRefreshViews();
  const mutation = useSavingsMutation();
  const goals = overview.data?.goals ?? [];
  const current = overview.data?.current;
  const announce = useAnnouncesLoading(accounts.status, accounts.loadingKey);
  const open = (mode, account) => {
    dialogTrigger.current = document.activeElement;
    mutation.clear();
    setDialog({ mode, account });
  };
  const close = () => setDialog(null);
  const back = () => {
    setParams({});
    requestAnimationFrame(() => heading.current?.focus());
  };
  const visibleAccounts = accounts.data.filter(
    (account) => account.archived === archived
  );
  return (
    <main className="savings-page">
      <header className="atelier-page-header">
        <div>
          <p className="atelier-eyebrow">Mon épargne</p>
          <h1 ref={heading} tabIndex={-1}>
            Coffre
          </h1>
          <p>
            Retrouvez l’argent mis de côté et les objectifs qui comptent pour
            vous.
          </p>
        </div>
        <Button variant="primary" onClick={() => open("create")}>
          ＋ Nouveau compte
        </Button>
      </header>
      <LiveMessage message={mutation.message} isError={mutation.error} />
      {mutation.message && !mutation.error && (
        <Button onClick={refresh}>Actualiser les données</Button>
      )}
      <LiveMessage
        message={
          overview.message ||
          (overview.status === "loading" &&
          accounts.status === "loading" &&
          announce
            ? "Chargement du Coffre…"
            : "")
        }
        isError={overview.status === "error"}
      />
      {overview.status === "error" && (
        <Button onClick={overview.reload}>
          Réessayer le budget et les objectifs
        </Button>
      )}
      {accountId ? (
        <AccountDetail
          key={accountId}
          accountId={accountId}
          goals={goals}
          onAction={open}
          onBack={back}
        />
      ) : (
        <>
          {isCurrent && <Button onClick={back}>← Retour au Coffre</Button>}
          <div className="savings-filters">
            <label>
              Mois du compte courant
              <input
                type="month"
                value={month}
                max={savingsToday().slice(0, 7)}
                min="1970-01"
                onChange={(event) => {
                  if (
                    /^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value) &&
                    event.target.value <= savingsToday().slice(0, 7)
                  )
                    setMonth(event.target.value);
                }}
              />
            </label>
            <label>
              Devise du compte courant
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                {[
                  ...new Set([
                    "EUR",
                    "USD",
                    "GBP",
                    ...accounts.data.map((a) => a.currency),
                  ]),
                ].map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </label>
          </div>
          {current && (
            <article className="savings-current" aria-label="Budget disponible">
              <div>
                <p>Compte courant</p>
                <h2>Budget disponible · {monthLabel(current.month)}</h2>
                <p>
                  Calculé à partir du budget de l’application : base fixe,
                  report et mouvements réels.
                </p>
              </div>
              <strong>
                {savingsMoney(current.balanceMinorUnits, current.currency)}
              </strong>
              {!isCurrent && (
                <Button onClick={() => setParams({ compte: "current" })}>
                  Voir les mouvements
                </Button>
              )}
            </article>
          )}
          {isCurrent ? (
            <>
              {current && (
                <dl className="savings-budget savings-panel">
                  {[
                    ["Base fixe", "baseMinorUnits"],
                    ["Report", "carryInMinorUnits"],
                    ["Entrées réelles", "actualIncomeMinorUnits"],
                    ["Sorties réelles", "actualExpenseMinorUnits"],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>
                        {savingsMoney(current.budget[key], current.currency)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <SavingsMovements
                focusOnOpen
                key={`${month}:${currency}`}
                accountId="current"
                month={month}
                currency={currency}
              />
            </>
          ) : (
            <section
              aria-labelledby="savings-accounts-title"
              aria-busy={accounts.status === "loading" || accounts.paging}
            >
              <div className="savings-section-head">
                <h2 id="savings-accounts-title">Mes comptes d’épargne</h2>
                <div
                  className="savings-tabs"
                  role="group"
                  aria-label="Afficher les comptes"
                >
                  <Button
                    aria-pressed={!archived}
                    onClick={() => setArchived(false)}
                  >
                    Actifs
                  </Button>
                  <Button
                    aria-pressed={archived}
                    onClick={() => setArchived(true)}
                  >
                    Archivés
                  </Button>
                </div>
              </div>
              <LiveMessage
                message={
                  accounts.message ||
                  (announce
                    ? "Chargement des comptes…"
                    : accounts.paging
                    ? "Chargement de la suite des comptes…"
                    : "")
                }
                isError={Boolean(accounts.message)}
              />
              {accounts.status === "error" && (
                <Button onClick={accounts.reload}>Réessayer les comptes</Button>
              )}
              {(accounts.status === "success" || accounts.data.length > 0) && (
                <>
                  {!visibleAccounts.length && (
                    <div className="savings-panel">
                      <h3>
                        {archived
                          ? "Aucun compte archivé affiché"
                          : "Votre Coffre est prêt"}
                      </h3>
                      <p>
                        {accounts.meta?.hasNext
                          ? "D’autres comptes peuvent être présents dans la suite de la liste."
                          : archived
                          ? "Les comptes archivés resteront consultables ici."
                          : "Créez votre premier compte pour suivre votre épargne."}
                      </p>
                      {!archived && (
                        <Button onClick={() => open("create")}>
                          Créer un compte
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="savings-grid">
                    {visibleAccounts.map((account) => {
                      const goal = goals.find(
                        (item) => item.id === account.goalId
                      );
                      return (
                        <article
                          key={account.id}
                          className="savings-account"
                          aria-label={account.name}
                        >
                          <div className="savings-row">
                            <div>
                              <h3>{account.name}</h3>
                              <span>
                                {account.currency} ·{" "}
                                {account.archived ? "Archivé" : "Actif"}
                              </span>
                            </div>
                            <strong>
                              {savingsMoney(
                                account.balanceMinorUnits,
                                account.currency
                              )}
                            </strong>
                          </div>
                          {goal ? (
                            <SavingsGoal goal={goal} />
                          ) : account.goalId ? (
                            <p>
                              Objectif rattaché : actualisez les données pour
                              afficher sa progression.
                            </p>
                          ) : (
                            <div className="savings-goal">
                              <p>Aucun objectif rattaché.</p>
                              {!account.archived && (
                                <Button
                                  onClick={() => open("link", account)}
                                  disabled={overview.status !== "success"}
                                >
                                  Rattacher un objectif
                                </Button>
                              )}
                            </div>
                          )}
                          <div className="savings-card-actions">
                            {!account.archived && (
                              <>
                                <Button
                                  variant="primary"
                                  onClick={() => open("deposit", account)}
                                >
                                  ↓ Déposer
                                </Button>
                                <Button
                                  onClick={() => open("withdraw", account)}
                                >
                                  ↑ Retirer
                                </Button>
                              </>
                            )}
                            <Button
                              onClick={() =>
                                setParams({ compte: String(account.id) })
                              }
                            >
                              Voir le compte →
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {accounts.meta?.hasNext && (
                    <Button onClick={accounts.loadMore} busy={accounts.paging}>
                      Afficher plus de comptes
                    </Button>
                  )}
                </>
              )}
            </section>
          )}
        </>
      )}
      <p className="savings-notice">
        Les dépôts et retraits ajustent votre budget disponible. Ils restent
        séparés des dépenses et revenus des Analyses.
      </p>
      {dialog && dialog.mode !== "archive" && (
        <SavingsForm
          key={`${dialog.mode}:${dialog.account?.id ?? "new"}`}
          {...dialog}
          goals={goals}
          mutation={mutation}
          onClose={close}
        />
      )}
      {dialog?.mode === "archive" && (
        <ConfirmDialog
          label={`Archiver ${dialog.account.name}`}
          busy={mutation.busy}
          error={mutation.message}
          onCancel={close}
        >
          <h2>Archiver {dialog.account.name} ?</h2>
          <p>
            Son solde et son historique seront conservés. Vous ne pourrez plus
            effectuer de nouveaux virements sur ce compte.
          </p>
          <div className="savings-actions">
            <Button onClick={close} disabled={mutation.busy}>
              Conserver le compte
            </Button>
            <Button
              variant="danger"
              busy={mutation.busy}
              onClick={async () => {
                if (
                  (
                    await mutation.run(
                      () => savingsService.archive(dialog.account.id),
                      "Compte archivé."
                    )
                  ).ok
                )
                  close();
              }}
            >
              Confirmer l’archivage
            </Button>
          </div>
        </ConfirmDialog>
      )}
    </main>
  );
}
