import { useContext } from "react";
import { MutationFeedbackContext } from "../Notifications/MutationFeedbackContext";
import { useVisualKeyboard } from "../../hooks/useVisualKeyboard";
import { useHideOnScroll } from "../../hooks/useHideOnScroll";
import { FormDialog } from "../Forms/FormDialog";
import { useViewportBounds } from "../../hooks/useViewportBounds";
import { ActionButton } from "../Actions/ActionButton";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
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
  const notifications = useContext(MutationFeedbackContext);
  const keyboardVisible = useVisualKeyboard();
  const simulation = useSimulation(),
    location = useLocation();
  const [calendarDate, setCalendarDate] = useState(null),
    [panel, setPanel] = useState(null),
    [categories, setCategories] = useState([]),
    [categoryStatus, setCategoryStatus] = useState("idle"),
    [feedback, setFeedback] = useState({
      text: "",
      error: false,
    });
  const returnFocus = useRef(null),
    fab = useRef(null),
    root = useRef(null);
  const busy = simulation.mutationStatus === "loading";
  const viewportStyle = useViewportBounds();
  // Mobile: the floating button steps aside while the page scrolls down.
  const away = useHideOnScroll(root, ".protected-layout", location.pathname);
  const menuOpen = panel?.kind === "menu";
  const restore = () => {
    let remaining = 4;
    const focusVisibleTrigger = () => {
      const target =
        returnFocus.current?.isConnected && !returnFocus.current.disabled
          ? returnFocus.current
          : fab.current;
      const visible =
        target?.getClientRects().length && !target.closest("[inert],[hidden]");
      // Last frame: focus anyway instead of giving up (no layout under jsdom).
      if (visible || remaining === 0) target?.focus();
      else {
        remaining -= 1;
        requestAnimationFrame(focusVisibleTrigger);
      }
    };
    requestAnimationFrame(focusVisibleTrigger);
  };
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
    (kind = "menu", date = null, trigger = null, defaults = {}) => {
      if (simulation.activeForm && simulation.activeForm !== "quick-add")
        return;
      returnFocus.current = trigger ?? document.activeElement;
      setFeedback({
        text: "",
        error: false,
      });
      setPanel({
        kind,
        date: date ?? contextDate,
        defaults,
      });
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
        text: notifications.available
          ? ""
          : kind === "potential"
          ? "Événement à confirmer enregistré. Activez la Simulation pour voir son effet."
          : "Ajout enregistré.",
        error: false,
      });
    } else
      setFeedback({
        text: "",
        error: true,
      });
    return ok;
  };
  return (
    <QuickAddContext.Provider
      value={{
        available: true,
        open,
        setCalendarDate,
      }}
    >
      <div ref={root} className="quick-add-root" style={viewportStyle}>
        {children}
        <div className="quick-add-feedback">
          <LiveMessage
            message={feedback.text}
            isError={feedback.error}
            visible={!panel}
          />
        </div>
        <div
          className={[
            "quick-add-dock",
            away && !menuOpen ? "quick-add-dock--away" : "",
            menuOpen ? "quick-add-dock--open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          hidden={
            // The menu grows out of the button, which then closes it.
            Boolean(panel && !menuOpen) ||
            (notifications.blocked && !menuOpen) ||
            keyboardVisible ||
            Boolean(
              simulation.activeForm && simulation.activeForm !== "quick-add"
            )
          }
        >
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
            onClick={(e) =>
              panel ? close() : open("menu", null, e.currentTarget)
            }
          >
            <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
          </button>
        </div>
        {panel && (
          <FormDialog
            inertBackground={panel.kind !== "menu"}
            busy={busy}
            onClose={close}
            label={
              panel.kind === "menu" ? "Ajouter au budget" : "Création au budget"
            }
            className={`quick-add-overlay quick-add-overlay--${
              panel.kind === "menu" ? "menu" : "form"
            }`}
            surfaceClassName="quick-add-surface"
          >
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
                        setFeedback({
                          text: "",
                          error: false,
                        });
                        setPanel((p) => ({
                          ...p,
                          kind,
                        }));
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
                <ActionButton
                  action="cancel"
                  type="button"
                  className="one-off-button one-off-button--secondary"
                  onClick={close}
                >
                  Annuler
                </ActionButton>
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
                      initialCurrency={panel.defaults?.currency ?? "EUR"}
                      initialCategoryId={panel.defaults?.categoryId ?? ""}
                      suggestedEnvelopeId={panel.defaults?.envelopeId ?? null}
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
                      <ActionButton
                        action="cancel"
                        type="button"
                        className="one-off-button one-off-button--secondary"
                        onClick={close}
                      >
                        Annuler
                      </ActionButton>
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
          </FormDialog>
        )}
      </div>
    </QuickAddContext.Provider>
  );
};
