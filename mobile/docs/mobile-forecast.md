# Prochains mois sur mobile

L'écran « Prochains mois » (#214) affiche la prévision du mois courant et
des mois suivants. Il s'ouvre depuis la carte « Prochains mois » de l'accueil
et le lien « Prochains mois » du calendrier (route `upcoming-months`, hors
barre d'onglets).

## Contrat

Même contrat et mêmes contrôles que le Web
(`src/js/services/budgetForecastService.js`, `docs/web-budget-forecast.md`) :

- `GET /v1/budget-forecast?from=AAAA-MM&months=N&currency=EUR`, `N` de 1 à
  24, requête invalide refusée avant l'appel ;
- réponse refusée si les mois ne se suivent pas à partir de `from`, si un
  montant n'est pas un montant signé à deux décimales, si `remainingDays` sort
  de 1 à 31, ou si elle ne correspond pas à la requête (autre `from`, autre
  devise, nombre de mois partiel) ; une liste vide est acceptée.

Domaine : `src/features/forecast/domain/budgetForecast.ts`. Passerelle :
`src/features/forecast/infrastructure/HttpBudgetForecastGateway.ts`.

## Affichage

- Horizon de 3, 6 (par défaut) ou 12 mois ; le Web propose aussi 24 mois et
  un mois de départ. La Simulation arrive avec #218.
- Une carte par mois, avec les mêmes lignes et le même ordre que le tableau
  du Web : report, entrées et dépenses prévues, épargne des objectifs, reste
  de fin de mois, disponible par mois, semaine et jour.
- Un reste de fin de mois négatif est signalé par le badge texte « Solde
  négatif » avec une icône et une note explicative, pas seulement par la
  couleur ; les montants gardent leur signe moins.
- Chargement, erreur avec relance et prévision vide passent par
  `FeedbackState`. Au retour sur l'écran, la prévision est relue sans repasser
  par le chargement.

## Recette

Parcours Playwright `shows upcoming months from the dashboard and the
calendar (#214)` sur l'export Web, API simulée par `scripts/serve-export.mjs`.
À valider sur development build Android, grandes polices comprises.
