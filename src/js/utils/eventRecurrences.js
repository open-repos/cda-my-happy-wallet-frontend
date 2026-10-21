export const EVENT_RECURRENCE_OPTIONS = [
  { value: "AUCUNE", label: "Une seule fois" },
  { value: "HEBDOMADAIRE", label: "Chaque semaine" },
  { value: "MENSUELLE", label: "Chaque mois" },
  { value: "TRIMESTRIELLE", label: "Chaque trimestre" },
  { value: "ANNUELLE", label: "Chaque année" },
];

export const isEventRecurrence = (value) =>
  EVENT_RECURRENCE_OPTIONS.some((option) => option.value === value);

export const isRepeatingEvent = (value) =>
  value !== "AUCUNE" && isEventRecurrence(value);

export const eventRecurrenceLabel = (value) =>
  EVENT_RECURRENCE_OPTIONS.find((option) => option.value === value)?.label ??
  "Répétition inconnue";
