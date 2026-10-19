import React, { useEffect, useMemo, useState } from "react";
import { formatEventAmount } from "../components/MonthlyEvents/MonthlyEventList";
import { MonthlyEventForm } from "../components/MonthlyEvents/MonthlyEventForm";
import { OneOffOperationForm } from "../components/OneOffOperations/OneOffOperationForm";
import { BudgetSummary } from "../components/BudgetCalendar/BudgetSummary";
import { CalendarModeToggle } from "../components/BudgetCalendar/CalendarModeToggle";
import { PendingOccurrences } from "../components/BudgetCalendar/PendingOccurrences";
import { RealizeOccurrenceForm } from "../components/BudgetCalendar/RealizeOccurrenceForm";
import { CategoryLabel } from "../components/Categories/CategoryLabel";
import { LiveMessage } from "../components/LiveMessage";
import {
  formatCompact,
  formatMoney,
  longDate,
  monthLabel,
} from "../components/BudgetCalendar/budgetFormat";
import { useBudgetCalendar } from "../hooks/useBudgetCalendar";
import { useMonthlyEvents } from "../hooks/useMonthlyEvents";
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

const groupByDate = (items, dateOf) =>
  items.reduce(
    (map, item) =>
      map.set(dateOf(item), [...(map.get(dateOf(item)) || []), item]),
    new Map()
  );

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

const cellLabel = (date, day, pendingCount, overdueCount, currency) => {
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
  if (day && day.forecastRemaining !== null)
    parts.push(
      `reste prévisionnel ${formatMoney(day.forecastRemaining, currency)}`
    );
  return parts.join(", ");
};

