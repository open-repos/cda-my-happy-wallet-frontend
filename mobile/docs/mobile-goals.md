# Objectifs financiers sur mobile

L'onglet « Objectifs et événements » commence par la section « Objectifs
financiers » (#226), au-dessus des événements mensuels (#225). Elle liste les
objectifs et permet de les créer, modifier et supprimer.

## Contrat

Même contrat que le Web (`src/js/services/goalsService.js`,
`docs/web-financial-goals.md`) :

- `GET /v1/goals?limit=100[&cursor=…]`, toutes les pages lues, curseur
  répété refusé ;
- `POST /v1/goals`, `PUT /v1/goals/{id}`, `DELETE /v1/goals/{id}` ;
- corps : `title`, `targetAmount`, `savedAmount`, `monthlyContribution`
  (deux décimales), `currency` (`EUR`), `targetDate` (facultative) ;
- réponse : l'objectif et sa `forecast` (statut, reste, versements
  nécessaires, mois d'atteinte estimé, versement requis), calculée par l'API
  et jamais recalculée ici.

Domaine : `src/features/goals/domain/financialGoal.ts` (lecture stricte,
pourcentage atteint plafonné à 100 et arrondi à l'inférieur, phrases de
prévision et messages de validation identiques au Web). Le tableau de bord
garde sa lecture souple de `/goals` (`src/features/charts/chartData.ts`).

## Comportement

- Progression exposée aux lecteurs d'écran (`progressbar`, valeur 0 à 100 et
  montants dans le nom), pas seulement par la barre.
- Chargement, erreur et liste vide de la section n'empêchent pas d'afficher
  les événements, et inversement.
- Suppression confirmée dans le formulaire ; échecs affichés et annoncés dans
  la fenêtre du formulaire.
- `ajuster=<id>&demande=<jeton>` dans l'URL de l'onglet ouvre l'objectif en
  modification, une fois par demande : entrée de « Ajuster le versement »
  (#217). Le jeton rend chaque demande unique, car les onglets restent montés.
- `src/design/RadioGroup.tsx` est partagé avec le formulaire des événements.

## Recette

Parcours Playwright `manages financial goals from the objectives tab (#226)`
sur l'export Web, API simulée par `scripts/serve-export.mjs`. À valider sur
development build Android : création, modification, suppression, lecture de
la progression par TalkBack, grandes polices.
