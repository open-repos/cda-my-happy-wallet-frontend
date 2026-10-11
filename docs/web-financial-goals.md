# Objectifs financiers Web

La page authentifiée `/objectifs-evenements` (« Objectifs et événements »)
commence par la section **Objectifs financiers**, puis les événements
mensuels existants.

## Données

`GET /v1/goals` (toutes les pages), `POST /v1/goals`, `PUT /v1/goals/{id}` et
`DELETE /v1/goals/{id}`, contrat backend `docs/financial-goals.md`. Les corps
envoyés ne contiennent que `title`, `targetAmount`, `savedAmount`,
`monthlyContribution`, `currency` (EUR) et `targetDate` (facultative).
Après toute écriture, la liste est rechargée car la prévision est calculée par
le backend.

## Affichage

- Carte par objectif : anneau ECharts d'atteinte (épargne plafonnée à la cible,
  pourcentage arrondi à l'inférieur, libellé accessible complet), montant visé,
  épargne, versement mensuel, date souhaitée.
- Statut de la prévision en badge (`Atteint`, `Sans échéance`, `Dans les
temps`, `En retard`, `Échéance dépassée`) et phrase explicative : mois
  d'atteinte estimé, versement mensuel nécessaire pour tenir la date, ou
  invitation à saisir un versement.
- États chargement, erreur avec « Réessayer », premier objectif (« C’est
  parti ») et succès; messages d'action en `role=status`, erreurs en
  `role=alert`.

## Formulaire

Titre (2 à 50 caractères), montant cible (> 0), déjà épargné et versement
mensuel (≥ 0), deux décimales et au plus 99 999 999,99; date souhaitée
facultative et valide. Les montants sont normalisés à deux décimales. La
suppression demande une confirmation; `Échap` ferme le formulaire. Un refus
`422` du backend est expliqué.

## Références UX

Nœuds Figma `403:27562`, `403:27591`, `403:27619`, `403:27645` et `403:27700`
relus le 11 octobre 2026 : section objectifs au-dessus des événements, cartes
avec anneau, titre, montant et date, bouton d'ajout et premier objectif. La
mention « jusqu'à 3 objectifs maximum » du wireframe n'est pas appliquée : le
contrat backend ne fixe aucune limite.
