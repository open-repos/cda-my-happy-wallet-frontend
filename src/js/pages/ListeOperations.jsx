import React, { useState } from "react";
import addIcon from "../../assets/icons/add.svg";
import { OneOffOperationForm } from "../components/OneOffOperations/OneOffOperationForm";
import { OneOffOperationList } from "../components/OneOffOperations/OneOffOperationList";
import { useOneOffOperations } from "../hooks/useOneOffOperations";
import "../../css/Operations.css";

function ListeOperations() {
  const [editedOperation, setEditedOperation] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const state = useOneOffOperations();
  const openCreate = () => {
    setEditedOperation(null);
    setIsFormOpen(true);
  };
  const openEdit = (operation) => {
    setEditedOperation(operation);
    setIsFormOpen(true);
  };
  const closeForm = () => {
    if (state.mutationStatus !== "loading") {
      setIsFormOpen(false);
      setEditedOperation(null);
    }
  };
  const save = async (operation) => {
    const succeeded = editedOperation
      ? await state.updateOperation(editedOperation.id, operation)
      : await state.createOperation(operation);
    if (succeeded) closeForm();
  };
  const remove = async () => {
    if (editedOperation && (await state.deleteOperation(editedOperation.id)))
      closeForm();
  };

  return (
    <main className="operations-container">
      <header className="one-off-header">
        <div>
          <p className="one-off-eyebrow">Budget du quotidien</p>
          <h1>Ensemble des opérations effectuées</h1>
          <p>
            Retrouvez vos entrées et dépenses ponctuelles, des plus récentes aux
            plus anciennes.
          </p>
        </div>
        <button
          type="button"
          className="one-off-button"
          onClick={openCreate}
          disabled={state.status !== "success"}
        >
          <img src={addIcon} alt="" aria-hidden="true" />
          Ajouter une opération
        </button>
      </header>
      {state.message && (
        <p
          className={`one-off-message ${
            state.status === "error" || state.mutationStatus === "error"
              ? "one-off-message--error"
              : ""
          }`}
          role={
            state.status === "error" || state.mutationStatus === "error"
              ? "alert"
              : "status"
          }
        >
          {state.message}
        </p>
      )}
      {state.status === "loading" && (
        <section className="one-off-state" aria-live="polite">
          <span className="one-off-loader" aria-hidden="true" />
          <h2>Chargement des opérations…</h2>
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
