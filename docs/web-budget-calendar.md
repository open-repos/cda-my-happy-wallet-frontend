# Calendrier budgétaire Web

La route authentifiée `/calendrier` réunit la synthèse du mois, la grille
calendaire, les événements à traiter et les opérations du mois ou du jour.

## Données consommées

- `GET /v1/budget-periods/{month}/summary?currency=EUR` : synthèse et au plus
  31 points journaliers. Un mois futur répond `FUTURE_PERIOD` : la page
  l'explique et garde les événements prévus visibles.
- `GET /v1/event-occurrences/pending?through=<fin du mois>` : file à traiter.
- `GET /v1/operations?from=&to=&currency=EUR` : opérations du mois ou du jour
  sélectionné, paginées par curseur.
- `POST /v1/event-occurrences/{eventId}/{date}/realize|cancel` : conversion
  et annulation. Après toute écriture, synthèse, file et liste sont rechargées
  car une correction d'un mois passé recalcule les reports.

## Lecture du budget

- **Reste réel** : décomposé en « Report de <mois précédent> » (ligne distincte
  et signée), « Résultat du mois » et total. Une phrase indique si un déficit
  est déduit ou un excédent ajouté. La ligne de report est masquée pour le
  premier mois suivi (`carryFromMonth = null`).
- **Reste prévisionnel** : reste réel, dépenses et entrées prévues, épargne des
  objectifs; le nombre d'événements en retard est signalé.
- **Disponible prudent par jour** : reste prévisionnel réparti sur les jours
  restants, avec une explication des valeurs négatives.
- **Mois passé** : bilan `Positif`, `À l’équilibre` ou `Négatif`, mention
  « Bilan corrigé le … » lorsque `correctedAt` est renseigné et nombre
  d'événements restés sans décision.

## Grille et liste

La commande `Repères | Dépenses | Prévisionnel` change la seule valeur courte
de chaque jour; la préférence est mémorisée sur l'appareil. Les repères
distinguent opération réelle (point plein), événement prévu (cercle pointillé)
et événement en retard (pictogramme `!`), avec une légende et un libellé
accessible complet par jour. Un clic filtre la liste sur le jour; un second
clic ou `Tout le mois` retire le filtre. `Ajouter une opération` préremplit la
date sélectionnée. La conversion préremplit titre, montant et date; une
occurrence d'un mois passé propose la date du jour, car le backend refuse une
réalisation rétroactive (`PERIOD_CLOSED`).

## Références UX

Nœuds Figma `403:27863`, `403:28042`, `403:28124` et `403:28210` relus avec le
MCP le 11 octobre 2026; complément produit du 19 septembre et décision report
de solde du 11 octobre. Les tokens versionnés remplacent les valeurs des
wireframes. Les vues Mois/Semaine/Jour de l'accueil sont suivies par #99.
