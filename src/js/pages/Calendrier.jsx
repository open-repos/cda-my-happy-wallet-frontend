import React, { useMemo, useState } from "react";
import { formatEventAmount } from "../components/MonthlyEvents/MonthlyEventList";
import { useMonthlyEvents } from "../hooks/useMonthlyEvents";
import "../../css/MonthlyEvents.css";

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
const monthLabel = (month) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthDate(month));
const longDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));

function Calendrier() {
  const today = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const state = useMonthlyEvents(month);
  const days = useMemo(() => calendarDays(month), [month]);
  const occurrencesByDate = useMemo(
    () =>
      state.occurrences.reduce(
        (map, occurrence) =>
          map.set(occurrence.occurrenceDate, [
            ...(map.get(occurrence.occurrenceDate) || []),
            occurrence,
          ]),
        new Map()
      ),
    [state.occurrences]
  );
  const selectedOccurrences = occurrencesByDate.get(selectedDate) || [];
  const changeMonth = (offset) => {
    const next = shiftMonth(month, offset);
    setMonth(next);
    setSelectedDate(`${next}-01`);
  };
  return (
    <main className="calendrier-container monthly-events-page">
      <header className="monthly-events-header">
        <div>
          <p className="monthly-events-eyebrow">Prévisions</p>
          <h1>Calendrier</h1>
          <p>
            Visualisez les événements qui influencent votre budget, mois par
            mois.
          </p>
        </div>
      </header>
      {state.message && (
        <p
          className="monthly-events-message monthly-events-message--error"
          role="alert"
        >
          {state.message}
        </p>
      )}
      {state.status === "loading" && (
        <section className="monthly-events-state" aria-live="polite">
          <span className="monthly-events-loader" aria-hidden="true" />
          <h2>Chargement du calendrier…</h2>
        </section>
      )}
      {state.status === "error" && (
        <section className="monthly-events-state">
          <h2>Le calendrier est momentanément indisponible</h2>
          <button
            type="button"
            className="monthly-event-button"
            onClick={state.retry}
          >
            Réessayer
          </button>
        </section>
      )}
      {state.status === "success" && (
        <div className="monthly-calendar-layout">
          <section
            className="monthly-calendar"
            aria-labelledby="calendar-month-title"
          >
            <div className="monthly-calendar__header">
              <h2 id="calendar-month-title">{monthLabel(month)}</h2>
              <div>
                <button
                  type="button"
                  className="monthly-event-icon-button"
                  onClick={() => changeMonth(-1)}
                  aria-label="Mois précédent"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="monthly-event-icon-button"
                  onClick={() => changeMonth(1)}
                  aria-label="Mois suivant"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="monthly-calendar__weekdays" aria-hidden="true">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="monthly-calendar__grid">
              {days.map((date) => {
                const occurrences = occurrencesByDate.get(date) || [];
                const inMonth = date.startsWith(month);
                const className = [
                  "monthly-calendar__day",
                  inMonth ? "" : "monthly-calendar__day--outside",
                  date === today ? "monthly-calendar__day--today" : "",
                  date === selectedDate
                    ? "monthly-calendar__day--selected"
                    : "",
                  occurrences.length ? "monthly-calendar__day--has-event" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={date}
                    type="button"
                    className={className}
                    onClick={() => {
                      setSelectedDate(date);
                      if (!inMonth) setMonth(date.slice(0, 7));
                    }}
                    aria-pressed={date === selectedDate}
                    aria-label={`${longDate(date)}${
                      occurrences.length
                        ? `, ${occurrences.length} événement${
                            occurrences.length > 1 ? "s" : ""
                          }`
                        : ""
                    }`}
                  >
                    <span>{Number(date.slice(8, 10))}</span>
                    {occurrences.length > 0 && (
                      <span
                        className="monthly-calendar__dot"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
          <aside
            className="monthly-calendar-day"
            aria-labelledby="selected-day-title"
          >
            <h2 id="selected-day-title">{longDate(selectedDate)}</h2>
            {selectedOccurrences.length === 0 ? (
              <p>Aucun événement prévu ce jour.</p>
            ) : (
              <ul>
                {selectedOccurrences.map((event) => (
                  <li key={`${event.id}-${event.occurrenceDate}`}>
                    <span
                      className={`monthly-event-kind monthly-event-kind--${event.kind.toLowerCase()}`}
                    >
                      {event.kind === "ENTREE" ? "Entrée" : "Dépense"}
                    </span>
                    <strong>{event.title}</strong>
                    <span>
                      {formatEventAmount(event.amount, event.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

export default Calendrier;
