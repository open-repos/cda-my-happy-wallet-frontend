# Analyses sur mobile

L'écran « Analyses » (#215) est une version adaptée de l'explorateur Web
(`docs/web-analytics-explorer.md`). Il s'ouvre depuis la carte « Analyses » de
l'accueil (route `analyses`, hors barre d'onglets).

## Choix

| Contrôle      | Mobile                                                        | Web en plus                          |
| ------------- | ------------------------------------------------------------- | ------------------------------------ |
| Indicateur    | Dépenses (`kind=DEPENSE`), Entrées (`kind=ENTREE`), Solde net | —                                    |
| Regrouper par | Catégorie, Mois, Semaine, Jour                                | Année, Type d'opération              |
| Période       | Ce mois, 3 et 12 derniers mois, Année civile                  | Période personnalisée                |
| Graphique     | barres horizontales (catégories), verticales (temps)          | ventilation, lignes, aires, secteurs |

Les presets couvrent des mois complets selon l'horloge `Europe/Paris`.

## Contrat et bornes

`GET /v1/analytics/operations?from&to&currency=EUR&groupBy[&kind]`, même
lecture que le Web (500 points au plus, montants signés à deux décimales,
couleurs `#RRGGBB`). Les bornes de l'API (366 jours, 156 semaines, 120 mois)
sont vérifiées avant l'appel par `rangeProblem` ; les refus métier
`ANALYTICS_RANGE_TOO_LARGE` et `ANALYTICS_QUERY_INVALID` sont expliqués avec
les phrases du Web et ne proposent pas de relance, seule l'erreur réseau en
propose une. Seul le résultat de la dernière requête s'affiche.

## Graphique et accessibilité

- Le graphique ECharts (SVG) est décoratif et masqué aux lecteurs d'écran ;
  la liste « Détail » qui le suit porte chaque valeur en texte.
- Catégories : couleur propre, sinon palette du thème au rang de l'identifiant
  parmi les catégories sans couleur, comme l'accueil et le Web (#172, règle
  commune `src/features/charts/categoryPalette.ts`) ; le résultat attend la
  lecture des catégories, et si elle échoue la palette suit l'ordre
  d'affichage. Catégories triées par montant puis identifiant, montants nuls
  omis.
- Temps : ordre chronologique ; entrées en couleur d'entrée, dépenses en
  couleur de dépense, solde net coloré selon son signe (aussi par catégorie,
  comme sur le Web) ; un solde négatif garde son signe moins.

## Recette

Parcours Playwright `explores analytics from the dashboard (#215)` sur
l'export Web, API simulée par `scripts/serve-export.mjs`. À valider sur
development build Android, grandes polices comprises.