function Calendrier() {
  const today = parisToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(null);
  const [mode, setMode] = useState(readMode);
  const [form, setForm] = useState(null);
  const budget = useBudgetCalendar(month, selectedDate);
  const events = useMonthlyEvents(month);
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
  const pendingByDate = useMemo(
    () => groupByDate(budget.pending, (item) => item.occurrenceDate),
    [budget.pending]
  );
  const visiblePending = budget.pending.filter((item) =>
    selectedDate
      ? item.occurrenceDate === selectedDate
      : item.overdue || item.occurrenceDate.startsWith(month)
  );
  const occurrencesByDate = useMemo(
    () => groupByDate(events.occurrences || [], (item) => item.occurrenceDate),
    [events.occurrences]
  );
  const operationsByDate = useMemo(
    () =>
      groupByDate(budget.operations, (operation) => operation.operationDate),
    [budget.operations]
  );
  const categoryById = useMemo(
    () => new Map(budget.categories.map((category) => [category.id, category])),
    [budget.categories]
  );
  const currency = budget.summary?.currency || "EUR";
  const isSaving =
    budget.mutationStatus === "loading" || events.mutationStatus === "loading";

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

      <LiveMessage
        message={
          budget.summaryStatus === "loading"
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

      <div className="budget-calendar__layout">
        <section
          className="monthly-calendar"
          aria-labelledby="calendar-month-title"
        >
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
              const pendingItems = pendingByDate.get(date) || [];
              const overdueCount = pendingItems.filter(
                (item) => item.overdue
              ).length;
              // Un mois futur n'a pas de synthèse : les occurrences suffisent.
              const plannedCount = budget.summary
                ? Math.max(pendingItems.length, day?.plannedCount ?? 0)
                : (occurrencesByDate.get(date) || []).length;
              const hasOperation =
                day && (Number(day.expense) > 0 || Number(day.income) > 0);
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
                  aria-label={cellLabel(
                    date,
                    inMonth ? day : null,
                    plannedCount,
                    overdueCount,
                    currency
                  )}
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
                  <span className="budget-day__markers" aria-hidden="true">
                    {hasOperation && inMonth && (
                      <span className="budget-marker budget-marker--real" />
                    )}
                    {plannedCount > 0 && inMonth && (
                      <span className="budget-marker budget-marker--planned" />
                    )}
                    {overdueCount > 0 && (
                      <span className="budget-marker budget-marker--overdue">
                        !
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <ul className="budget-legend" aria-label="Légende">
            <li>
              <span
                className="budget-marker budget-marker--real"
                aria-hidden="true"
              />
              Opération réelle
            </li>
            <li>
              <span
                className="budget-marker budget-marker--planned"
                aria-hidden="true"
              />
              Événement prévu
            </li>
            <li>
              <span
                className="budget-marker budget-marker--overdue"
                aria-hidden="true"
              >
                !
              </span>
              Événement en retard
            </li>
          </ul>
        </section>

        <section
          className="monthly-calendar-day budget-events"
          aria-labelledby="budget-events-title"
        >
          <h2 id="budget-events-title">
            {selectedDate
              ? `Événements du ${longDate(selectedDate)}`
              : "Événements à traiter"}
          </h2>
          <PendingOccurrences
            occurrences={visiblePending}
            disabled={isSaving}
            onRealize={(occurrence) => setForm({ type: "realize", occurrence })}
            onCancel={budget.cancelOccurrence}
          />
        </section>
      </div>

      {form?.type === "realize" && (
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
      {form?.type === "create" && (
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
      {form?.type === "create-event" && (
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

      <section
        className="budget-operations"
        aria-labelledby="budget-operations-title"
      >
        <div className="budget-operations__header">
          <h2 id="budget-operations-title">
            {selectedDate
              ? `Opérations du ${longDate(selectedDate)}`
              : `Opérations de ${monthLabel(month)}`}
          </h2>
          <div className="budget-operations__actions">
            {selectedDate && (
              <button
                type="button"
                className="monthly-event-button monthly-event-button--secondary"
                onClick={() => setForm({ type: "create-event" })}
                disabled={isSaving || events.status !== "success"}
              >
                Ajouter un événement prévu
              </button>
            )}
            {selectedDate && (
              <button
                type="button"
                className="monthly-event-button monthly-event-button--secondary"
                onClick={() => setSelectedDate(null)}
              >
                Tout le mois
              </button>
            )}
            <button
              type="button"
              className="monthly-event-button"
              onClick={() => setForm({ type: "create" })}
              disabled={isSaving}
            >
              Ajouter une opération
            </button>
          </div>
        </div>
        {/* Annonces dans des régions live toujours montées (#164). */}
        <LiveMessage
          message={
            budget.operationsStatus === "loading"
              ? "Chargement des opérations…"
              : budget.operationsStatus === "error"
              ? "Les opérations n’ont pas pu être chargées."
              : ""
          }
          isError={budget.operationsStatus === "error"}
          visible={false}
        />
        {budget.operationsStatus === "loading" && (
          <p>Chargement des opérations…</p>
        )}
        {budget.operationsStatus === "error" && (
          <p>Les opérations n’ont pas pu être chargées.</p>
        )}
        {budget.operationsStatus !== "loading" &&
          budget.operationsStatus !== "error" &&
          budget.operations.length === 0 && (
            <p className="budget-help">
              {selectedDate
                ? "Aucune opération ce jour."
                : "Aucune opération enregistrée ce mois-ci."}
            </p>
          )}
        {[...operationsByDate.entries()].map(([date, items]) => (
          <div key={date} className="budget-operations__group">
            {!selectedDate && (
              <h3 className="budget-subtitle">{longDate(date)}</h3>
            )}
            <ul className="budget-operation-list">
              {items.map((operation) => (
                <li key={operation.id} className="budget-operation">
                  <span className="budget-operation__label">
                    <span>{operation.title}</span>
                    {/* Rien tant que les catégories ne sont pas chargées. */}
                    {categoryById.has(operation.categoryId) && (
                      <CategoryLabel
                        category={categoryById.get(operation.categoryId)}
                      />
                    )}
                  </span>
                  <span
                    className={
                      operation.type === "ENTREE"
                        ? "budget-amount--positive"
                        : "budget-amount--negative"
                    }
                  >
                    {formatEventAmount(
                      operation.type === "ENTREE"
                        ? operation.amount
                        : -Number(operation.amount),
                      operation.currency
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {budget.operationsMeta?.hasNext && (
          <button
            type="button"
            className="monthly-event-button monthly-event-button--secondary"
            onClick={budget.loadMoreOperations}
            disabled={budget.operationsStatus === "paging"}
          >
            Afficher plus d’opérations
          </button>
        )}
      </section>
    </main>
  );
}

export default Calendrier;
