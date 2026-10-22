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

Le scénario et la révision font partie de la clé de chaque lecture : une
réponse d'un autre scénario ou d'une ancienne révision ne remplace jamais la
vue courante, et les montants de l'autre scénario sont masqués pendant le
recalcul. La révision augmentera avec les écritures de la Simulation (#241).

## Comparaison

Pour le mois affiché (courant ou futur), deux prévisions d'un mois sont lues,
habituelle et avec la Simulation : « Prévision habituelle → Avec la
Simulation ». Elles doivent avoir mêmes fenêtre, devise et date de référence
(`compareScenarios`) ; sinon une erreur propose « Réessayer ». Un mois passé
indique que son bilan reste inchangé. Aucun calcul financier n'est fait sur
mobile.

## Vérification

Tests unitaires `scenario.test.ts` et passerelles ; parcours Playwright
« reads the budget with the simulation scenario (#240) » sur l'export Web,
avec un faux backend qui réduit le premier mois de 250 € en Simulation.
