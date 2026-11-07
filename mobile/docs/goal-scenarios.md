# Trajectoires d’épargne sous hypothèses — #285

Équivalent natif de la comparaison Web #284
([`docs/web-savings-comparison.md`](../../docs/web-savings-comparison.md)),
parent #281. Chaque carte d’objectif propose « Simuler avec mon budget », qui
ouvre une fenêtre plein écran. La jauge de la carte reste l’épargne déclarée.

## Contrat et calculs

Seule source : `POST /v1/savings-capacity/trajectories` (backend #132, dès
backend 1.6.0), même corps que le Web : devise, scénario de la Simulation,
période (12 ou 24 mois, mois courant inclus), objectif et trois hypothèses au
format `"0.00"`. Le mobile ne calcule ni allocation, ni capacité, ni cumul, ni
date. Domaine : `src/features/goals/domain/savingsTrajectory.ts` (port strict du
parseur Web) ; passerelle : `HttpSavingsTrajectoryGateway`.

Le parseur refuse une réponse incohérente avec la requête (devise, scénario,
objectif, hypothèses), des points ou mois manquants, des allocations dupliquées,
un point de départ différent de l’épargne déclarée, une date d’atteinte hors
période ou non finançable, et des montants non sûrs. Les champs privés ne sont
pas conservés. Un objectif modifié pendant la lecture (`StaleGoalError`) affiche
« Actualiser les objectifs » au lieu de mêler deux états.

## Écran

- Trois hypothèses, à zéro au départ : complément variable **restant** du mois
  courant, complément variable par mois futur et marge mensuelle non allouée.
  Saisie identique au Web (virgule ou point, espaces de groupement, deux
  décimales, positive). « Appliquer les hypothèses » relance le calcul ; un
  brouillon non appliqué est signalé ; « Réinitialiser » remet tout à zéro.
- Trois résultats : rythme prévu, maximum théorique, estimation raisonnable,
  avec la date finançable (ou sa raison : déjà atteint, sans versement, hors
  période, budget déficitaire), le premier mois futur daté et la date nominale
  quand elle diffère.
- Graphique ECharts SVG (`LineChart` et `MarkLine` ajoutés au moteur existant,
  sans dépendance) : traits et symboles distincts, losange vide pour un point
  non finançable, repères de cible, de date souhaitée et d’atteinte, sans
  grille ni animation. Chaque courbe peut être masquée (cases à cocher).
- « Lire les trois trajectoires en tableau » et « Comprendre le mois courant et
  l’allocation » : sections repliables lisibles sans le graphique.

Le calcul suit le scénario et la révision de la Simulation ; une réponse
obsolète est ignorée et les anciens résultats sont masqués pendant un nouveau
calcul. Une erreur garde les hypothèses et propose « Réessayer la
comparaison ».

## Accessibilité

Graphique caché des lecteurs d’écran, remplacé par le texte et le tableau ;
lignes du tableau lues en un seul arrêt ; cases à cocher `aria-checked` ;
sections repliables `expanded` ; « Comparaison recalculée. » et l’erreur de
saisie annoncées ; cibles d’au moins 48 dp ; thèmes clair et sombre.

## Vérification

- Tests unitaires sur `test/fixtures/savingsTrajectories.json`, générées par le
  backend réel et partagées avec le Web (lues par chemin relatif, sans copie).
- Playwright `test/visual/goal-scenarios.spec.ts` : corps envoyé, dates des trois
  trajectoires, brouillon, saisie invalide, période de 12 mois, erreur et
  reprise, conflit d’objectif, tableau de 24 mois, légende, sans débordement.
- Recette development build Android (grandes polices, TalkBack) et iOS
  regroupée avec la recette de fin de parité #213.
