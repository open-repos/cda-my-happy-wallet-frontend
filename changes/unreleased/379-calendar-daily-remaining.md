---
type: changed
issue: 379
user: En mode Prévisionnel, chaque jour du calendrier affiche votre reste à vivre du jour, mis à jour avec les dépenses et les événements prévus.
---

Calendar cells in Prévisionnel mode now show the backend `dailyRemaining` value (cumulative daily share of the base remaining minus expenses plus income, recorded or planned, up to that day) instead of the month-end `forecastRemaining`; the accessible label reads « reste à vivre du jour » and the selected-day panel explains it. The month summary is unchanged.
