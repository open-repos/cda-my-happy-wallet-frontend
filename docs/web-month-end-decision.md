# Décision de fin de mois Web/PWA

Issue [#396](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/396),
parent #394 ; dépend du backend #184 (PR #188 fusionnée dans `develop`) et du
Coffre #395. Contrat :
[`month-end-decisions.md`](https://github.com/open-repos/cda-my-happy-wallet-backend/blob/develop/docs/month-end-decisions.md).
Maquette validée par le propriétaire le 9 novembre 2026, cloche comprise.

## Formule

Le solde disponible avant décision inclut le report entrant.

```text
report = solde avant décision − épargne + prélèvements d’épargne + entrée exceptionnelle
```

Exemples : 150 € dont 100 € épargnés → 50 € reportés ; une dépense oubliée de
30 € laisse l’épargne à 100 € et ramène le report à 20 € ; un déficit de 150 €
couvert par 50 € d’épargne et 70 € d’entrée exceptionnelle laisse −30 €.

L’interface calcule seulement un **aperçu** en centimes entiers pendant la
saisie. Après validation, les montants affichés sont ceux relus sur le serveur.

## Parcours

- **Proposition** : `MonthEndProvider` (espace connecté) lit la décision du
  dernier mois clos selon la date civile `Europe/Paris`. Si elle est en attente
  avec un solde non nul, l’Accueil affiche un bandeau. « Plus tard » le réduit en
  rappel pour la session ; sans réponse, tout le solde reste reporté.
- **Décider** : `/fin-de-mois/:month`. Excédent : tout reporter, tout épargner
  ou répartir sur un ou plusieurs comptes. Déficit : tout reporter ou couvrir
  par prélèvements d’épargne et/ou une entrée exceptionnelle. Les erreurs
  s’affichent sous le champ et dans un résumé ; le focus va au premier champ
  invalide. Un mois courant ou futur n’est pas décidable.
- **Consultation et modification** : la page affiche la révision, la
  répartition et le calcul du report ; « Modifier la décision » rouvre le
  formulaire prérempli. Une révision peut conserver un prélèvement déjà fait.
- **Correction** : `requiresReview` affiche « À revoir » avec l’ancien et le
  nouveau report ; l’épargne n’est jamais modifiée automatiquement. « Garder ma
  décision » renvoie la même répartition (nouvelle référence, aucun virement).
- **Résumé et report** : le bilan d’un mois clos (calendrier, `?mois=AAAA-MM`)
  montre la décision ou invite à décider ; l’aide du report et le détail du
  calcul (#392) ajoutent des lignes « dont » qui ne s’additionnent pas.
- **Virements** : les versements mensuels prévus (`/savings-occurrences/pending`)
  se confirment ou se refusent depuis le calendrier, le Coffre et la cloche ; le
  virement manuel reste celui du Coffre. L’historique d’un compte libelle les
  mouvements de fin de mois, leur révision et les compensations.
- **Cloche** : en bureau dans la rangée « Mon budget » de la navigation (sans
  décaler le contenu ni la navigation), sous 1200 px dans l’en-tête. Elle liste
  la décision en attente, la décision à revoir et les versements à confirmer.
  Aucune nouvelle API, ni push, ni état « lu » : le centre complet est suivi dans
  le parent #414.

## Écritures et erreurs

`PUT` envoie `expectedRevision` et une clé d’idempotence par tentative. Une
réponse incertaine conserve la même clé tant que la répartition est identique ;
après `REVISION_CONFLICT`, la page relit la décision. Les codes du contrat sont
traduits dans `monthEndService`. L’historique du compte courant accepte la
source `EXCEPTIONAL_INCOME` ; les Analyses affichent la catégorie système `0`
« Entrée exceptionnelle » sans couleur propre.

## Hors périmètre

Recettes d’annonces vocales (V2) ; centre de notifications complet (#414) ;
application mobile (#397).
