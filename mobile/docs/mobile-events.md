# Événements mensuels sur mobile

L'onglet « Objectifs et événements » liste les événements mensuels confirmés
et permet de les créer, modifier et supprimer (#225). Les objectifs
financiers rejoindront cet écran avec #226.

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

L'API accepte cinq répétitions et la lecture les accepte toutes. Le
formulaire mobile propose « Une seule fois » et « Chaque mois » ; un
événement créé sur le Web avec une autre répétition la garde dans le
formulaire, pour ne jamais la modifier à l'insu de la personne. Le choix
complet arrive avec #216.

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
