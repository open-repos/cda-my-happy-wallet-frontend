import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTimes,
  faArrowUp,
  faArrowDown,
  faCalendar,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { QuickAddContext } from "./QuickAddContext";
import { useSimulation } from "../Simulation/SimulationContext";
import { OneOffOperationForm } from "../OneOffOperations/OneOffOperationForm";
import { MonthlyEventForm } from "../MonthlyEvents/MonthlyEventForm";
import { oneOffOperationsService } from "../../services/oneOffOperationsService";
import { monthlyEventsService } from "../../services/monthlyEventsService";
import { forecastToday } from "../../utils/budgetForecast";
import { LiveMessage } from "../LiveMessage";
import "../../../css/QuickAdd.css";
import "../../../css/Operations.css";
import "../../../css/MonthlyEvents.css";
export { useQuickAdd } from "./QuickAddContext";
const choices = [
  ["expense", "Dépense", "Opération réelle", faArrowUp],
  ["income", "Entrée", "Opération réelle", faArrowDown],
  ["event", "Événement confirmé", "Prévu, pas encore réalisé", faCalendar],
  [
    "potential",
    "Événement à confirmer",
    "Simulation · aucun impact sur le réel",
    faClock,
  ],
];
const dateLabel = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
export const QuickAddProvider = ({ children }) => {
  const simulation = useSimulation(),
    location = useLocation();
  const [calendarDate, setCalendarDate] = useState(null),
    [panel, setPanel] = useState(null),
    [categories, setCategories] = useState([]),
    [categoryStatus, setCategoryStatus] = useState("idle"),
    [feedback, setFeedback] = useState({ text: "", error: false });
  const returnFocus = useRef(null),
    overlay = useRef(null),
    fab = useRef(null);
  const busy = simulation.mutationStatus === "loading";
  const restore = () =>
    requestAnimationFrame(() =>
      (returnFocus.current?.isConnected && !returnFocus.current.disabled
        ? returnFocus.current
        : fab.current
      )?.focus()
    );
  const wasOpen = useRef(false);
  useEffect(() => {
    // Restore after the child form's cleanup; its focus hook also restores focus.
    if (wasOpen.current && !panel) restore();
    wasOpen.current = Boolean(panel);
  }, [panel]);
  const contextDate =
    location.pathname === "/calendrier" && calendarDate
      ? calendarDate
      : forecastToday();
  const open = useCallback(
    (kind = "menu", date = null, trigger = null) => {
      if (simulation.activeForm && simulation.activeForm !== "quick-add")
        return;
      returnFocus.current = trigger ?? document.activeElement;
      setFeedback({ text: "", error: false });
      setPanel({ kind, date: date ?? contextDate });
      simulation.setActiveForm("quick-add");
    },
    [contextDate, simulation.activeForm, simulation.setActiveForm]
  );
  const close = () => {
    if (busy) return;
    setPanel(null);
    simulation.setActiveForm(null);
  };
  const loadCategories = useCallback(async () => {
    setCategoryStatus("loading");
    try {
      setCategories(await oneOffOperationsService.listAllCategories());
      setCategoryStatus("success");
    } catch {
      setCategoryStatus("error");
    }
  }, []);
  useEffect(() => {
    if (["expense", "income"].includes(panel?.kind)) loadCategories();
  }, [panel?.kind, loadCategories]);
  useEffect(() => {
    setPanel(null);
    setCalendarDate(null);
    if (simulation.activeForm === "quick-add") simulation.setActiveForm(null);
  }, [location.pathname]);
  useEffect(() => {
    if (!panel) return;
    const focusables = () => [
      ...(overlay.current?.querySelectorAll(
        "button:not([disabled]):not([tabindex='-1']),input:not([disabled]),select:not([disabled]),a[href]"
      ) ?? []),
    ];
    if (
      panel.kind === "menu" ||
      (["expense", "income"].includes(panel.kind) &&
        categoryStatus !== "success")
    )
      focusables()[0]?.focus();
    const keydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!busy) close();
      }
      if (e.key === "Tab") {
        const els = focusables(),
          first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [panel?.kind, busy, categoryStatus]);
  const save = async (body) => {
    const kind = panel.kind;
    const ok = await simulation.mutate(
      () =>
        ["expense", "income"].includes(kind)
          ? oneOffOperationsService.createOperation(body)
          : kind === "potential"
          ? monthlyEventsService.createPotentialEvent(body)
          : monthlyEventsService.createEvent(body),
      kind === "potential"
        ? "Événement à confirmer ajouté à la Simulation. Le réel reste inchangé."
        : kind === "event"
        ? "Événement confirmé ajouté aux prévisions."
        : "Opération ajoutée."
    );
    if (ok) {
      setPanel(null);
      simulation.setActiveForm(null);
      setFeedback({
        text:
          kind === "potential"
            ? "Événement à confirmer enregistré. Activez la Simulation pour voir son effet."
            : "Ajout enregistré.",
        error: false,
      });
    } else
      setFeedback({
        text: "L’ajout n’a pas pu être enregistré. Vérifiez les champs puis réessayez.",
        error: true,
      });
    return ok;
  };
  return (
    <QuickAddContext.Provider
      value={{ available: true, open, setCalendarDate }}
    >
      <div className="quick-add-root">
        {children}
        <div className="quick-add-feedback">
          <LiveMessage
            message={feedback.text}
            isError={feedback.error}
            visible={!panel}
          />
        </div>
        <button
          ref={fab}
          type="button"
          className="quick-add-fab"
          aria-label={
            panel
              ? "Fermer l’ajout rapide"
              : "Ajouter une opération ou un événement"
          }
          aria-expanded={Boolean(panel)}
          aria-haspopup="dialog"
          disabled={
            busy ||
            Boolean(
              simulation.activeForm && simulation.activeForm !== "quick-add"
            )
          }
          hidden={Boolean(panel && panel.kind !== "menu")}
          onClick={(e) =>
            panel ? close() : open("menu", null, e.currentTarget)
          }
        >
          <FontAwesomeIcon icon={panel ? faTimes : faPlus} aria-hidden="true" />
        </button>
        {panel && (
          <div
            ref={overlay}
            role="dialog"
            aria-modal="true"
            aria-label={
              panel.kind === "menu" ? "Ajouter au budget" : "Création au budget"
            }
            className={`quick-add-overlay quick-add-overlay--${
              panel.kind === "menu" ? "menu" : "form"
            }`}
          >
            <button
              type="button"
              tabIndex={-1}
              className="quick-add-backdrop"
              aria-label="Fermer l’ajout"
              disabled={busy}
              onClick={close}
            />
            <div className="quick-add-surface">
              <p className="quick-add-context">
                Ajouter · {dateLabel(panel.date)}
              </p>
              {panel.kind === "menu" ? (
                <>
                  <div className="quick-add-choices">
                    {choices.map(([kind, title, help, icon]) => (
                      <button
                        type="button"
                        key={kind}
                        onClick={() => {
                          setFeedback({ text: "", error: false });
                          setPanel((p) => ({ ...p, kind }));
                        }}
                      >
                        <FontAwesomeIcon icon={icon} aria-hidden="true" />
                        <span>
                          <strong>{title}</strong>
                          <small>{help}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="one-off-button one-off-button--secondary"
                    onClick={close}
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <LiveMessage
                    message={
                      feedback.text ||
                      (simulation.mutationStatus === "error"
                        ? simulation.message
                        : "")
                    }
                    isError={
                      feedback.error || simulation.mutationStatus === "error"
                    }
                  />
                  {["expense", "income"].includes(panel.kind) ? (
                    categoryStatus === "success" ? (
                      <OneOffOperationForm
                        key={`${panel.kind}:${panel.date}`}
                        initialKind={
                          panel.kind === "income" ? "ENTREE" : "DEPENSE"
                        }
                        initialDate={panel.date}
                        categories={categories}
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
                            className="one-off-button"
                            onClick={loadCategories}
                          >
                            Réessayer les catégories
                          </button>
                        )}
                        <button
                          type="button"
                          className="one-off-button one-off-button--secondary"
                          onClick={close}
                        >
                          Annuler
                        </button>
                      </>
                    )
                  ) : (
                    <>
                      <p className="quick-add-help">
                        {panel.kind === "potential"
                          ? "À confirmer · Simulation : aucun impact sur le réel."
                          : "Confirmé · prévision : le réel changera uniquement lors de la réalisation."}
                      </p>
                      <MonthlyEventForm
                        key={`${panel.kind}:${panel.date}`}
                        initialDate={panel.date}
                        formTitle={
                          panel.kind === "potential"
                            ? "Événement à confirmer"
                            : "Événement confirmé"
                        }
                        minStartDate={
                          panel.kind === "potential"
                            ? `${forecastToday().slice(0, 7)}-01`
                            : undefined
                        }
                        isSaving={busy}
                        onCancel={close}
                        onSave={save}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </QuickAddContext.Provider>
  );
};
