# Catégories des charges et entrées fixes (#385)

Le formulaire du budget fixe propose une catégorie principale **facultative**,
comme le Web ([#266](../../docs/web-fixed-charges.md)). Chaque carte affiche le
nom et l'icône de sa catégorie, ou « Non catégorisé » avec l'icône étiquette.
Une catégorie absente de la réponse malgré son identifiant s'affiche
« Catégorie indisponible ».

## Choix proposés

- Les catégories viennent du catalogue existant (`GET /operation-categories`)
  et sont affichées par `CategoryChoices`, précédées de « Non catégorisé ».
- `fixedKind = CHARGE` n'est proposé que pour une charge, `REVENU` que pour une
  entrée ; sans restriction, une catégorie convient aux deux types.
- La catégorie actuelle d'un élément reste affichée et cochée, même si le
  catalogue ne la propose plus.
- À la création, passer de Charge à Entrée retire un choix réservé à l'autre
  type.

## Contrat

Contrat identique au Web, sans nouvelle route :

- lecture : `categoryId` et `category` (`id`, `name`, `color`, `icon`,
  `fixedKind`) de `GET /operations-fixes` ;
- création : `categoryId` envoyé seulement si une catégorie est choisie ;
- modification : `categoryId` envoyé **seulement s'il change**, `null` pour
  retirer l'affectation.

Le `PUT` du backend est partiel. Une charge saisie sur le Web garde donc sa
catégorie, sa périodicité et sa part personnelle quand elle est modifiée sur
mobile. Aucun montant n'est calculé côté mobile.

## Erreurs

- **Choix devenu indisponible :** un choix absent du catalogue chargé est
  refusé avant l'envoi.
- **Refus serveur :** un refus `INVALID_FIXED_CATEGORY` (422,
  `error.details.code`) s'affiche sous le sélecteur. Le formulaire et la saisie
  restent ouverts, et le message est annoncé (`announceForAccessibility`).
- **Catalogue indisponible :** les choix sont désactivés, l'affectation actuelle
  est conservée, et « Réessayer les catégories » ne recharge que le catalogue.

## Carte

Sur téléphone (largeur inférieure à 600 dp), le montant passe sous le libellé
et « Modifier » n'affiche que son icône. Le nom accessible reste « Modifier
<libellé> », avec une cible de 48 dp. Sur tablette et ordinateur, la carte
garde le montant à droite et le libellé « Modifier » visible (#297). Les choix
de catégorie mesurent au moins 48 dp.

## Vérification

- `fixedBudget.test.ts`, `HttpFixedBudgetGateway.test.ts` et
  `oneOffOperation.test.ts` : lecture, compatibilité, corps POST/PUT, code
  d'erreur.
- `test/visual/fixed-categories.spec.ts` couvre, à 360, 768 et 1440 px :
  - l'affichage ;
  - le filtrage par type ;
  - le PUT sans `categoryId` quand la catégorie ne change pas, puis le retrait
    avec `null` ;
  - la création d'une entrée catégorisée ;
  - le refus serveur ;
  - le catalogue indisponible.

La recette sur development build Android (Pixel 5), grandes polices comprises,
est regroupée avec la recette de fin de parité (#213).
