import { ActionButton } from "../Actions/ActionButton";
import React, { useEffect, useState } from "react";
import { useSimulation } from "./SimulationContext";
import { MonthlyEventForm } from "../MonthlyEvents/MonthlyEventForm";
import { OneOffOperationForm } from "../OneOffOperations/OneOffOperationForm";
import { monthlyEventsService } from "../../services/monthlyEventsService";
import { oneOffOperationsService } from "../../services/oneOffOperationsService";
import { forecastToday } from "../../utils/budgetForecast";
import { LiveMessage } from "../LiveMessage";

export const PlanningActions = ({
  onOperation,
  onEvent,
  onPotential,
  disabled = false,
  eventDisabled = disabled,
}) => (
  <div className="planning-actions" role="group" aria-label="Ajouter au budget">
    <ActionButton
      action="add"
      type="button"
      className="monthly-event-button"
      onClick={onOperation}
      disabled={disabled}
    >
      Ajouter une opération
    </ActionButton>
    <ActionButton
      action="add"
      type="button"
      className="monthly-event-button monthly-event-button--secondary"
      onClick={onEvent}
      disabled={eventDisabled}
    >
      Ajouter un événement prévu
    </ActionButton>
    <ActionButton
      action="add"
      type="button"
      className="monthly-event-button monthly-event-button--secondary"
      onClick={onPotential}
      disabled={disabled}
    >
      Ajouter un élément potentiel
    </ActionButton>
  </div>
);

export const ForecastPlanning = ({ month }) => {
  const state = useSimulation();
  const today = forecastToday();
  const [date, setDate] = useState(
    month === today.slice(0, 7) ? today : `${month}-01`
  );
  const [form, setForm] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryStatus, setCategoryStatus] = useState("idle");
  const busy = state.mutationStatus === "loading";
  const loadCategories = async () => {
    setCategoryStatus("loading");
    try {
      setCategories(await oneOffOperationsService.listAllCategories());
      setCategoryStatus("success");
    } catch {
      setCategoryStatus("error");
    }
  };
  useEffect(() => {
    if (form === "operation") loadCategories();
  }, [form]);
  const open = (type) => {
    setForm(type);
    state.setActiveForm("planning");
  };
  const close = () => {
    if (!busy) {
      setForm(null);
      state.setActiveForm(null);
    }
  };
  const save = async (body) => {
    const ok = await state.mutate(
      () =>
        form === "operation"
          ? oneOffOperationsService.createOperation(body)
          : form === "potential"
          ? monthlyEventsService.createPotentialEvent(body)
          : monthlyEventsService.createEvent(body),
      form === "potential"
        ? "Élément potentiel enregistré. Activez la Simulation pour voir son effet."
        : form === "operation"
        ? "Opération ajoutée."
        : "Événement prévu ajouté.",
      "L’ajout n’a pas pu être enregistré. Vérifiez la date et les champs puis réessayez."
    );
    if (ok) {
      setForm(null);
      state.setActiveForm(null);
    }
  };
  return (
    <section className="simulation-surface" aria-label="Planifier un ajout">
      <h2>Ajouter au budget</h2>
      <label className="planning-date">
        Date pour les ajouts
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={busy}
        />
      </label>
      <PlanningActions
        onOperation={() => open("operation")}
        onEvent={() => open("event")}
        onPotential={() => open("potential")}
        disabled={busy || !/^\d{4}-\d{2}-\d{2}$/.test(date)}
      />
      {form &&
        state.activeForm === "planning" &&
        (form === "operation" ? (
          categoryStatus === "success" ? (
            <OneOffOperationForm
              key={`operation:${date}`}
              categories={categories}
              initialDate={date}
              isSaving={busy}
              onCancel={close}
              onSave={save}
            />
          ) : (
            <>
              <LiveMessage
                message={
                  categoryStatus === "error"
                    ? "Les catégories n’ont pas pu être chargées."
                    : "Chargement des catégories…"
                }
                isError={categoryStatus === "error"}
              />
              {categoryStatus === "error" && (
                <button
                  type="button"
                  className="monthly-event-button"
                  onClick={loadCategories}
                >
                  Réessayer les catégories
                </button>
              )}
              <button
                type="button"
                className="monthly-event-button monthly-event-button--secondary"
                onClick={close}
              >
                Annuler l’ajout
              </button>
            </>
          )
        ) : (
          <MonthlyEventForm
            key={`${form}:${date}`}
            initialDate={date}
            formTitle={
              form === "potential" ? "Ajouter un élément potentiel" : undefined
            }
            minStartDate={
              form === "potential" ? `${today.slice(0, 7)}-01` : undefined
            }
            isSaving={busy}
            onCancel={close}
            onSave={save}
          />
        ))}
    </section>
  );
};
