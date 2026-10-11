import React from "react";

export const CALENDAR_MODES = [
  { value: "markers", label: "Repères" },
  { value: "expenses", label: "Dépenses" },
  { value: "forecast", label: "Prévisionnel" },
];

/** Commande segmentée accessible : un groupe de boutons radio natifs. */
export const CalendarModeToggle = ({ mode, onChange }) => (
  <div className="budget-mode">
    <fieldset className="budget-mode__group">
      <legend className="sr-only">Contenu des jours</legend>
      {CALENDAR_MODES.map((option) => (
        <label
          key={option.value}
          className={`budget-mode__option${
            option.value === mode ? " budget-mode__option--active" : ""
          }`}
        >
          <input
            type="radio"
            name="calendar-mode"
            value={option.value}
            checked={option.value === mode}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
    {mode !== "markers" && (
      <button
        type="button"
        className="budget-link-button"
        onClick={() => onChange("markers")}
      >
        Masquer les montants
      </button>
    )}
  </div>
);
