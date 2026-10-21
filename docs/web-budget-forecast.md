# Prévision des prochains mois

La route privée `/prochains-mois`, liée depuis l'accueil et le calendrier,
consomme `GET /v1/budget-forecast?from=YYYY-MM&months=N&currency=EUR`.
L'horizon initial est de 12 mois ; les choix proposés sont 3, 6, 12 et 24 mois.
Le début peut être le mois courant ou l'un des 23 suivants, selon la date civile
Europe/Paris. Aucun identifiant de propriétaire ne vient du navigateur.

Le backend calcule les reports et les allocations. Le frontend conserve ses
montants décimaux signés et les présente en euros : entrées/dépenses prévues,
épargne des objectifs, reste de fin de mois et disponible par mois, semaine et
jour. Le disponible mensuel est le reste de fin de mois ; une semaine est limitée
aux jours restants du mois, au plus sept. Les revenus, charges fixes et versements
des objectifs sont le même instantané mensuel que celui de l'API.

Le graphique ECharts représente le reste de fin de mois ; un tableau donne toutes
les valeurs correspondantes. Un déficit est indiqué en texte (« Solde négatif »)
en plus de la couleur. La zone de tableau est défilable au clavier sur petit
écran. Le graphique suit les tokens clair/sombre et la préférence de mouvement.

Les états chargement, erreur avec reprise et réponse vide restent explicites.
Une requête remplacée ou terminée après démontage ne peut réafficher une ancienne
période. Les DTO incomplets, devises/fenêtres inattendues, mois non consécutifs et
montants invalides sont rejetés avant affichage. Aucun résultat n'est persisté
dans le navigateur.

Les suites `budgetForecastService`, `useBudgetForecast`, `upcomingMonthsPage` et
`budgetForecast` couvrent contrat, bornes, concurrence et présentation.
`test/e2e/upcomingMonths.spec.js` couvre les trois largeurs, les deux liens,
le défilement au clavier et les états de chargement/reprise/vide. Les références
visuelles ajoutent cette page dans les deux thèmes aux trois largeurs.

Les parcours Playwright limitent les liens au contenu principal lorsque le menu
présente le même libellé. Les références incluent les nouveaux liens sur
l'accueil et le calendrier, ainsi que le tableau et le graphique dans les deux
thèmes, sur téléphone, tablette et bureau.

Les références de l'accueil et des prochains mois ont été relues dans l'artefact
`web-visual-evidence` du run GitHub `39378873124`, puis reprises depuis ce runner
Ubuntu 24.04 et Chromium 149.0.7827.55. Une génération cloud avec Liberation 1
avait produit des écarts de glyphes et de métriques ; Liberation 2.1.5 (version du
runner) reproduit le texte et les montants, mais les polices de repli du canvas
peuvent encore différer selon la configuration système. Une comparaison locale
verte ne suffit donc pas à approuver de nouvelles références : utiliser le
runner CI de référence et relire les images. La tolérance et les assertions de
géométrie restent inchangées.
