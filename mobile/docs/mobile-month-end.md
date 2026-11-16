# Décision de fin de mois mobile (#420, #425)

Équivalent natif du cœur de la décision Web (#396,
[`docs/web-month-end-decision.md`](../../docs/web-month-end-decision.md)),
enfant de #397. Contrat : `month-end-decisions.md` du backend (#184). Maquette
`proposals/397-mobile-vault-month-end/` validée par le propriétaire le
11 novembre 2026. Les versements mensuels à confirmer, le Calendrier et la
cloche « À traiter » sont livrés par #425 (section dédiée ci-dessous).

## Formule

Le solde disponible avant décision inclut le report entrant.

```text
report = solde avant décision − épargne + prélèvements d’épargne + entrée exceptionnelle
```

Exemples repris de #396 : 150 € dont 100 € épargnés → 50 € reportés ; une
dépense oubliée de 30 € laisse l’épargne à 100 € et ramène le report à 20 € ;
un déficit de 150 € couvert par 50 € d’épargne et 70 € d’entrée
exceptionnelle laisse −30 €.

Le mobile calcule seulement un **aperçu** en centimes entiers pendant la
saisie (`src/features/month-end/domain/monthEnd.ts`). Après validation,
l’écran relit la décision et les comptes : les montants affichés sont ceux du
serveur.

## Parcours

- **Accueil** : `useHomeMonthEnd` lit la décision du dernier mois clos selon
  la date civile `Europe/Paris` (`previousParisMonth`, comme `vaultToday`).
  Un solde en attente non nul affiche un bandeau ; « Plus tard » le réduit en
  rappel jusqu’à la fermeture de l’application (`postponedMonths`, en
  mémoire). Une décision à revoir affiche « À revoir » ; une décision à jour
  affiche son épargne et son report. Une lecture en échec n’affiche rien : sans
  réponse, tout le solde reste reporté.
- **Détail du calcul** : « Voir le détail du calcul » ouvre une feuille, du
  théorique à l’actualisé depuis #393
  ([`actual-theoretical-remaining.md`](actual-theoretical-remaining.md)). Sous
  le report entrant, les lignes « dont » de la décision ne s’affichent que si
  la décision explique exactement le report du résumé ; elles ne s’ajoutent
  pas au total.
- **Décider** : route cachée `/month-end?mois=AAAA-MM`. Excédent : tout
  reporter, tout épargner ou répartir sur un ou plusieurs comptes. Déficit :
  tout reporter ou couvrir par prélèvements d’épargne et/ou une entrée
  exceptionnelle. Les erreurs s’affichent sous le champ et dans un résumé ; le
  focus va au premier champ invalide. L’aperçu du report et « Valider la
  décision » restent collés en bas ; le bouton flottant d’ajout est masqué sur
  cet écran pour ne pas les recouvrir. Deux colonnes à partir de 768 px.
- **Mois non décidable** : un mois courant, futur ou mal formé affiche « …
  n’est pas encore terminé » sans formulaire ni lecture.
- **Consultation et modification** : révision, répartition et calcul du
  report ; « Modifier la décision » rouvre le formulaire prérempli. Une
  révision peut conserver un prélèvement déjà fait sur un compte dont le solde
  a baissé, et un compte archivé qui porte déjà une allocation.
- **Correction** : `requiresReview` affiche « À revoir » avec l’ancien et le
  nouveau report. L’épargne n’est jamais modifiée automatiquement. « Garder ma
  décision » renvoie la même répartition (nouvelle référence, aucun virement)
  quand elle reste valide pour le nouveau solde.

## Écritures et erreurs

`PUT /budget-periods/:mois/decision` envoie `expectedRevision` et une clé
d’idempotence par tentative (`decision-AAAA-MM-…`, sans le préfixe réservé
`month-end:`). L’issue est classée par `runVaultWrite` (#419) :

- **enregistrée** : la décision et les comptes sont relus ;
- **refusée** : le code `error.details.code` est traduit avec les textes du
  Web ; après `REVISION_CONFLICT`, la décision la plus récente est relue ;
- **incertaine** : les montants restent modifiables ; tant que la répartition,
  la révision attendue et le mois sont identiques, la même clé est renvoyée et
  le serveur rejoue la réponse d’origine sans doublon.

## Coffre et Analyses

L’historique d’un compte d’épargne précise « Décision de fin de mois ·
révision N » et « Compensation » pour les mouvements d’une décision ; la
source `EXCEPTIONAL_INCOME` du compte courant est libellée « Entrée
exceptionnelle de fin de mois ». Les Analyses nomment la catégorie système
`0` « Entrée exceptionnelle », sans couleur propre.

## Tests

- Unitaires : `src/features/month-end/**/*.test.ts` (contrat, trois exemples,
  saisie, clés, détail du calcul, passerelle HTTP, « Plus tard »).
- Visuels : `test/visual/month-end.spec.ts` et
  `test/visual/pending-items.spec.ts` (#425) sur téléphone, tablette et
  bureau (bandeau, décider, décision prise, correction, déficit, réponse
  incertaine, conflit de révision, mois courant, texte ×1,3).

## Versements à confirmer, Calendrier et cloche (#425)

- **Versements mensuels** : `GET /savings-occurrences/pending` (mois courant,
  EUR, toutes les pages, identité compte + mois) liste les versements prévus
  des objectifs rattachés. « Confirmer le virement » et « Ne pas verser »
  envoient `PUT /savings-accounts/:id/occurrences/:mois` avec `CONFIRMED` ou
  `CANCELED` ; le serveur rejoue la même décision en cas de répétition, la
  reprise d’une réponse incertaine est donc sans doublon. La liste est relue
  après l’écriture et l’élément traité disparaît ; `OCCURRENCE_ALREADY_RESOLVED`
  relit aussi la liste. Les textes sont ceux du Web.
- **Coffre** : carte « À confirmer » sous le budget disponible ; une
  confirmation relit aussi comptes et budget disponible.
- **Calendrier** : carte « À traiter » avec les versements du mois courant ;
  pour un mois clos, carte « Résumé du mois » (résultat, report entrant) et la
  décision du résumé (`monthEndDecision`, absent tant que rien n’est décidé),
  avec « Décider » ou « Voir ou modifier la décision ». `?mois=AAAA-MM` ouvre
  un mois passé ou courant, par exemple depuis « Voir le résumé d’octobre » de
  l’écran « Décider » ; le paramètre est ensuite retiré de la route.
- **Cloche** (en-tête de l’Accueil) : nom accessible « À traiter : N
  éléments », feuille listant la décision en attente ou à revoir puis les
  versements ; chaque entrée ouvre son écran. Aucune API dédiée, ni push, ni
  état « lu ». Une lecture en échec n’affiche rien sur l’Accueil ; la feuille
  indique « Certains éléments n’ont pas pu être vérifiés » avec « Réessayer ».

## Hors périmètre

Centre de notifications complet (#414) ; annonces vocales (V2) ; champ de
montant avec calcul (#424).
