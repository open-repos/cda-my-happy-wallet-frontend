# Charges fixes Web et PWA

La page `/home/operations-fixes` permet de créer, modifier et supprimer une
charge fixe en conservant son montant total par échéance. La vue commune permet
aussi de créer, modifier et supprimer les entrées fixes, qui restent mensuelles.

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

## Vue commune charges et entrées — #265

La page « Charges et entrées fixes » réunit les deux collections existantes.
Le tableau au-dessus de 1 023 pixels et les lignes compactes sur petit écran
partagent le même ordre. Les icônes Modifier/Supprimer restent visibles sous chaque carte sur téléphone, sans ouvrir les détails. Sur ordinateur, elles apparaissent au survol de la ligne ou au focus clavier, dans un emplacement réservé. L’édition transforme les valeurs dans les mêmes colonnes ou la même carte ; Enregistrer/Annuler sont intégrés sur place. Le type reste verrouillé, les résultats sont des aperçus calculés en lecture seule et la position reste stable pendant la saisie. Le formulaire latéral sur ordinateur et la vue dédiée sur téléphone sont réservés à l’ajout.

Le sélecteur « Trier par » couvre nom, type, total par échéance, devise,
périodicité, pourcentage personnel, part par échéance et montant mensuel.
Chaque champ a les deux sens de tri ; les en-têtes visibles sont aussi des
boutons. Les valeurs inconnues restent après les valeurs connues, les durées
sont classées en mois et les égalités départagées par nom puis clé type/id.
Le tri décimal ne calcule ni mensualisation ni conversion entre devises.

Les trois indicateurs Entrées/Mes charges/Solde fixe utilisent exclusivement
`fixedIncome`, `fixedExpense` et `base` de la synthèse serveur du mois courant.
La devise EUR ou USD est sélectionnée explicitement, sans changer la liste ni
convertir les montants. Le solde fixe précède opérations, événements et reports ;
le reste à vivre complet reste disponible dans « Voir le reste à vivre du mois ».
Une panne n'est jamais présentée comme zéro. Une liste partielle est annoncée
comme telle et le total d'éléments n'est affiché que lorsque les deux lectures
ont abouti. Les synthèses serveur restent indépendantes de ces listes.

« Ajouter » ouvre le choix Charge/Entrée. Changer de type conserve un brouillon
par type en mémoire, sans sauvegarde automatique ni stockage persistant.
L'édition verrouille le type. Les charges conservent leur formulaire, aperçu,
validation et arrondi existants ; les entrées sont mensuelles, sans pourcentage
ni périodicité envoyés au serveur. Le revenu reçu doit rester supérieur ou égal
à 1, conformément au contrat historique.

Les routes revenus existantes de la version backend v1.4.0 sont utilisées :
GET/POST `/v1/operations-fixes/revenus`, PUT/DELETE
`/v1/operations-fixes/revenus/:id`. Le GET charge désormais toutes les pages
par curseur, comme les charges. Les PUT/DELETE n'ont pas de `data` obligatoire :
la collection est relue après écriture, puis les synthèses sont invalidées.
Une écriture réussie suivie d'une panne de relecture ne peut pas être rejouée
par Réessayer. Les contrats ont été vérifiés en lecture seule dans
`src/routes/operationsFixes.ts` et `src/utils/validators/operationFixe.validator.ts`
du backend v1.4.0 ; aucun changement backend n'est nécessaire.

Vérifications : `fixedOperations.test.jsx` (brouillons, erreurs, focus, devises,
création/édition/suppression), `fixedOperationsSort.test.js` (huit tris,
précision et inconnues), `fixedChargesService.test.js` (pagination revenus),
`test/e2e/fixedOperations.spec.js` (320/390/768/1440 px, deux thèmes, texte
à 200 % dont la taille rendue est mesurée) et les parcours charges existants.
Le parcours full-stack des charges vérifie aussi le CRUD des entrées avec le
vrai backend et la mise à jour des soldes. Ces tests ne remplacent pas la
recette VoiceOver/PWA physique suivie dans #54.

Pas de nouvelle dépendance, migration, configuration ni cache de données.
Les composants historiques restent disponibles pour compatibilité ; la page
principale consomme la nouvelle vue commune. Le retour
arrière consiste à révoquer la PR Web, sans modifier les données ou le backend.

## Catégories des charges et entrées fixes — #266

Une catégorie principale facultative peut être sélectionnée à l'ajout ou dans
l'édition inline. Son nom et son icône sont visibles dans la colonne Catégorie
et dans les cartes mobiles. « Non catégorisé » utilise l'icône étiquette ; les
anciennes opérations ne sont pas classées automatiquement. Le tri par catégorie
est disponible dans les deux sens, y compris sur téléphone, avec les valeurs
indisponibles à la fin. Le total, la périodicité et la participation restent
indépendants de la catégorie.

Le catalogue existant de la page Catégories est réutilisé, avec ses icônes Free
et les catégories personnelles. Les catégories spécialisées `fixedKind=CHARGE`
ne sont proposées que pour une charge ; `REVENU` pour une entrée ; l'absence de
restriction (`null` ou champ absent) permet les deux. Le menu natif affiche les
noms ; l'icône sélectionnée est visible à côté. Le panneau de saisie conserve
son brouillon lors d'un changement Charge/Entrée. Aucune catégorie n'est créée
par le navigateur au chargement de la page.

`categoryId` est envoyé comme entier ou `null` pour retirer l'affectation.
L'absence de champ reste supportée pour les formulaires historiques. Les GET
et créations consomment aussi l'objet `category` (`id`, `name`, `color`, `icon`,
`fixedKind`) du backend #127. Une lecture de catalogue en échec conserve
l'affectation et les autres valeurs ; Réessayer recharge uniquement les
catégories. Un refus serveur `INVALID_FIXED_CATEGORY` est associé au sélecteur,
sans perdre la saisie. Un nom/couleur/icône personnalisés existants restent
inchangés par la migration ; les 20 nouveaux défauts sont ajoutés sans doublon
aux comptes existants et copiés à l'inscription des nouveaux comptes.

Dépendances de livraison : PR #267 et contrat/migration backend #127. Le Web
doit être livré après ce backend. Le scénario Compose est épinglé sur le commit
backend qui fournit ce contrat ; sa disponibilité distante nécessite la
publication de la branche backend avant le lancement CI. Les tests de
`fixedCategories.spec.js` vérifient les vraies icônes, la sélection compatible,
la sauvegarde et le retrait à 320/390/1440 px, avec API simulée. Le parcours
full-stack vérifie les catégories d'une charge et d'une entrée contre MySQL
jetable, puis leur relecture. Il nécessite Docker/MySQL/Redis et ne doit jamais
être utilisé sur une autre base. Les deux PR applicatives restent soumises à
revue propriétaire ; aucune migration de production ni déploiement automatique.
