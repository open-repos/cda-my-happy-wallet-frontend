import React, { useEffect, useRef, useState } from "react";
import addIcon from "../../../assets/icons/add.svg";
import { useFinancialGoals } from "../../hooks/useFinancialGoals";
import { FinancialGoalCard } from "./FinancialGoalCard";
import { FinancialGoalForm } from "./FinancialGoalForm";
import { LiveMessage } from "../LiveMessage";
import { SavingsCapacitySection } from "./SavingsCapacitySection";
import "../../../css/FinancialGoals.css";

/** Section « Objectifs financiers » : liste, états et formulaire. */
export const FinancialGoalsSection = ({ initialGoalId = null }) => {
  const state = useFinancialGoals();
  const [edited, setEdited] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const opener = useRef(null);
  const heading = useRef(null);
  const openedGoal = useRef(null);
  useEffect(() => {
    if (
      state.status !== "success" ||
      !initialGoalId ||
      openedGoal.current === initialGoalId
    )
      return;
    const goal = state.goals.find((goal) => goal.id === initialGoalId);
    if (goal) {
      openedGoal.current = initialGoalId;
      setEdited(goal);
      setFormOpen(true);
    }
  }, [state.status, state.goals, initialGoalId]);
  // Le focus revient au bouton d'origine à la fermeture du formulaire; il
  // est pris sur l'événement car Safari ne focalise pas un bouton cliqué.
  const open = (goal, trigger) => {
    opener.current = trigger;
    setEdited(goal);
    setFormOpen(true);
  };
  const close = () => {
    if (state.mutationStatus !== "loading") {
      setFormOpen(false);
      setEdited(null);
      // Après un rechargement, le déclencheur a pu être remplacé : le focus
      // va alors au titre de la section plutôt qu'au document.
      if (opener.current?.isConnected) opener.current.focus();
      else heading.current?.focus();
    }
  };
  const save = async (goal) => {
    const succeeded = edited
      ? await state.updateGoal(edited.id, goal)
      : await state.createGoal(goal);
    if (succeeded) close();
  };
  const remove = async () => {
    if (edited && (await state.deleteGoal(edited.id))) close();
  };

  return (
    <section className="goals-section" aria-labelledby="goals-title">
      <header className="monthly-events-header">
        <div>
          <p className="monthly-events-eyebrow">Épargne</p>
          <h2 id="goals-title" ref={heading} tabIndex={-1}>
            Objectifs financiers
          </h2>
          <p>Suivez ce que vous mettez de côté et la date visée.</p>
        </div>
        {state.status === "success" && state.goals.length > 0 && (
          <button
            type="button"
            className="monthly-event-button"
            onClick={(event) => open(null, event.currentTarget)}
          >
            <img src={addIcon} alt="" aria-hidden="true" />
            Ajouter un objectif
          </button>
        )}
      </header>
      <LiveMessage
        message={state.message}
        isError={state.status === "error" || state.mutationStatus === "error"}
        className="monthly-events-message"
        errorClassName="monthly-events-message--error"
      />
      {/* Chargement annoncé par une région live toujours montée (#164). */}
      <LiveMessage
        message={state.status === "loading" ? "Chargement des objectifs…" : ""}
        visible={false}
      />
      {state.status === "loading" && (
        <div className="monthly-events-state">
          <span className="monthly-events-loader" aria-hidden="true" />
          <h3>Chargement des objectifs…</h3>
        </div>
      )}
      {state.status === "error" && (
        <div className="monthly-events-state">
          <h3>Les objectifs sont momentanément indisponibles</h3>
          <p>Vos données restent inchangées.</p>
          <button
            type="button"
            className="monthly-event-button"
            onClick={state.retry}
          >
            Réessayer
          </button>
        </div>
      )}
      {state.status === "success" && state.goals.length === 0 && (
        <div className="monthly-events-state">
          <h3>Ajoutez votre premier objectif</h3>
          <p>
            Un voyage, un équipement, une réserve : indiquez le montant visé et
            ce que vous pouvez verser chaque mois.
          </p>
          <button
            type="button"
            className="monthly-event-button"
            onClick={(event) => open(null, event.currentTarget)}
          >
            C’est parti
          </button>
        </div>
      )}
      {state.status === "success" && state.goals.length > 0 && (
        <div className="goals-grid">
          {state.goals.map((goal) => (
            <FinancialGoalCard key={goal.id} goal={goal} onEdit={open} />
          ))}
        </div>
      )}
      <SavingsCapacitySection
        refreshKey={JSON.stringify(state.goals)}
        adjustDisabled={
          state.status !== "success" || state.mutationStatus === "loading"
        }
        onAdjust={(id, trigger) => {
          const goal = state.goals.find((goal) => goal.id === id);
          if (goal && state.mutationStatus !== "loading") open(goal, trigger);
        }}
      />
      {formOpen && (
        <FinancialGoalForm
          key={edited?.id || "new"}
          goal={edited}
          isSaving={state.mutationStatus === "loading"}
          onCancel={close}
          onSave={save}
          onDelete={remove}
        />
      )}
    </section>
  );
};
