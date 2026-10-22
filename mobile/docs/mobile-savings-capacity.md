# Capacité d'épargne sur mobile

La section « Capacité d'épargne » (#217) reprend celle du Web
(`docs/web-savings-capacity.md`). Elle apparaît sur l'accueil et dans l'onglet
« Objectifs et événements », sous les objectifs financiers.

## Contrat

Comme le Web, le mobile lit ensemble :

- `GET /v1/savings-capacity?from=AAAA-MM&months=1&currency=EUR` : versements
  prévus et requis, reste avant objectifs, après versements prévus et requis,
  indicateur, effort de chaque objectif ;
- `GET /v1/budget-forecast?from=AAAA-MM&months=1&currency=EUR` : disponibles
  par mois, semaine et jour, et jours restants.

Les deux réponses doivent avoir la même date de référence, et le reste après
versements prévus doit égaler le reste de fin de mois de la prévision ; sinon
elles encadrent une modification et ne sont pas mélangées. Lecture stricte dans
`src/features/savings/domain/savingsCapacity.ts` (montants, statuts, objectifs
uniques, objectifs non évaluables ≤ objectifs).

## Affichage

- Mêmes libellés et phrases que le Web ; un montant absent s'affiche
  « Non calculable ». Chaque ligne est lue en un seul arrêt (« libellé :
  montant »).
- Indicateur Tenable, Tendu, Non tenable ou Indéterminé avec son explication.
- Le premier chargement est annoncé ; une actualisation (objectif modifié, retour
  sur l'écran) garde l'affichage et n'annonce que son résultat (règle de
  #171) ; une erreur reste annoncée, avec « Réessayer ».

## Ajuster le versement

- Dans l'onglet Objectifs, le bouton ouvre directement le formulaire de
  l'objectif.
- Sur l'accueil, il ouvre l'onglet Objectifs avec `ajuster=<id>&demande=<jeton>`
  (#226) ; le jeton unique rouvre le formulaire même si le même objectif est
  ajusté deux fois de suite.

## Recette

Parcours Playwright `shows the savings capacity and adjusts a goal (#217)`
(accueil puis onglet Objectifs), API simulée par `scripts/serve-export.mjs`. À
valider sur development build Android, grandes polices comprises.
