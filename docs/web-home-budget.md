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
- `GET /v1/operation-categories` : noms, couleurs et icônes des catégories.
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

Les graphiques utilisent Apache ECharts `6.1.0` (version exacte), rendu canvas :

- `src/js/components/charts/echarts.js` enregistre les seuls modules utilisés
  (barres, lignes, secteurs, grille, infobulle, légende, rendu canvas).
  Un nouveau type de graphique s'ajoute là, pour garder le bundle maîtrisé.
- `EChart.jsx` est un wrapper React minimal : création, `setOption` sans fusion,
  redimensionnement via `ResizeObserver` et libération au démontage. Le
  paquet `echarts-for-react` n'est pas utilisé (voir la décision ci-dessous).
- `useChartTokens` transmet au canvas les tokens du design system et se met à
  jour au changement de thème clair/sombre; l'animation est coupée si
  `prefers-reduced-motion` est actif.
- Les options sont des fonctions pures (`homeChartOptions.js`) testées sans
  canvas.

Cartes de l'accueil :

- Dépenses : barres horizontales triées avec le montant affiché sur chaque
  barre, ou secteurs (bascule `Barres | Secteurs`) dont la légende, non
  cliquable, donne montant et part en fr-FR. Le conteneur porte un libellé
  accessible français et une liste réservée aux lecteurs d'écran donne chaque
  catégorie et son montant. L'aria automatique d'ECharts est désactivé : il
  remplacerait ce libellé par une description anglaise. L'icône Font Awesome
  d'une catégorie (#131), dans sa couleur, précède son nom sur l'axe des
  barres et remplace le symbole de sa légende en secteurs, une fois les
  tracés chargés (voir `web-categories.md`).
- Objectifs : anneau d'atteinte globale (épargne plafonnée à la cible de chaque
  objectif, pourcentage arrondi à l'inférieur) avec libellé accessible complet,
  suivi de la liste visible des objectifs.

L'explorateur configurable (indicateur, type de graphique, regroupement par
jour, semaine, mois, année ou catégorie) est suivi par des issues dédiées,
avec un agrégat calculé côté backend.

## Décision : bibliothèque de graphiques

ECharts a été retenu le 11 octobre 2026 pour ses performances canvas, le
changement de type de graphique par simple option, ses imports modulaires,
son accessibilité intégrée et son portage React Native pour le mobile.
`echarts-for-react` est écarté : trois versions non marquées `latest` ont été
publiées en dix minutes le 19 mai 2026; un wrapper interne de quelques lignes
évite cette dépendance. Retour arrière : retirer `echarts` et revenir au
commit précédent de l'accueil.

## Références UX

Nœuds Figma `403:28042`, `403:28081`, `403:28124`, `403:28167`, `403:28210` et
`403:28249`, relus le 11 octobre 2026. Les tokens du design system remplacent
les valeurs des wireframes.
