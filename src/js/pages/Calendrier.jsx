import { useQuickAdd } from "../components/QuickAdd/QuickAddContext";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MonthlyEventForm } from "../components/MonthlyEvents/MonthlyEventForm";
import { OneOffOperationForm } from "../components/OneOffOperations/OneOffOperationForm";
import { BudgetSummary } from "../components/BudgetCalendar/BudgetSummary";
import { CalendarModeToggle } from "../components/BudgetCalendar/CalendarModeToggle";
import { RealizeOccurrenceForm } from "../components/BudgetCalendar/RealizeOccurrenceForm";
import { LiveMessage } from "../components/LiveMessage";
import { useAnnouncesLoading } from "../hooks/useAnnouncesLoading";
import {
  formatCompact,
  formatMoney,
  longDate,
  monthLabel,
} from "../components/BudgetCalendar/budgetFormat";
import {
  CalendarMarkers,
  CalendarLegend,
} from "../components/BudgetCalendar/CalendarMarkers";
import { CalendarElements } from "../components/BudgetCalendar/CalendarElements";
import {
  calendarCounts,
  calendarCountLabel,
  CALENDAR_TYPES,
} from "../utils/calendarContent";
import { useBudgetCalendar } from "../hooks/useBudgetCalendar";
import { useMonthlyEvents } from "../hooks/useMonthlyEvents";
import { useSimulation } from "../components/Simulation/SimulationContext";
import { SimulationPanel } from "../components/Simulation/SimulationPanel";
import { PlanningActions } from "../components/Simulation/PlanningActions";
import { monthlyEventsService } from "../services/monthlyEventsService";
import "../../css/MonthlyEvents.css";
import "../../css/Operations.css";
import "../../css/BudgetCalendar.css";

const MODE_STORAGE_KEY = "mhw.calendar.mode";

const toMonth = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
const toDate = (date) =>
  `${toMonth(date)}-${String(date.getUTCDate()).padStart(2, "0")}`;
const monthDate = (month) => new Date(`${month}-01T00:00:00.000Z`);
const shiftMonth = (month, offset) => {
  const date = monthDate(month);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return toMonth(date);
};
const calendarDays = (month) => {
  const first = monthDate(month);
  first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first);
    day.setUTCDate(first.getUTCDate() + index);
    return toDate(day);
  });
};
const parisToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const readMode = () => {
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    return ["markers", "expenses", "forecast"].includes(stored)
      ? stored
      : "markers";
  } catch {
    return "markers";
  }
};

/** Valeur courte d'une case selon le mode : aucune, dépenses ou prévisionnel. */
const cellValue = (mode, day) => {
  if (!day || mode === "markers") return null;
  if (mode === "expenses") {
    return Number(day.expense) > 0 ? `−${formatCompact(day.expense)}` : null;
  }
  return day.forecastRemaining === null
    ? null
    : formatCompact(day.forecastRemaining);
};

const cellLabel = (
  date,
  day,
  pendingCount,
  overdueCount,
  currency,
  potentialCount = 0
) => {
  const parts = [longDate(date)];
  if (day && Number(day.expense) > 0)
    parts.push(`dépenses ${formatMoney(day.expense, currency)}`);
  if (day && Number(day.income) > 0)
    parts.push(`entrées ${formatMoney(day.income, currency)}`);
  if (pendingCount > 0)
    parts.push(
      `${pendingCount} événement${pendingCount > 1 ? "s" : ""} prévu${
        pendingCount > 1 ? "s" : ""
      }`
    );
  if (overdueCount > 0) parts.push(`${overdueCount} en retard`);
  if (potentialCount > 0)
    parts.push(
      `${potentialCount} élément${potentialCount > 1 ? "s" : ""} potentiel${
        potentialCount > 1 ? "s" : ""
      }`
    );
  if (day && day.forecastRemaining !== null)
    parts.push(
      `reste prévisionnel ${formatMoney(day.forecastRemaining, currency)}`
    );
  return parts.join(", ");
};

