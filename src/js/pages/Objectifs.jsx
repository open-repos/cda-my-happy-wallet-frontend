import React, { useMemo, useState } from "react";
import addIcon from "../../assets/icons/add.svg";
import { MonthlyEventForm } from "../components/MonthlyEvents/MonthlyEventForm";
import { MonthlyEventList } from "../components/MonthlyEvents/MonthlyEventList";
import { useMonthlyEvents } from "../hooks/useMonthlyEvents";
import "../../css/MonthlyEvents.css";

const currentMonth = () => new Date().toISOString().slice(0, 7);

function Objectifs() {
  const month = useMemo(currentMonth, []);
  const state = useMonthlyEvents(month);
  const [editedEvent, setEditedEvent] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const closeForm = () => {
    if (state.mutationStatus !== "loading") {
      setFormOpen(false);
      setEditedEvent(null);
    }
  };
  const save = async (event) => {
    const succeeded = editedEvent
      ? await state.updateEvent(editedEvent.id, event)
      : await state.createEvent(event);
    if (succeeded) closeForm();
  };
  const remove = async () => {
    if (editedEvent && (await state.deleteEvent(editedEvent.id))) closeForm();
  };
  return (
    <main className="objEv-container monthly-events-page">
      <header className="monthly-events-header">
        <div>
          <p className="monthly-events-eyebrow">Prévisions</p>
          <h1>Événements mensuels</h1>
          <p>
            Anticipez les entrées et dépenses qui influenceront votre budget.
          </p>
        </div>
        <button
          type="button"
          className="monthly-event-button"
          onClick={() => {
            setEditedEvent(null);
            setFormOpen(true);
          }}
          disabled={state.status !== "success"}
        >
          <img src={addIcon} alt="" aria-hidden="true" />
          Ajouter un événement
        </button>
      </header>
      {state.message && (
        <p
          className={`monthly-events-message ${
            state.status === "error" || state.mutationStatus === "error"
              ? "monthly-events-message--error"
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
        <section className="monthly-events-state" aria-live="polite">
          <span className="monthly-events-loader" aria-hidden="true" />
          <h2>Chargement des événements…</h2>
        </section>
      )}
      {state.status === "error" && (
        <section className="monthly-events-state">
          <h2>Les événements sont momentanément indisponibles</h2>
          <p>Vos données restent inchangées.</p>
          <button
            type="button"
            className="monthly-event-button"
            onClick={state.retry}
          >
            Réessayer
          </button>
        </section>
      )}
      {state.status === "success" && state.events.length === 0 && (
        <section className="monthly-events-state">
          <h2>Aucun événement prévu</h2>
          <p>
            Ajoutez une dépense ou une entrée future, ponctuelle ou mensuelle.
          </p>
          <button
            type="button"
            className="monthly-event-button"
            onClick={() => setFormOpen(true)}
          >
            Ajouter mon premier événement
          </button>
        </section>
      )}
      {state.status === "success" && state.events.length > 0 && (
        <section
          className="monthly-events-list"
          aria-labelledby="monthly-events-list-title"
        >
          <div className="monthly-events-list__heading">
            <h2 id="monthly-events-list-title">Vos événements</h2>
            <span>
              {state.events.length} enregistré
              {state.events.length > 1 ? "s" : ""}
            </span>
          </div>
          <MonthlyEventList
            events={state.events}
            onEdit={(event) => {
              setEditedEvent(event);
              setFormOpen(true);
            }}
          />
        </section>
      )}
      {formOpen && (
        <MonthlyEventForm
          key={editedEvent?.id || "new"}
          event={editedEvent}
          isSaving={state.mutationStatus === "loading"}
          onCancel={closeForm}
          onSave={save}
          onDelete={remove}
        />
      )}
    </main>
  );
}

export default Objectifs;
