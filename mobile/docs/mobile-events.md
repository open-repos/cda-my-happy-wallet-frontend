# Événements mensuels sur mobile

L'onglet « Objectifs et événements » liste les événements mensuels confirmés
et permet de les créer, modifier et supprimer (#225), sous la section des
objectifs financiers (#226, `mobile-goals.md`).

## Contrat

Même contrat que le Web (`src/js/services/monthlyEventsService.js`,
`docs/web-calendar-events.md`) :

- `GET /v1/events?limit=100[&cursor=…]`, toutes les pages lues, curseur
  répété refusé ;
- `POST /v1/events`, `PUT /v1/events/{id}`, `DELETE /v1/events/{id}` ;
- corps : `title`, `amount` (deux décimales), `currency` (`EUR`), `kind`
  (`DEPENSE` ou `ENTREE`), `startDate`, `recurrence`, `endDate` (incluse,
  `null` sans répétition ou sans fin).

Domaine : `src/features/events/domain/monthlyEvent.ts` (lecture stricte,
validations et messages du Web, montant avec virgule accepté). Passerelle :
`src/features/events/infrastructure/HttpMonthlyEventsGateway.ts`.

## Répétitions

Le formulaire propose les cinq répétitions du Web (#216) : une seule fois,
chaque semaine, chaque mois, chaque trimestre et chaque année, avec une date
de fin incluse facultative. Le sélecteur de la date de fin refuse les jours
antérieurs à la date de début, et son bouton « Aujourd’hui » se nomme
« Date de fin incluse : aujourd’hui » pour le distinguer de celui du début.
Dans le formulaire des objectifs, il se nomme de même « Date souhaitée :
aujourd’hui » ; celui des opérations garde le nom « Aujourd’hui ».

Le calendrier mobile ne calcule aucune occurrence : il affiche les jours
(`plannedCount`) et la file à traiter (`occurrenceDate`) renvoyés par l'API,
en dates civiles manipulées comme du texte. Les répétitions hebdomadaires,
trimestrielles et annuelles y apparaissent donc aux dates de l'API, sans
décalage de fuseau ni au changement d'heure.

## Comportement

- Suppression confirmée dans le formulaire (`Alert.alert` est sans effet
  sur l'export Web).
- Succès et échecs annoncés par `FeedbackBanner` (région live).
- Le calendrier relit sans bruit la synthèse du mois et les occurrences à
  traiter au retour sur son onglet : un événement créé ou supprimé ici s'y
  reflète.

## Recette

Parcours Playwright `manages monthly events from the objectives tab (#225)`
sur l'export Web (mobile, tablette, bureau), avec l'API simulée de
`scripts/serve-export.mjs`. À valider sur development build Android :
création, modification, suppression, retour au calendrier et grandes polices.
