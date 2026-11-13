# Coffre mobile (#419)

Équivalent natif du Coffre Web (#395,
[`docs/web-savings-vault.md`](../../docs/web-savings-vault.md)), enfant de #397.
Le mobile consulte le budget disponible du compte courant et gère les comptes
d'épargne. Il ne calcule aucun solde : tout montant affiché vient du serveur.

La décision de fin de mois, les versements mensuels à confirmer et la cloche
relèvent de #420.

## Écrans

Le Coffre est une route secondaire, ouverte par la carte « Coffre » de
l'Accueil. La barre garde ses cinq onglets.

- **Coffre** (`/vault`) : budget disponible du mois courant (Europe/Paris),
  comptes d'épargne en vues « Actifs » et « Archivés », création d'un compte.
  Chaque carte active propose « Déposer », « Retirer » et, sans objectif,
  « Rattacher un objectif ». Si des comptes existent dans plusieurs devises,
  un choix « Devise du compte courant » apparaît.
- **Compte d'épargne** (`/vault-account?compte=<id>`) : solde, dépôt, retrait,
  renommage, archivage, mouvements paginés, objectif rattaché et solde initial.
  Un compte archivé reste consultable, sans action.
- **Compte courant** (`/vault-account?compte=current&devise=EUR`) : budget
  disponible et ses quatre composantes, mouvements du mois. « Mois précédent »
  et « Mois suivant » parcourent les mois passés ; un mois futur n'est jamais
  demandé. Ce montant n'est pas un solde bancaire connecté.

Sur une largeur d'au moins 768 px, les cartes passent sur deux colonnes.

## Contrat

Routes préfixées `/v1`, contrat `savings-accounts.md` du backend (#183), lu par
`src/features/vault/domain/vault.ts` avec les mêmes règles que le Web.

| Usage             | API                                                       |
| ----------------- | --------------------------------------------------------- |
| Comptes           | `GET /savings-accounts?limit=20`                          |
| Compte            | `GET /savings-accounts/:id`                               |
| Mouvements        | `GET /savings-accounts/:id/movements?limit=20`            |
| Budget disponible | `GET /accounts/current?month=YYYY-MM&currency=EUR`        |
| Mouvements du CC  | `GET /accounts/current/movements?month=…&currency=…`      |
| Création          | `POST /savings-accounts`                                  |
| Renommage         | `PATCH /savings-accounts/:id` avec `name`                 |
| Archivage         | `PATCH /savings-accounts/:id` avec `archived: true`       |
| Rattachement      | `PUT /savings-accounts/:id/goal`                          |
| Virement          | `POST /savings-accounts/:id/transfers`, motif `MANUAL`    |
| Objectifs         | `GET /goals`, champ `savingsAccountId` des objectifs liés |

Les listes suivent le curseur opaque partagé : lignes dédoublonnées, curseur
répété refusé, une seule requête de suite à la fois. Les mouvements du compte
courant sont identifiés par leur source et leur identifiant, car une opération
et un virement peuvent porter le même numéro. Une réponse arrivée après un
changement de compte, de mois ou de devise est ignorée.

## Montants et écritures

Une saisie est convertie en centimes entiers sans calcul flottant
(`parseAmountInput`) : virgule ou point, deux décimales au plus. Le formulaire
de virement explique le sens du mouvement et n'annonce aucun nouveau solde.
Après l'enregistrement, l'écran relit le compte, le budget disponible et les
objectifs ; les autres écrans montés sont relus par l'invalidation partagée.

Chaque virement reçoit une clé d'idempotence à la soumission
(`createIdempotencyKey`). Le moteur natif n'expose pas `crypto.randomUUID` :
la clé combine l'instant et vingt caractères aléatoires. Une collision serait
refusée par le serveur (`IDEMPOTENCY_CONFLICT`), sans créer de doublon.

`runVaultWrite` classe l'issue d'une écriture :

- **enregistrée** : toute réponse 2xx, même illisible. L'écriture n'est jamais
  rejouée. Si la relecture échoue, le message le dit et seule la lecture est à
  refaire.
- **refusée** : réponse 4xx. Le message reprend le code stable de l'API avec
  les textes du Web. Les champs redeviennent modifiables et la tentative
  suivante prend une nouvelle clé.
- **incertaine** : réponse perdue ou erreur 5xx. Les champs sont figés.
  « Vérifier les mouvements » affiche l'historique dans le formulaire et
  « Reprendre ce virement » renvoie le même corps avec la même clé.

Pendant l'envoi, le formulaire ne se ferme pas : boutons désactivés, et le
bouton Retour d'Android comme la touche Échap sont ignorés. Sinon une réponse
perdue ferait oublier la tentative et sa clé. Lors d'une reprise, seul un refus
portant un code métier libère la clé ; un refus sans code ne dit rien du
premier envoi et laisse la reprise possible.

Écart assumé avec le Web : pendant une réponse incertaine, le formulaire peut
être fermé par « Fermer sans reprendre », parce qu'un écran natif ne doit pas
bloquer le bouton Retour. La tentative est alors abandonnée ; l'historique du
compte permet de vérifier si le virement a été enregistré.

## Objectifs rattachés

Le rattachement propose les objectifs de même devise sans compte. Il est
définitif. Un objectif déjà alimenté demande un compte vierge ; le serveur
arbitre. Dans l'écran Objectifs, le champ « Déjà épargné » d'un objectif
rattaché est en lecture seule, car le serveur refuse toute valeur différente
du solde du compte.

## Présentation et validation

Maquette `proposals/397-mobile-vault-month-end` du workspace, validée par le
propriétaire le 11/11/2026. Le Figma n'a pas été consulté, à sa demande. Trois
éléments de la maquette ne sont pas repris, faute de donnée dans le contrat :
la date de création du compte, les totaux de dépôts et de retraits, et le total
des comptes actifs. Les additionner sur le mobile contredirait la règle « aucun
calcul financier » et serait faux sur une liste paginée.

Les couleurs, espacements, tailles de texte et rayons viennent des tokens. Les
largeurs de colonne (`48,5 %`), la hauteur de jauge (10) et l'interligne des
textes d'aide (20) sont des valeurs de mise en page locales, comme pour les
enveloppes. Les boutons ont une cible d'au moins 48 px.

Tests unitaires : `vault.test.ts` (contrat, montants, formulaires, textes),
`vaultWrite.test.ts` (issue d'une écriture, reprise, clés),
`HttpVaultGateway.test.ts` (routes et corps). Tests navigateur :
`test/visual/vault.spec.ts`, quatorze parcours sur téléphone, tablette et
bureau, avec trois captures de référence (Coffre, compte, virement). L'un
agrandit chaque texte ×1,3 et vérifie qu'aucun texte ne déborde ni n'est rogné
et que les boutons gardent 48 px de haut.

Recette Android du 12/11/2026 (émulateur Pixel 5, API 35, backend avec #183,
base neuve) : Coffre vide, création, dépôt, retrait refusé, réponse perdue puis
reprise sans doublon, Retour ignoré pendant l'envoi, renommage, archivage,
compte courant. Avec la police du système à 1,3 : aucun débordement sur le
Coffre, le compte et le formulaire de virement. iOS n'a pas été testé (#418).
