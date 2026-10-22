# Simulation mobile

L'interrupteur « Simulation » (#240) reprend le comportement Web décrit dans
`docs/web-budget-simulation.md` et le contrat backend #112.

## Interrupteur

- Affiché dans le calendrier, les prochains mois et la capacité d'épargne
  (accueil et onglet Objectifs). Un seul état, partagé par les onglets via
  `SimulationProvider` dans `app/(app)/_layout.tsx`.
- Désactivé à chaque entrée dans la zone authentifiée et jamais persisté :
  quitter la zone (déconnexion) le perd.
- Un texte explique l'effet, avec les phrases du Web.

## Lectures

Avec la Simulation, ces requêtes portent `scenario=simulation` ; sans elle,
elles restent inchangées (`withScenario`) :

| Écran              | Requête                                           |
| ------------------ | ------------------------------------------------- |
| Calendrier         | `GET /budget-periods/:month/summary`              |
| Prochains mois     | `GET /budget-forecast`                            |
| Capacité d'épargne | `GET /savings-capacity` et `GET /budget-forecast` |

La file des événements à traiter et la synthèse de l'accueil restent
habituelles : un potentiel ne se réalise pas avant confirmation.

Le scénario fait partie de la clé de chaque lecture : une réponse d'un autre
scénario ne remplace jamais la vue courante, et les montants de l'autre
scénario sont masqués pendant le recalcul.

## Comparaison

Pour le mois affiché (courant ou futur), deux prévisions d'un mois sont lues,
habituelle et avec la Simulation : « Prévision habituelle → Avec la
Simulation ». Elles doivent avoir mêmes fenêtre, devise et date de référence
(`compareScenarios`) ; sinon une erreur propose « Réessayer ». Un mois passé
indique que son bilan reste inchangé. Aucun calcul financier n'est fait sur
mobile.

## Éléments potentiels (#241)

Le panneau « Éléments potentiels », en bas du calendrier et des prochains
mois, liste toutes les pages de `GET /events?status=POTENTIEL`. Chaque
potentiel a un contour pointillé, un libellé « Potentiel » et sa date
d'expiration : le premier jour du mois suivant `startDate` (mois civil
Europe/Paris du backend ; une série récurrente expire selon son premier
mois). Il ne propose ni réalisation ni annulation d'occurrence.

- Ajouter et modifier passent par le formulaire d'événement (#225, #216) ;
  un potentiel ne peut commencer avant le mois courant (phrase du Web).
- Confirmer (`POST /events/:id/confirm` seulement), supprimer et vider
  (`DELETE /simulation/events`) demandent une confirmation dans le panneau.
- Une seule écriture à la fois (`SimulationProvider.mutate`) ; les refus
  `EXPIRED_POTENTIAL` et `INVALID_STATUS_TRANSITION` sont expliqués avec les
  phrases du Web.

Après une écriture, la révision augmente : liste des potentiels, liste des
événements, calendrier, prévisions, comparaison et capacité d'épargne sont
relus sans bruit (`useQuietRefresh`), comme au retour sur l'écran. Seuls les
premiers chargements et les changements de mois ou de scénario sont annoncés
(#171).

## Vérification

Tests unitaires `scenario.test.ts`, `potential.test.ts` et passerelles ;
parcours Playwright #240 (lectures en scénario) et #241 (confirmer, vider,
refus d'un potentiel expiré, création) sur l'export Web, avec un faux
backend sans état.
