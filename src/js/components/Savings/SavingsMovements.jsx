import React, { useEffect, useId, useRef } from "react";
import { useSavingsPage } from "../../hooks/useSavings";
import { LiveMessage } from "../LiveMessage";
import { Button } from "../Actions/Button";
import { useAnnouncesLoading } from "../../hooks/useAnnouncesLoading";
import { savingsMoney } from "./savingsFormat";
import { longDate } from "../BudgetCalendar/budgetFormat";

const reasons = {
  MANUAL: "Virement manuel",
  GOAL: "Versement mensuel",
  MONTH_END: "Versement de fin de mois",
  NEGATIVE_COVERAGE: "Couverture du budget",
};
export const SavingsMovements = ({
  accountId,
  month,
  currency,
  focusOnOpen = false,
}) => {
  const titleId = useId();
  const title = useRef(null);
  useEffect(() => {
    if (focusOnOpen) title.current?.focus({ preventScroll: true });
  }, [focusOnOpen]);
  const current = accountId === "current";
  const list = useSavingsPage(
    current ? "currentMovements" : "movements",
    current ? { month, currency } : { accountId }
  );
  const announce = useAnnouncesLoading(list.status, list.loadingKey);
  return (
    <section
      className="savings-panel"
      aria-labelledby={titleId}
      aria-busy={list.status === "loading" || list.paging}
    >
      <h2 id={titleId} ref={title} tabIndex={focusOnOpen ? -1 : undefined}>
        Mouvements
      </h2>
      <LiveMessage
        message={
          list.message ||
          (announce
            ? "Chargement des mouvements…"
            : list.paging
            ? "Chargement de la suite des mouvements…"
            : "")
        }
        isError={Boolean(list.message)}
      />
      {list.status === "error" && (
        <Button onClick={list.reload}>Réessayer les mouvements</Button>
      )}
      {list.status === "success" && (
        <>
          {list.data.length === 0 ? (
            <p>Aucun mouvement sur cette période.</p>
          ) : (
            <ul className="savings-movements">
              {list.data.map((row) => {
                const signed = current
                  ? row.signedAmountMinorUnits
                  : row.direction === "TO_SAVINGS"
                  ? row.amountMinorUnits
                  : -row.amountMinorUnits;
                return (
                  <li key={`${row.source || ""}:${row.id}`}>
                    <div>
                      <strong>
                        {current ? row.title : reasons[row.reason]}
                      </strong>
                      <span>
                        {current
                          ? row.kind === "VIREMENT"
                            ? "Virement"
                            : row.kind === "ENTREE"
                            ? "Entrée"
                            : "Dépense"
                          : row.direction === "TO_SAVINGS"
                          ? "Dépôt"
                          : "Retrait"}{" "}
                        ·{" "}
                        <time dateTime={row.operationDate}>
                          {longDate(row.operationDate)}
                        </time>
                      </span>
                    </div>
                    <strong>{savingsMoney(signed, row.currency, true)}</strong>
                  </li>
                );
              })}
            </ul>
          )}
          {list.meta?.hasNext && (
            <Button onClick={list.loadMore} busy={list.paging}>
              Afficher plus de mouvements
            </Button>
          )}
        </>
      )}
    </section>
  );
};