function Calendrier() {
  const simulation = useSimulation();
  const quickAdd = useQuickAdd();
  const today = parisToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(null);
  const [mode, setMode] = useState(readMode);
  const [form, setFormValue] = useState(null);
  const formTrigger = useRef(null),
    formWasOpen = useRef(false);
  const setForm = (value) => {
    if (value && !form) formTrigger.current = document.activeElement;
    setFormValue(value);
    simulation.setActiveForm(value ? "calendar" : null);
  };
  const visibleForm =
    !simulation.available || simulation.activeForm === "calendar" ? form : null;
  useEffect(() => {
    if (formWasOpen.current && !visibleForm)
      requestAnimationFrame(() => {
        (formTrigger.current?.isConnected
          ? formTrigger.current
          : document.querySelector('.budget-day[aria-pressed="true"]') ??
            document.querySelector(".budget-calendar__quick-add button")
        )?.focus();
      });
    formWasOpen.current = Boolean(visibleForm);
  }, [visibleForm]);
  const budget = useBudgetCalendar(month, selectedDate);
  const events = useMonthlyEvents(month);
  const announcesSummaryLoading = useAnnouncesLoading(
    budget.summaryStatus,
    month
  );
  const announcesContentLoading = useAnnouncesLoading(
    budget.operationsStatus,
    month
  );
  // Garder le déclencheur focalisable pendant les actualisations suivantes.
  const [eventsLoaded, setEventsLoaded] = useState(false);
  useEffect(() => {
    if (events.status === "success") setEventsLoaded(true);
  }, [events.status]);
  const days = useMemo(() => calendarDays(month), [month]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // La préférence est une commodité locale : son absence est sans effet.
    }
  }, [mode]);

  const summaryDays = useMemo(
    () => new Map((budget.summary?.days || []).map((day) => [day.date, day])),
    [budget.summary]
  );
  const currency = budget.summary?.currency || "EUR";
  const isSaving =
    budget.mutationStatus === "loading" ||
    events.mutationStatus === "loading" ||
    simulation.mutationStatus === "loading";

  const changeMonth = (offset) => {
    setMonth(shiftMonth(month, offset));
    setSelectedDate(null);
  };
  const selectDay = (date) => {
    if (!date.startsWith(month)) setMonth(date.slice(0, 7));
    setSelectedDate(date === selectedDate ? null : date);
  };
  const closeForm = () => setForm(null);
  const defaultOperationDate =
    selectedDate ?? (month === today.slice(0, 7) ? today : `${month}-01`);
  useEffect(() => {
    if (quickAdd.available) quickAdd.setCalendarDate(defaultOperationDate);
    return () => {
      if (quickAdd.available) quickAdd.setCalendarDate(null);
    };
  }, [defaultOperationDate, quickAdd.setCalendarDate]);
  const openCreation = (kind, event) => {
    if (quickAdd.available)
      quickAdd.open(kind, defaultOperationDate, event?.currentTarget);
    else
      setForm({
        type:
          kind === "event"
            ? "create-event"
            : kind === "potential"
            ? "create-potential"
            : "create",
      });
  };

  return (
    <main className="calendrier-container monthly-events-page budget-calendar">
      <header className="monthly-events-header budget-calendar__header">
        <div>
          <p className="monthly-events-eyebrow">Budget</p>
          <h1>Calendrier</h1>
        </div>
        <div className="budget-calendar__navigation">
          <button
            type="button"
            className="monthly-event-icon-button"
            onClick={() => changeMonth(-1)}
            aria-label="Mois précédent"
          >
            ‹
          </button>
          <h2 id="calendar-month-title">{monthLabel(month)}</h2>
          <button
            type="button"
            className="monthly-event-icon-button"
            onClick={() => changeMonth(1)}
            aria-label="Mois suivant"
          >
            ›
          </button>
          {month !== today.slice(0, 7) && (
            <button
              type="button"
              className="budget-link-button"
              onClick={() => {
                setMonth(today.slice(0, 7));
                setSelectedDate(null);
              }}
            >
              Aujourd’hui
            </button>
          )}
        </div>
        <Link
          className="monthly-event-button monthly-event-button--secondary"
          to="/prochains-mois"
        >
          Prochains mois
        </Link>
      </header>
      <LiveMessage
        message={budget.message.text}
        isError={budget.message.tone === "error"}
        className="monthly-events-message"
        errorClassName="monthly-events-message--error"
      />
      <LiveMessage
        message={events.message || ""}
        isError={events.status === "error" || events.mutationStatus === "error"}
        className="monthly-events-message"
        errorClassName="monthly-events-message--error"
      />

      {/* Une actualisation n'annonce que son résultat, pas le chargement
          (#171). */}
      <LiveMessage
        message={
          announcesSummaryLoading
            ? "Calcul de votre budget…"
            : budget.summaryStatus === "error"
            ? "Votre budget n’a pas pu être calculé."
            : ""
        }
        isError={budget.summaryStatus === "error"}
        visible={false}
      />
      <BudgetSummary
        summary={budget.summary}
        status={budget.summaryStatus}
        month={month}
        onRetry={budget.retry}
      />
      <SimulationPanel month={month} disabled={isSaving} />

      <div className="budget-calendar__layout">
        <section
          className="monthly-calendar"
          aria-labelledby="calendar-month-title"
        >
          <div className="budget-calendar__quick-add">
            <button
              type="button"
              className="monthly-event-button"
              onClick={(event) =>
                openCreation(quickAdd.available ? "menu" : "expense", event)
              }
              disabled={isSaving}
            >
              {selectedDate
                ? `Ajouter le ${longDate(selectedDate)}`
                : "Ajouter au calendrier"}
            </button>
          </div>
          <CalendarModeToggle mode={mode} onChange={setMode} />
          <div className="monthly-calendar__weekdays" aria-hidden="true">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="monthly-calendar__grid">
            {days.map((date) => {
              const day = summaryDays.get(date);
              const inMonth = date.startsWith(month);
              const contents = budget.content.filter(
                (item) => item.date === date
              );
              const counts = calendarCounts(contents);
              const ready = budget.operationsStatus === "success";
              const value = inMonth ? cellValue(mode, day) : null;
              const className = [
                "monthly-calendar__day",
                "budget-day",
                inMonth ? "" : "monthly-calendar__day--outside",
                date === today ? "monthly-calendar__day--today" : "",
                date === selectedDate ? "monthly-calendar__day--selected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={date}
                  type="button"
                  className={className}
                  onClick={() => selectDay(date)}
                  aria-pressed={date === selectedDate}
                  aria-label={`${cellLabel(
                    date,
                    inMonth ? day : null,
                    0,
                    0,
                    currency
                  )}${
                    ready
                      ? CALENDAR_TYPES.filter((t) => counts[t.key] > 0)
                          .map(
                            (t) =>
                              `, ${calendarCountLabel(t.key, counts[t.key])}`
                          )
                          .join("")
                      : budget.operationsStatus === "error"
                      ? ", contenu indisponible"
                      : ", chargement du contenu"
                  }`}
                >
                  <span className="budget-day__number">
                    {Number(date.slice(8, 10))}
                  </span>
                  {value && (
                    <span
                      className={`budget-day__value${
                        value.startsWith("−") || value.startsWith("-")
                          ? " budget-amount--negative"
                          : ""
                      }`}
                      aria-hidden="true"
                    >
                      {value}
                    </span>
                  )}
                  {inMonth && ready && <CalendarMarkers counts={counts} />}
                </button>
              );
            })}
          </div>
          <CalendarLegend />
        </section>

        <section
          className="monthly-calendar-day budget-events"
          aria-labelledby="budget-events-title"
        >
          <h2 id="budget-events-title">
            {selectedDate
              ? `Éléments du ${longDate(selectedDate)}`
              : `Éléments de ${monthLabel(month)}`}
          </h2>
          <PlanningActions
            onOperation={(event) => openCreation("expense", event)}
            onEvent={(event) => openCreation("event", event)}
            onPotential={(event) => openCreation("potential", event)}
            disabled={isSaving}
            eventDisabled={isSaving || !eventsLoaded}
          />
          {selectedDate && (
            <button
              type="button"
              className="budget-link-button"
              onClick={() => setSelectedDate(null)}
            >
              Tout le mois
            </button>
          )}
          <LiveMessage
            message={
              announcesContentLoading
                ? "Chargement des éléments…"
                : budget.operationsStatus === "error"
                ? "Les éléments n’ont pas pu être chargés."
                : ""
            }
            isError={budget.operationsStatus === "error"}
          />
          {budget.operationsStatus === "error" && (
            <button
              type="button"
              className="monthly-event-button"
              onClick={budget.retry}
            >
              Réessayer les éléments
            </button>
          )}
          {budget.operationsStatus === "success" &&
            (budget.content.filter((item) =>
              selectedDate
                ? item.date === selectedDate
                : item.date.startsWith(month)
            ).length === 0 ? (
              <p>Aucun élément {selectedDate ? "ce jour." : "ce mois."}</p>
            ) : (
              <CalendarElements
                items={budget.content.filter((item) =>
                  selectedDate
                    ? item.date === selectedDate
                    : item.date.startsWith(month)
                )}
                budget={budget}
                disabled={isSaving}
                onRealize={(occurrence) =>
                  setForm({ type: "realize", occurrence })
                }
              />
            ))}
        </section>
      </div>

      {visibleForm?.type === "realize" && (
        <RealizeOccurrenceForm
          occurrence={form.occurrence}
          categories={budget.categories}
          defaultDate={
            form.occurrence.occurrenceDate.slice(0, 7) < today.slice(0, 7)
              ? today
              : form.occurrence.occurrenceDate
          }
          isSaving={isSaving}
          onCancel={closeForm}
          onSave={async (body) => {
            if (await budget.realizeOccurrence(form.occurrence, body))
              closeForm();
          }}
        />
      )}
      {visibleForm?.type === "create" && (
        <OneOffOperationForm
          categories={budget.categories}
          initialDate={defaultOperationDate}
          isSaving={isSaving}
          onCancel={closeForm}
          onSave={async (operation) => {
            if (await budget.createOperation(operation)) closeForm();
          }}
        />
      )}
      {visibleForm?.type === "create-event" && (
        <MonthlyEventForm
          initialDate={defaultOperationDate}
          isSaving={isSaving}
          onCancel={closeForm}
          onSave={async (event) => {
            if (await events.createEvent(event)) {
              await budget.retry();
              closeForm();
            }
          }}
        />
      )}
      {visibleForm?.type === "create-potential" && (
        <MonthlyEventForm
          initialDate={defaultOperationDate}
          formTitle="Ajouter un élément potentiel"
          minStartDate={`${today.slice(0, 7)}-01`}
          isSaving={isSaving}
          onCancel={closeForm}
          onSave={async (event) => {
            if (
              await simulation.mutate(
                () => monthlyEventsService.createPotentialEvent(event),
                "Élément potentiel enregistré. Activez la Simulation pour voir son effet."
              )
            )
              closeForm();
          }}
        />
      )}
    </main>
  );
}

export default Calendrier;
