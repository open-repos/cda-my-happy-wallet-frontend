import { MutationMessage } from "../components/Notifications/MutationMessage";
import { ConfirmDialog } from "../components/Forms/ConfirmDialog";
import { ActionButton } from "../components/Actions/ActionButton";
import { useQuickAdd } from "../components/QuickAdd/QuickAddContext";
import { useSimulation } from "../components/Simulation/SimulationContext";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LiveMessage } from "../components/LiveMessage";
import { useAnnouncesLoading } from "../hooks/useAnnouncesLoading";
import addIcon from "../../assets/icons/add.svg";
import { OneOffOperationForm } from "../components/OneOffOperations/OneOffOperationForm";
import { OneOffOperationList } from "../components/OneOffOperations/OneOffOperationList";
import { useOneOffOperations } from "../hooks/useOneOffOperations";
import { useOperationTableQuery } from "../components/OneOffOperations/useOperationTableQuery";
import { useMediaQuery, WIDE_TABLE_QUERY } from "../hooks/useMediaQuery";
import {
  OPERATION_SORT_LABELS,
  countActiveFilters,
  mergeSearch,
  operationQueryParams,
  parseOperationQuery,
  sortAnnouncement,
} from "../utils/tableQuery";
import "../../css/Operations.css";
const MANAGED_PARAMS = [
  "sort",
  "order",
  "from",
  "to",
  "title",
  "categoryId",
  "type",
  "minAmount",
  "maxAmount",
];
function ListeOperations() {
  const [editedOperation, setEditedOperation] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  // Tri et filtres vivent dans l'URL (D3 de #359) : Retour, rechargement et
  // favori les retrouvent.
  const [search, setSearch] = useSearchParams();
  const searchText = search.toString();
  const query = useMemo(() => parseOperationQuery(searchText), [searchText]);
  const [sortMessage, setSortMessage] = useState("");
  const state = useOneOffOperations(query);
  const wide = useMediaQuery(WIDE_TABLE_QUERY);
  const changeQuery = (next) => {
    if (
      next.sort?.field !== query.sort?.field ||
      next.sort?.order !== query.sort?.order
    )
      setSortMessage(
        sortAnnouncement(
          next.sort,
          OPERATION_SORT_LABELS,
          "les plus récentes d’abord"
        )
      );
    setSearch(
      mergeSearch(searchText, MANAGED_PARAMS, operationQueryParams(next))
    );
  };
  const quickAdd = useQuickAdd(),
    simulation = useSimulation();
  useEffect(
    () => () => {
      simulation.setActiveForm((current) =>
        current === "operations" ? null : current
      );
    },
    [simulation.setActiveForm]
  );
  const [deleting, setDeleting] = useState(null);
  const returnId = useRef(null),
    keepRef = useRef(null),
    addRef = useRef(null);
  const restore = () =>
    requestAnimationFrame(() =>
      (document.getElementById(returnId.current) ?? addRef.current)?.focus()
    );
  useEffect(() => {
    if (deleting) keepRef.current?.focus();
  }, [deleting]);
  useEffect(() => {
    if (editedOperation || deleting || isFormOpen)
      simulation.setActiveForm("operations");
    else if (simulation.activeForm === "operations")
      simulation.setActiveForm(null);
  }, [editedOperation, deleting, isFormOpen]);
  const filtering = countActiveFilters(query.filters) > 0;
  const tableQuery = useOperationTableQuery({
    query,
    onChange: changeQuery,
    categories: state.categories,
    disabled:
      Boolean(editedOperation && !isFormOpen) ||
      state.mutationStatus === "loading",
    wide,
  });
  // Liste générale sans filtre ; une mutation ou la pagination garde la clé.
  const announcesLoading = useAnnouncesLoading(state.status, "operations");
  const openCreate = (event) => {
    if (quickAdd.available) {
      quickAdd.open("menu", null, event?.currentTarget);
      return;
    }
    setEditedOperation(null);
    setIsFormOpen(true);
  };
  const openEdit = (operation) => {
    returnId.current = `one-off-edit-${operation.id}`;
    setEditedOperation(operation);
    setIsFormOpen(false);
  };
  const closeForm = () => {
    if (state.mutationStatus !== "loading") {
      setIsFormOpen(false);
      setEditedOperation(null);
      restore();
    }
  };
  const save = async (operation) => {
    const succeeded = editedOperation
      ? await state.updateOperation(editedOperation.id, operation)
      : await state.createOperation(operation);
    if (succeeded) closeForm();
  };
  const remove = async () => {
    if (deleting && (await state.deleteOperation(deleting.id))) {
      setDeleting(null);
      simulation.setActiveForm(null);
      restore();
    }
  };
  return (
    <main className="operations-container">
      <header className="one-off-header">
        <div>
          <p className="one-off-eyebrow">Budget du quotidien</p>
          <h1>Ensemble des opérations effectuées</h1>
          <p>
            Retrouvez vos entrées et dépenses ponctuelles, des plus récentes aux
            plus anciennes.{" "}
            <Link className="one-off-header-link" to="/categories">
              Gérer les catégories
            </Link>
          </p>
        </div>
        <ActionButton
          action="add"
          ref={addRef}
          type="button"
          className="one-off-button"
          onClick={openCreate}
          disabled={state.status !== "success"}
        >
          Ajouter une opération
        </ActionButton>
      </header>
      <MutationMessage
        success={state.mutationStatus === "success"}
        message={state.message}
        isError={
          state.status === "error" ||
          state.mutationStatus === "error" ||
          state.pageStatus === "error" ||
          state.queryStatus === "error"
        }
        className="one-off-message"
        errorClassName="one-off-message--error"
      />
      {/* Chargement annoncé par une région live toujours montée (#164). */}
      <LiveMessage
        message={announcesLoading ? "Chargement des opérations…" : ""}
        visible={false}
      />
      {state.status === "loading" && (
        <section className="one-off-state">
          <span className="one-off-loader" aria-hidden="true" />
          <h2 aria-hidden="true">Chargement des opérations…</h2>
        </section>
      )}
      {state.status === "error" && (
        <section className="one-off-state">
          <h2>La liste est momentanément indisponible</h2>
          <p>Vos données restent inchangées.</p>
          <button
            type="button"
            className="one-off-button"
            onClick={state.retry}
          >
            Réessayer
          </button>
        </section>
      )}
      <LiveMessage visible={false} message={sortMessage} />
      {state.status === "success" &&
        state.operations.length === 0 &&
        !filtering && (
          <section className="one-off-state one-off-state--empty">
            <h2>Pas encore d’opération</h2>
            <p>
              Ajoutez votre première entrée ou dépense pour commencer à suivre
              votre budget.
            </p>
            <ActionButton
              action="add"
              type="button"
              className="one-off-button"
              onClick={openCreate}
            >
              Ajouter ma première opération
            </ActionButton>
          </section>
        )}
      {state.status === "success" &&
        (state.operations.length > 0 || filtering) && (
          <section
            className="one-off-list-section"
            aria-labelledby="operations-list-title"
          >
            <div className="one-off-list-section__heading">
              <h2 id="operations-list-title">Vos opérations</h2>
              <span>
                {state.operations.length} affichée
                {state.operations.length > 1 ? "s" : ""}
              </span>
            </div>
            <OneOffOperationList
              operations={state.operations}
              categories={state.categories}
              onEdit={openEdit}
              editingId={isFormOpen ? null : editedOperation?.id}
              onMoreOptions={(draft) => {
                // The full form continues the row draft of the same operation.
                setEditedOperation(draft);
                setIsFormOpen(true);
              }}
              onCancel={closeForm}
              onSave={save}
              busy={state.mutationStatus === "loading" || Boolean(deleting)}
              mutationError={
                state.mutationStatus === "error" ? state.message : ""
              }
              sortHeaders={tableQuery.sortHeaders}
              filters={tableQuery.filters}
              toolbar={tableQuery.toolbar}
              refreshing={state.queryStatus === "loading"}
              onDelete={(operation) => {
                returnId.current = `one-off-edit-${operation.id}`;
                setDeleting(operation);
              }}
            />
            {state.meta?.hasNext && (
              <button
                type="button"
                className="one-off-button one-off-button--secondary one-off-load-more"
                onClick={state.loadMore}
                disabled={
                  state.pageStatus === "loading" ||
                  state.queryStatus === "loading"
                }
              >
                {state.pageStatus === "loading"
                  ? "Chargement…"
                  : "Afficher la suite"}
              </button>
            )}
            {state.pageStatus === "error" && (
              <button
                type="button"
                className="one-off-link-button"
                onClick={state.loadMore}
              >
                Réessayer de charger la suite
              </button>
            )}
          </section>
        )}
      {state.refreshError && state.status === "success" && (
        <button
          type="button"
          className="one-off-button one-off-button--secondary"
          onClick={state.retry}
        >
          Réessayer l’actualisation
        </button>
      )}
      {deleting && (
        <ConfirmDialog
          label={`Supprimer « ${deleting.title} » ?`}
          busy={state.mutationStatus === "loading"}
          error={state.mutationStatus === "error" ? state.message : ""}
          onCancel={() => {
            setDeleting(null);
            restore();
          }}
        >
          <fieldset
            className="one-off-delete-confirmation"
            disabled={state.mutationStatus === "loading"}
          >
            <legend>Supprimer « {deleting.title} » ?</legend>
            <ActionButton
              action="cancel"
              ref={keepRef}
              type="button"
              className="one-off-button one-off-button--secondary"
              onClick={() => {
                setDeleting(null);
                restore();
              }}
            >
              Annuler
            </ActionButton>
            <ActionButton
              action="delete"
              type="button"
              className="one-off-button one-off-button--danger"
              onClick={remove}
            >
              Oui, supprimer
            </ActionButton>
          </fieldset>
        </ConfirmDialog>
      )}
      {isFormOpen && (
        <OneOffOperationForm
          key={editedOperation?.id || "new"}
          categories={state.categories}
          operation={editedOperation}
          isSaving={state.mutationStatus === "loading"}
          onCancel={closeForm}
          onSave={save}
          onDelete={remove}
        />
      )}
    </main>
  );
}
export default ListeOperations;
