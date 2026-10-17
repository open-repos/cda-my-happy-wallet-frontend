# Catégories d'opérations Web

Issue #133 (parent backend #83). La page authentifiée `/categories`
(« Catégories d’opérations ») permet de gérer les catégories qui classent les
opérations. Elle est accessible depuis la navigation (« Catégories ») et depuis
la liste des opérations (« Gérer les catégories »). Le sélecteur d'icône Font
Awesome (#131) s'ajoutera à ce formulaire.

## Données

`GET /v1/operation-categories` (toutes les pages), `POST`, `PUT /{id}` et
`DELETE /{id}`, contrat backend `docs/one-off-operation-api.md` et
`docs/operation-category-icons.md`. Les corps envoyés ne contiennent que `name`
et `color` : sans `icon`, un `PUT` conserve l'icône existante. Après toute
écriture, la liste est rechargée. Les formulaires d'opération et le calendrier
relisent les catégories à leur ouverture et reflètent donc les changements.

## Affichage

- Liste triée par l'API : pastille de couleur bordée, nom, mention « Sans
  couleur » et pastille hachurée lorsqu'aucune couleur n'est choisie, bouton
  « Modifier <nom> ».
- États chargement, erreur avec « Réessayer », première catégorie et succès;
  messages d'action en `role=status`, erreurs en `role=alert`.

## Formulaire

- Nom de 2 à 50 caractères après suppression des espaces, erreur reliée au
  champ par `aria-describedby`.
- Couleur : « Sans couleur », huit couleurs tirées des primitives de
  `design-tokens/tokens.json` (`CATEGORY_PALETTE`), ou « Autre couleur » avec
  un sélecteur natif. Une couleur existante hors palette est présélectionnée
  dans « Autre couleur ». La valeur est envoyée en `#RRGGBB` majuscule.
- Erreurs de l'API : `CATEGORY_NAME_CONFLICT` place l'erreur sous le nom et y
  remet le focus; `CATEGORY_IN_USE` explique que des opérations utilisent la
  catégorie et laisse le formulaire ouvert; une catégorie disparue (`404`)
  recharge la liste.
- Suppression après confirmation; `Échap` ferme le formulaire. Le focus va sur
  le nom à l'ouverture et après une saisie invalide, puis revient au bouton
  déclencheur (ou à « Ajouter une catégorie ») à la fermeture.
- Les messages d'erreur portent `status-error-surface` : `status-error-text`
  n'est lisible que sur cette surface, en clair comme en sombre. La bordure
  d'un champ invalide prend le rôle danger.

## Navigation

L'entrée « Catégories » porte la navigation latérale à six liens. Les
espacements de la liste et des liens sont bornés par la hauteur de l'écran
(`clamp(..., vh, ...)`) pour que le dernier lien reste au-dessus du bouton du
profil dès 720 px de haut (test Playwright à 1366×768, 1280×720 et 1024×768).

La page réutilise la mise en page et les boutons des opérations
(`Operations.css`); `Categories.css` ajoute la liste et le choix de couleur.
Les couleurs de catégorie sont des valeurs stockées, pas des tokens de thème :
seule la bordure de la pastille suit le thème.

## Tests

- Vitest : `categoryService`, `categoryForm`, `useCategories` et
  `categoriesPage` (états, validation, palette, couleur personnalisée, conflit,
  confirmation et refus de suppression, `Échap`).
- Playwright : création et refus de suppression sur trois viewports, absence de
  débordement horizontal, anneaux de focus sur la coque dans les deux thèmes,
  contraste des erreurs du formulaire en clair et en sombre, navigation à
  six liens sans chevauchement du profil.
