# Catégories d'opérations Web

Issues #133 et #131 (parent backend #83). La page authentifiée `/categories`
(« Catégories d’opérations ») permet de gérer les catégories qui classent les
opérations. Elle est accessible depuis la navigation (« Catégories ») et depuis
la liste des opérations (« Gérer les catégories »).

## Données

`GET /v1/operation-categories` (toutes les pages), `POST`, `PUT /{id}` et
`DELETE /{id}`, contrat backend `docs/one-off-operation-api.md` et
`docs/operation-category-icons.md`. Les corps envoyés ne contiennent que `name`
, `color` et `icon` (`style:nom` ou `null`); un appel sans `icon` laisse
l'icône inchangée côté backend. Après toute
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

## Icône (#131)

- Le formulaire propose une icône Font Awesome 6 Free facultative : recherche
  par mot-clé français (« courses », « santé », « café »…) ou par nom Font
  Awesome, suggestions budgétaires avant toute saisie, aperçu dans la couleur
  choisie et « Sans icône » pour revenir à la pastille. Les options sont des
  boutons radio natifs (flèches pour parcourir); 48 résultats au plus,
  l'icône actuelle reste toujours visible.
- L'icône, dessinée dans la couleur de la catégorie (couleur de texte
  secondaire sans couleur), précède le nom dans la liste des catégories, la
  liste des opérations, les lignes d'opérations du calendrier, et les barres
  et la légende des secteurs du graphique de l'accueil. Elle est décorative
  (`aria-hidden`) : le nom porte le sens.
- Liste autorisée et tracés : `src/assets/category-icons.json`, généré par
  `scripts/generate-category-icons.mjs` depuis la liste du backend (#84,
  intersection Web et mobile) et les paquets Font Awesome Free du Web, avec
  l'attribution CC BY 4.0. Vite l'émet comme ressource hachée (`?url`),
  téléchargée par `fetch` (environ 400 ko compressé) à la première icône
  affichée ou à l'ouverture du sélecteur; avant son chargement ou hors ligne,
  la pastille reste affichée. Le sélecteur signale un échec et propose
  « Réessayer » (un `import()` en échec resterait en cache du navigateur).
  Importer les paquets complets aurait fusionné plus de 1 Mo dans le bundle
  principal, où ils sont déjà importés icône par icône.
- Une icône inchangée n'est pas renvoyée au `PUT` : une icône retirée depuis
  de la liste autorisée reste affichée (pastille dans le sélecteur) et
  n'empêche pas de renommer la catégorie. `INVALID_CATEGORY_ICON` invite à en
  choisir une autre.
- Dans la recherche, Entrée n'enregistre pas et Échap vide d'abord le champ.
  Une région live permanente annonce chargement et nombre de résultats.
- Régénération, après toute régénération de la liste backend ou montée de
  version Font Awesome : `node scripts/generate-category-icons.mjs` (dans
  `agent-frontend-node`, checkout backend voisin), `--check` pour vérifier.

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

- Vitest : `categoryIcons` (fichier généré, recherche, libellés, image des
  graphiques), `categoryLabel`, `categoryService`, `categoryForm`,
  `useCategories`, `homeChartOptions`, `budgetCalendarPage` et
  `categoriesPage` (états, validation, palette, couleur personnalisée, conflit,
  confirmation et refus de suppression, `Échap`).
- Playwright : création et refus de suppression sur trois viewports, absence de
  débordement horizontal, anneaux de focus sur la coque dans les deux thèmes,
  contraste des erreurs du formulaire en clair et en sombre, navigation à
  six liens sans chevauchement du profil.
