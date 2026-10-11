# Accueil Web : reste à vivre

La route authentifiée `/home` affiche le reste à vivre du mois civil courant
(horloge `Europe/Paris`, comme le backend) et remplace l'ancien calcul local
fondé sur les seules charges et revenus fixes. Sans charge ni revenu fixe,
l'écran d'accueil invitant à les saisir reste affiché.

## Données consommées

- `GET /v1/budget-periods/{mois}/summary?currency=EUR` : montant principal.
- `GET /v1/operations?from=&to=&currency=EUR&limit=100` : toutes les pages
  du mois, agrégées côté client en dépenses par catégorie (l'API n'expose pas
  d'agrégat). Les entrées et les autres devises sont ignorées.
- `GET /v1/operation-categories` : noms et couleurs des catégories.
- `GET /v1/goals` : toutes les pages d'objectifs, en euros.

Chaque bloc a son propre état chargement, erreur avec `Réessayer`, vide et
succès : un échec des objectifs n'empêche pas d'afficher le reste à vivre.

## Montant selon la période

Tous les calculs se font en centimes entiers.

| Période | Montant                                                               |
| ------- | --------------------------------------------------------------------- |
| Mois    | `realRemaining`, avec la ligne « Report de <mois> » distincte         |
| Semaine | disponible prudent/jour × min(7, jours restants du mois)              |
| Jour    | disponible prudent/jour (jour courant inclus dans les jours restants) |

Sans prévisionnel (`forecast: null`), le disponible réel par jour sert de
base et l'explication le dit. Un montant négatif est conservé et expliqué
comme l'effort nécessaire pour finir le mois à l'équilibre. Sans jour
restant, aucun montant n'est affiché.

## Graphiques

- Dépenses : barres horizontales triées par montant, plus lisibles en mobile
  que les barres verticales du wireframe. Chaque ligne affiche nom et montant,
  ce qui constitue l'équivalent textuel; les barres sont décoratives.
- Objectifs : anneau d'atteinte globale (épargne plafonnée à la cible de chaque
  objectif, pourcentage arrondi à l'inférieur) avec un libellé accessible
  complet, suivi de la liste des objectifs.

## Références UX

Nœuds Figma `403:28042`, `403:28081`, `403:28124`, `403:28167`, `403:28210` et
`403:28249`, relus le 11 octobre 2026. Les tokens du design system remplacent
les valeurs des wireframes.
