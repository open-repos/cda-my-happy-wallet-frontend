# Calendrier et événements Web

Les routes authentifiées `/calendrier` et `/objectifs-evenements` consomment
le contrat API `/v1/events` et `/v1/event-occurrences`.

## Comportement

- Le calendrier charge les occurrences du mois affiché, signale les jours qui
  contiennent un événement et détaille le jour sélectionné.
- La page des événements propose une seule fois, chaque semaine, chaque mois,
  chaque trimestre et chaque année. La date de fin est facultative pour les
  répétitions, inclusive, et ne peut pas précéder la date de début. Revenir à
  « Une seule fois » retire cette date de fin.
- Après sélection d'un jour, le calendrier propose le même formulaire avec
  « Ajouter un événement prévu ». La date sélectionnée est préremplie. Après sauvegarde, les règles,
  les occurrences, la synthèse et la file à traiter sont rechargées.
- Le backend calcule toutes les dates : pas de génération de répétition dans le
  navigateur. Les répétitions mensuelles, trimestrielles et annuelles conservent
  le jour initial comme ancrage, borné au dernier jour des mois plus courts.
  Les répétitions hebdomadaires suivent des pas de sept jours. Plusieurs dates
  d'une même règle restent distinctes dans le calendrier et la file à traiter.
- Les contrôles natifs restent utilisables au clavier ; le formulaire place le
  focus sur le titre, puis sur le premier champ invalide en cas d'erreur. La
  fermeture par Échap rend le focus au bouton qui l'a ouvert.
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

`test/vitest/eventRecurrences.test.jsx` couvre les répétitions, les dates de fin
et le focus d'erreur. `test/e2e/eventRecurrences.spec.js` vérifie création depuis
le calendrier, édition, dates préremplies, occurrences hebdomadaires multiples,
clavier et absence de débordement aux trois largeurs. Le scénario reste simulé
à la frontière HTTP, sans données financières réelles.
