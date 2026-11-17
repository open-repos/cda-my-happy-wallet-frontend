# Reste à vivre actualisé et théorique sur l'Accueil mobile (#393)

Équivalent natif de l'Accueil Web de #392
([`docs/web-home-budget.md`](../../docs/web-home-budget.md)), sous le parent
#391. Maquettes A (accueil) et C (détail) validées par le propriétaire le
6 novembre 2026. Le calendrier Prévisionnel relève de #428.

## Règle

Tous les montants viennent du résumé du mois
(`GET /budget-periods/:mois/summary`). Les seuls calculs de présentation sont
les proratas Jour et Semaine, en centimes entiers
(`src/features/budget/domain/theoreticalRemaining.ts`).

| Période | Actualisé                                                   | Théorique                        |
| ------- | ----------------------------------------------------------- | -------------------------------- |
| Mois    | `forecast.forecastRemaining`, ou `realRemaining` sans prévu | `base`                           |
| Semaine | disponible prudent/jour × min(7, jours restants du mois)    | part quotidienne × la même borne |
| Jour    | disponible prudent/jour (réel/jour sans prévisionnel)       | part quotidienne                 |

La part quotidienne suit la règle serveur de `dailyRemaining` :
`base ÷ jours du mois`, tronqué au centime vers zéro. Sans jour restant, la
période n'affiche aucun montant. Le parseur exige `base`, `actualIncome` et
`actualExpense`, comme le Web ; `reconciliationAdjustment` et
`forecast.envelopeReserve` restent facultatifs.

## Accueil

- Carte en tête de la synthèse : choix Mois, Semaine ou Jour (`RadioGroup`,
  Mois par défaut, annonce du nouveau montant), actualisé en grand puis
  `/ <théorique> théorique`, barre (`progressbar`, `aria-valuenow`), phrase
  d'écart (« Égal à votre part théorique » si nul) et explication de la
  période, avec les phrases du Web.
- Encadré « Ce mois-ci » : actualisé et théorique côte à côte, quelle que soit
  la période choisie.
- « Voir le détail du calcul » est dans cette carte et s'affiche toujours. Les
  cartes « Reste réel », « Reste prévisionnel » et « Disponible prudent par
  jour » restent en dessous.

## Détail du calcul

La feuille de #420 est étendue (décision du propriétaire, 15 novembre 2026) :
théorique, entrées reçues, dépenses faites, rapprochement des enveloppes s'il
existe, report (avec les lignes « dont » de la décision de #420, qui ne
s'ajoutent pas), entrées et dépenses prévues, épargne des objectifs, réserve
des enveloppes si elle existe, puis l'actualisé. La section « Par jour »
compare l'actualisé du jour à la part théorique. Le contenu défile ; le titre
et « Fermer » restent visibles.

## Tests

- Unitaires : `theoreticalRemaining.test.ts` (troncature sur 28, 29, 30 et 31
  jours, base négative, périodes, semaine bornée, écart nul, sans prévu, mois
  terminé), `calculationDetail.test.ts` (cascade qui retombe sur le total,
  lignes « dont », comparaison par jour), `budgetSummary.test.ts` (contrat).
- Visuels : `test/visual/remaining-comparison.spec.ts` sur téléphone, tablette
  et bureau (trois périodes, cibles de 48 px, détail défilant, texte ×1,3).
