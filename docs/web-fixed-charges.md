# Charges fixes Web et PWA

La page `/home/operations-fixes` permet de créer, modifier et supprimer une
charge fixe en conservant son montant total par échéance. Les revenus fixes
conservent leur formulaire et leur fonctionnement mensuel.

## Saisie et lecture

Cinq périodicités : mensuelle, bimestrielle (tous les deux mois), trimestrielle,
semestrielle et annuelle. « Répartition de la charge » contient « Ma part de la
charge (%) », initialement 100 %. 50 % représente par exemple un partage égal
à deux ; 40 %, 33,33 % et 0 % sont acceptés. Aucun autre participant ni compte
n'est renseigné.

Le total doit être compris entre 0,01 et 99 999 999,99 ; le pourcentage entre
0 et 100 inclus. Deux décimales au maximum ; virgule ou point à la saisie.
Les erreurs sont reliées au champ, avec focus sur la première erreur et
annonce accessible. Échap ou Annuler ferme le formulaire. Une confirmation
explicite précède la suppression. Les états chargement, erreur et succès
utilisent les régions persistantes de `LiveMessage`.

L'aperçu donne le total, la part personnelle par échéance et la part mensuelle.
Exemples : 1 000 €/mois à 40 % = 400 €/mois ; 120 €/an à 50 % = 60 € par
échéance et 5 €/mois. Seul cet aperçu calcule localement : centimes entiers et
centièmes de pourcentage, puis arrondi demi-centime vers le haut à la fin de
chaque calcul. Le mensuel ne réutilise pas une part par échéance déjà arrondie.
Ainsi 0,11 €/an à 50 % donne 0,06 € par échéance et 0,00 €/mois.

La liste affiche les montants calculés reçus du serveur. Pour les anciennes
lignes dépourvues des deux nouveaux champs, les défauts sont mensuelle/100 %
et le montant existant reste la part personnelle ; il n'est pas redivisé.

## Budget et événements

La mensualisation représente un coût moyen, sans réserve, cumul de provision,
rattrapage à l'approche d'un prélèvement ou date de paiement. Aucun événement,
opération ou remboursement n'est créé automatiquement. Une aide demande de
ne pas ressaisir comme événement ou opération une charge déjà intégrée au
budget fixe : l'application ne détecte pas automatiquement ces doublons.

Après une création, modification ou suppression réussie, la liste est relue et
la révision budgétaire commune est invalidée (`SimulationContext`). L'accueil,
le calendrier, les prochains mois et les capacités d'épargne relisent leurs
réponses serveur ; aucune part affichée dans le formulaire n'est soustraite à
nouveau. Le budget de la page des charges utilise aussi la synthèse du mois
courant, en euros, à la place de l'ancien calcul local. Les devises restent
séparées. Les mois clôturés conservent leurs snapshots ; le mois ouvert relit
les charges à la prochaine synthèse.

Une écriture réussie suivie d'une relecture en échec est annoncée comme
**enregistrée** : réessayer recharge seulement la liste, sans rejouer l'écriture.
Un échec de l'écriture conserve la saisie pour correction ou nouvelle tentative.

## Contrat et livraison

Contrat backend livré par [#123](https://github.com/open-repos/cda-my-happy-wallet-backend/pull/123),
fusionné dans `develop` au commit `ad8f841630e3fdb8f885b93a9ed9c20d3aeb9ece` :
`docs/fixed-charge-budgeting.md` du backend. La migration additive et le nouveau
backend doivent être déployés avant cette interface. Le déploiement reste
manuel ; cette PR ne publie aucune version.

- GET `/v1/operations-fixes/charges` : toutes les pages par curseur opaque.
- POST collection / PUT `/v1/operations-fixes/charges/:id` : `titre`, `montant`,
  `devise`, `periodicite`, `pourcentagePersonnel` uniquement.
- DELETE route unitaire ; les PUT/DELETE n'ont pas de `data`, donc relecture.
- Liste/création : `montantPersonnel` et `montantMensuelPersonnel` au format
  décimal à deux chiffres. Aucun identifiant propriétaire envoyé.

Aucune dépendance npm ajoutée ou mise à jour. La pile E2E jetable est épinglée
sur ce commit backend, pour tester ce contrat réel dans la CI existante, sans
changer de workflow. Un retour à une ancienne application ignorant ces champs
fausserait les charges partagées/non mensuelles : privilégier un correctif
compatible après leur activation.

## Vérification

- `test/vitest/fixedChargeAmounts.test.js` : cinq périodicités × 100/50/40 %,
  bornes, précision, 0 %, 33,33 %, demi-centimes et anciennes lignes.
- `fixedCharges.test.jsx` : création, relecture, édition, suppression confirmée,
  erreurs, double soumission et accessibilité de la saisie.
- `fixedChargesBudget.test.jsx` : toutes les mutations rechargent l'accueil,
  le calendrier et les prévisions sans double déduction (services simulés).
- `fixedChargesService.test.js` : pagination et contrat HTTP.
- `test/e2e/fixedCharges.spec.js` : interface à 390/768/1440 px, persistance
  simulée, clavier, erreurs et absence de débordement.
- Le parcours `fixed-charges` de `test/full-stack/journeys/wallet.spec.js`
  vérifie la persistance réelle, les synthèses, la suppression et l'absence
  d'écriture d'événement/opération dans la pile jetable de la CI.

Ces scénarios ne constituent pas une validation d'un déploiement de production
ni une recette VoiceOver sur iPhone. L'intégration/staging après fusion des deux
enfants reste suivie dans le parent #237.
