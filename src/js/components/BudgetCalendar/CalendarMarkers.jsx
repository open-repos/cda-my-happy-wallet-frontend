import React from "react";
import { CALENDAR_TYPES } from "../../utils/calendarContent";
export const CalendarMarker = ({ type }) => (
  <span className={`budget-marker budget-marker--${type}`} aria-hidden="true">
    {type === "overdue" ? "!" : null}
  </span>
);
export const CalendarMarkers = ({ counts }) => (
  <span className="budget-day__markers" aria-hidden="true">
    {CALENDAR_TYPES.filter((t) => counts[t.key] > 0).map((t) => (
      <CalendarMarker key={t.key} type={t.key} />
    ))}
  </span>
);
export const CalendarLegend = () => (
  <ul className="budget-legend" aria-label="Légende">
    {CALENDAR_TYPES.map((t) => (
      <li key={t.key}>
        <CalendarMarker type={t.key} />
        {t.label}
      </li>
    ))}
  </ul>
);
