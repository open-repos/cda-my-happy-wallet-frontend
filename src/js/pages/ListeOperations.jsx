import { useQuickAdd } from "../components/QuickAdd/QuickAddContext";
import { useSimulation } from "../components/Simulation/SimulationContext";
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LiveMessage } from "../components/LiveMessage";
import { useAnnouncesLoading } from "../hooks/useAnnouncesLoading";
import addIcon from "../../assets/icons/add.svg";
import { OneOffOperationForm } from "../components/OneOffOperations/OneOffOperationForm";
import { OneOffOperationList } from "../components/OneOffOperations/OneOffOperationList";
import { useOneOffOperations } from "../hooks/useOneOffOperations";
import "../../css/Operations.css";

function ListeOperations() {
  const [editedOperation, setEditedOperation] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const state = useOneOffOperations();
  const quickAdd = useQuickAdd(),
    simulation = useSimulation();
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
        <button
          ref={addRef}
          type="button"
          className="one-off-button"
          onClick={openCreate}
          disabled={state.status !== "success"}
        >
          <img src={addIcon} alt="" aria-hidden="true" />
          Ajouter une opération
        </button>
      </header>
      <LiveMessage
        message={state.message}
        isError={
          state.status === "error" ||
          state.mutationStatus === "error" ||
          state.pageStatus === "error"
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
      {state.status === "success" && state.operations.length === 0 && (
        <section className="one-off-state one-off-state--empty">
          <h2>Pas encore d’opération</h2>
          <p>
            Ajoutez votre première entrée ou dépense pour commencer à suivre
            votre budget.
          </p>
          <button type="button" className="one-off-button" onClick={openCreate}>
            Ajouter ma première opération
          </button>
        </section>
      )}
      {state.status === "success" && state.operations.length > 0 && (
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
            editingId={editedOperation?.id}
            onCancel={closeForm}
            onSave={save}
            busy={state.mutationStatus === "loading" || Boolean(deleting)}
            mutationError={
              state.mutationStatus === "error" ? state.message : ""
            }
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
              disabled={state.pageStatus === "loading"}
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
        <fieldset
          className="one-off-delete-confirmation"
          disabled={state.mutationStatus === "loading"}
        >
          <legend>Supprimer « {deleting.title} » ?</legend>
          <button
            ref={keepRef}
            type="button"
            className="one-off-button one-off-button--secondary"
            onClick={() => {
              setDeleting(null);
              restore();
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            className="one-off-button one-off-button--danger"
            onClick={remove}
          >
            Oui, supprimer
          </button>
        </fieldset>
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
