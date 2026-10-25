import React, { useEffect, useRef, useState } from "react";
import addIcon from "../../../assets/icons/add.svg";
import { useAnnouncesLoading } from "../../hooks/useAnnouncesLoading";
import { useFinancialGoals } from "../../hooks/useFinancialGoals";
import { FinancialGoalCard } from "./FinancialGoalCard";
import { FinancialGoalForm } from "./FinancialGoalForm";
import { LiveMessage } from "../LiveMessage";
import { SavingsCapacitySection } from "./SavingsCapacitySection";
import "../../../css/FinancialGoals.css";

/** Section « Objectifs financiers » : liste, états et formulaire. */
export const FinancialGoalsSection = ({ initialGoalId = null }) => {
  const state = useFinancialGoals();
  const announcesLoading = useAnnouncesLoading(state.status, "goals");
  const [edited, setEdited] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const selectedGoal =
    state.goals.find((goal) => goal.id === selectedId) ?? state.goals[0];
  const opener = useRef(null);
  const heading = useRef(null);
  const openedGoal = useRef(null);
  const beforeCreate = useRef(null);
  useEffect(() => {
    if (!beforeCreate.current || state.status !== "success") return;
    const added = state.goals.find(
      (goal) => !beforeCreate.current.has(goal.id)
    );
    if (added) {
      setSelectedId(added.id);
      beforeCreate.current = null;
    }
  }, [state.goals, state.status]);
  useEffect(() => {
    if (
      state.status !== "success" ||
      !initialGoalId ||
      openedGoal.current === initialGoalId
    )
      return;
    const goal = state.goals.find((goal) => goal.id === initialGoalId);
    if (goal) {
      setSelectedId(goal.id);
      openedGoal.current = initialGoalId;
      setEdited(goal);
      setFormOpen(true);
    }
  }, [state.status, state.goals, initialGoalId]);
  // Le focus revient au bouton d'origine à la fermeture du formulaire; il
  // est pris sur l'événement car Safari ne focalise pas un bouton cliqué.
  const open = (goal, trigger) => {
    if (goal) setSelectedId(goal.id);
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
    if (!edited)
      beforeCreate.current = new Set(state.goals.map(({ id }) => id));
    const succeeded = edited
      ? await state.updateGoal(edited.id, goal)
      : await state.createGoal(goal);
    if (succeeded) close();
    else beforeCreate.current = null;
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
      {/* Chargement annoncé par une région live toujours montée (#164), sauf
          pour une actualisation : seul son résultat est annoncé (#171). */}
      <LiveMessage
        message={announcesLoading ? "Chargement des objectifs…" : ""}
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
        <div className="goal-explorer">
          {state.goals.length > 1 && (
            <label className="goal-explorer__choice" htmlFor="explored-goal">
              Objectif à explorer
              <select
                id="explored-goal"
                value={selectedGoal.id}
                onChange={(event) => setSelectedId(Number(event.target.value))}
              >
                {state.goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title} · {goal.currency}
                  </option>
                ))}
              </select>
            </label>
          )}
          <FinancialGoalCard
            key={selectedGoal.id}
            goal={selectedGoal}
            onEdit={open}
            onRefresh={state.retry}
          />
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
