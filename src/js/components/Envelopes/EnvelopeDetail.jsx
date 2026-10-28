import React, { useEffect, useRef, useState } from "react";
import {
  envelopesService,
  envelopeErrorMessage,
} from "../../services/envelopesService";
import { useEnvelopePage } from "../../hooks/useEnvelopePage";
import { useAnnouncesLoading } from "../../hooks/useAnnouncesLoading";
import { useSimulation } from "../Simulation/SimulationContext";
import { useQuickAdd } from "../QuickAdd/QuickAddContext";
import { LiveMessage } from "../LiveMessage";
import { EnvelopeMetrics } from "./EnvelopeMetrics";
import { OneOffOperationForm } from "../OneOffOperations/OneOffOperationForm";
import { oneOffOperationsService } from "../../services/oneOffOperationsService";
import {
  formatMoney,
  monthLabel,
  longDate,
} from "../BudgetCalendar/budgetFormat";
import { isAcknowledgedWrite } from "../../utils/acknowledgedWrite";

export const EnvelopeDetail = ({ occurrenceId, onClose }) => {
  const simulation = useSimulation(),
    quickAdd = useQuickAdd();
  const [occurrence, setOccurrence] = useState(null),
    [status, setStatus] = useState("loading"),
    [retry, setRetry] = useState(0);
  const [eligible, setEligible] = useState(false),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState({ text: "", error: false });
  const [pending, setPending] = useState(null),
    [edited, setEdited] = useState(null),
    [categories, setCategories] = useState(null),
    [categoryError, setCategoryError] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const title = useRef(null),
    locked = useRef(false);
  const payments = useEnvelopePage("payments", {
    occurrenceId,
    unassociated: eligible,
  });
  const loading = useAnnouncesLoading(payments.status, payments.loadingKey);
  useEffect(() => {
    title.current?.focus();
  }, []);
  useEffect(() => {
    let alive = true;
    setStatus("loading");
    envelopesService
      .occurrence(occurrenceId)
      .then((o) => {
        if (alive) {
          setOccurrence(o);
          setStatus("success");
        }
      })
      .catch((e) => {
        if (alive) {
          setStatus("error");
          setMessage({ text: envelopeErrorMessage(e), error: true });
        }
      });
    return () => {
      alive = false;
    };
  }, [occurrenceId, retry, simulation.revision]);
  useEffect(() => {
    if (!edited) {
      setCategories(null);
      return;
    }
    let alive = true;
    setCategoryError(false);
    oneOffOperationsService
      .listAllCategories()
      .then((rows) => {
        if (alive) setCategories(rows);
      })
      .catch(() => {
        if (alive) setCategoryError(true);
      });
    return () => {
      alive = false;
    };
  }, [edited, retry]);
  useEffect(() => {
    if (edited) simulation.setActiveForm("envelope-edit");
    return () => {
      if (edited)
        simulation.setActiveForm((current) =>
          current === "envelope-edit" ? null : current
        );
    };
  }, [edited, simulation.setActiveForm]);
  const busy = simulation.mutationStatus === "loading";
  const mutable = status === "success" && !occurrence.closed;
  const mutate = async (action, text) => {
    if (locked.current) return false;
    locked.current = true;
    setMessage({ text: "", error: false });
    try {
      try {
        await action();
      } catch (e) {
        if (!isAcknowledgedWrite(e)) throw e;
      }
      simulation.invalidate();
      setMessage({ text, error: false });
      return true;
    } catch (e) {
      setMessage({
        text: envelopeErrorMessage(
          e,
          "La modification n’a pas pu être enregistrée. Actualisez avant de réessayer."
        ),
        error: true,
      });
      return false;
    } finally {
      locked.current = false;
      setPending(null);
    }
  };
  const save = async (body) => {
    setPending("edit");
    if (
      await mutate(
        () => oneOffOperationsService.updateOperation(edited.id, body),
        "Opération modifiée."
      )
    )
      setEdited(null);
  };
  const setLink = async (row, associate) => {
    setPending(row.id);
    await mutate(
      () =>
        envelopesService.setLink(
          row.id,
          associate ? occurrenceId : null,
          associate ? null : occurrenceId
        ),
      associate
        ? "Dépense associée à l’enveloppe."
        : "Dépense dissociée et conservée dans les opérations."
    );
  };
  const add = (e) => {
    if (quickAdd.available)
      quickAdd.open("expense", `${occurrence.month}-01`, e.currentTarget, {
        currency: occurrence.currency,
        categoryId: occurrence.categoryId,
        envelopeId: occurrence.id,
      });
  };
  return (
    <section className="envelope-detail" aria-label="Détail de l’enveloppe">
      <button
        type="button"
        className="one-off-button one-off-button--secondary"
        onClick={onClose}
        disabled={Boolean(pending)}
      >
        Retour aux enveloppes
      </button>
      <h3 ref={title} tabIndex={-1}>
        {occurrence?.title ?? "Enveloppe"}
        {occurrence ? ` · ${monthLabel(occurrence.month)}` : ""}
      </h3>
      <LiveMessage message={message.text} isError={message.error} />
      <LiveMessage
        message={loading ? "Chargement des dépenses rattachées…" : ""}
        visible={false}
      />
      {status === "error" && (
        <button
          type="button"
          className="one-off-button"
          onClick={() => setRetry((v) => v + 1)}
        >
          Réessayer l’enveloppe
        </button>
      )}
      {status === "loading" && <p>Chargement de l’enveloppe…</p>}
      {occurrence && (
        <>
          <EnvelopeMetrics
            metrics={occurrence.metrics}
            currency={occurrence.currency}
          />
          {occurrence.closed ? (
            <p>
              Mois clôturé : consultation seule, les rattachements sont
              protégés.
            </p>
          ) : (
            <div className="envelope-actions">
              {quickAdd.available && (
                <button
                  type="button"
                  className="one-off-button"
                  disabled={
                    !mutable ||
                    Boolean(pending) ||
                    busy ||
                    Boolean(simulation.activeForm)
                  }
                  onClick={add}
                >
                  Ajouter une dépense
                </button>
              )}
              <button
                type="button"
                className="one-off-button one-off-button--secondary"
                disabled={!mutable || Boolean(pending)}
                onClick={() => {
                  setEligible((v) => !v);
                  setQuery("");
                }}
              >
                {eligible
                  ? "Voir les dépenses associées"
                  : "Associer une opération existante"}
              </button>
            </div>
          )}
          <p>
            {eligible
              ? "Opérations éligibles sans rattachement, du même mois et de la même devise."
              : `${occurrence.operationCount} opération(s) rattachée(s).`}
          </p>
        </>
      )}
      <label className="envelope-field">
        Rechercher dans les dépenses chargées
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={Boolean(pending)}
        />
      </label>
      <LiveMessage message={payments.message} isError />
      {payments.status === "error" && (
        <button
          type="button"
          className="one-off-button"
          onClick={payments.reload}
        >
          Réessayer les dépenses
        </button>
      )}
      {payments.status === "success" && (
        <>
          <ul className="envelope-payments">
            {payments.data
              .filter((p) =>
                p.title
                  .toLocaleLowerCase("fr")
                  .includes(query.toLocaleLowerCase("fr"))
              )
              .map((p) => (
                <li key={p.id}>
                  <div className="envelope-row">
                    <span>
                      {p.title}
                      <small>{longDate(p.operationDate)}</small>
                    </span>
                    <strong>{formatMoney(p.amount, p.currency)}</strong>
                  </div>
                  {mutable && (
                    <div className="envelope-actions">
                      <button
                        type="button"
                        className="one-off-button one-off-button--secondary"
                        disabled={Boolean(pending) || busy}
                        onClick={() => setLink(p, eligible)}
                      >
                        {eligible ? "Associer" : "Dissocier"}
                      </button>
                      {!eligible && (
                        <button
                          type="button"
                          className="one-off-button one-off-button--secondary"
                          disabled={
                            Boolean(pending) ||
                            busy ||
                            Boolean(simulation.activeForm)
                          }
                          onClick={() => setEdited(p)}
                        >
                          Modifier / réaffecter
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
          </ul>
          {!payments.data.some((p) =>
            p.title
              .toLocaleLowerCase("fr")
              .includes(query.toLocaleLowerCase("fr"))
          ) && <p>Aucune dépense parmi les éléments chargés.</p>}
          {payments.meta?.hasNext && (
            <button
              type="button"
              className="one-off-button one-off-button--secondary"
              onClick={payments.loadMore}
              disabled={payments.paging}
            >
              {payments.paging
                ? "Chargement…"
                : "Afficher la suite des dépenses"}
            </button>
          )}
        </>
      )}
      {edited && (
        <div>
          {categoryError && (
            <>
              <p>Les catégories n’ont pas pu être chargées.</p>
              <button
                type="button"
                className="one-off-button"
                onClick={() => setRetry((v) => v + 1)}
              >
                Réessayer les catégories
              </button>
            </>
          )}
          {!categories && !categoryError && <p>Chargement des catégories…</p>}
          {categories && (
            <OneOffOperationForm
              operation={edited}
              categories={categories}
              isSaving={Boolean(pending)}
              onSave={save}
              onCancel={() => setEdited(null)}
            />
          )}
          {!categories && (
            <button
              type="button"
              className="one-off-button one-off-button--secondary"
              onClick={() => setEdited(null)}
            >
              Annuler l’édition
            </button>
          )}
        </div>
      )}
      {mutable && !edited && (
        <div className="envelope-actions">
          <button
            type="button"
            className="one-off-button one-off-button--secondary"
            disabled={Boolean(pending) || occurrence.operationCount > 0}
            onClick={() => setArchiving(true)}
          >
            Archiver l’enveloppe
          </button>
          {occurrence.operationCount > 0 && (
            <p>
              Des dépenses sont rattachées. Pour changer les mois suivants,
              modifiez la charge avec un mois d’effet.
            </p>
          )}
        </div>
      )}
      {archiving && (
        <fieldset disabled={Boolean(pending)}>
          <legend>Archiver cette enveloppe ?</legend>
          <p>
            Sa définition sera désactivée. Les occurrences déjà suivies et leurs
            dépenses restent consultables.
          </p>
          <button
            type="button"
            className="one-off-button one-off-button--secondary"
            onClick={() => setArchiving(false)}
          >
            Conserver l’enveloppe
          </button>
          <button
            type="button"
            className="one-off-button"
            onClick={async () => {
              setPending("archive");
              if (
                await mutate(
                  () => envelopesService.archive(occurrence.sourceId),
                  "Enveloppe archivée."
                )
              )
                onClose();
            }}
          >
            Confirmer l’archivage
          </button>
        </fieldset>
      )}
    </section>
  );
};
