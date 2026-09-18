# Calendrier et événements Web

Les routes authentifiées `/calendrier` et `/objectifs-evenements` consomment
le contrat API `/v1/events` et `/v1/event-occurrences`.

## Comportement

- Le calendrier charge les occurrences du mois affiché, signale les jours qui
  contiennent un événement et détaille le jour sélectionné.
- La page des événements permet de créer, modifier et supprimer une entrée ou
  une dépense ponctuelle ou mensuelle.
- Une récurrence mensuelle conserve le jour de départ comme ancrage. Le backend
  ramène l'occurrence au dernier jour des mois plus courts.
- Les listes paginées sont parcourues avec les curseurs opaques du backend ; le
  frontend ne tente jamais de les interpréter.
- L'identité du propriétaire vient exclusivement de la session authentifiée et
  n'est jamais envoyée dans les corps de requête.

Les états chargement, vide, erreur et succès sont explicites. Les formulaires
valident les mêmes bornes publiques que l'API et demandent une confirmation
avant suppression.

## Références UX

Les nœuds Figma `403:27863`, `403:27903`, `403:27671` et `403:27726` ont été
relus avec le MCP le 18 septembre 2026. Ils guident la hiérarchie du calendrier,
la sélection du jour, les cartes et les actions d'ajout ou de modification.
Les écrans utilisent les tokens versionnés du dépôt et adaptent les wireframes
1440 px aux largeurs mobile, tablette et desktop.

## Validation

Les contrats HTTP et les états d'interface sont couverts par Vitest. Playwright
intercepte les deux collections API et vérifie chaque route protégée sur les
viewports mobile, tablette et desktop.
