# Catégories d'opérations sur mobile (#134, #132)

Parent backend #83. L'écran « Catégories d’opérations » permet de lister,
créer, renommer, colorer et supprimer les catégories, comme sur le Web
(`docs/web-categories.md`), y compris l'icône Font Awesome (#132).

## Parcours

- Accès depuis l'écran des opérations (« Gérer les catégories »), retour par
  « Opérations » en tête d'écran ou le bouton Retour Android.
- Route Expo Router `(app)/categories`, onglet caché (`href: null`) comme le
  budget fixe. La position des libellés d'onglets est désormais fixée
  (`beside-icon` dès 768 px, `below-icon` en dessous et sur la barre latérale
  desktop) : déduite par React Navigation, elle dépendait du nombre de routes,
  onglets cachés compris, et basculait sur tablette.
- Liste : pastille bordée (vide si aucune couleur, mention « Sans couleur »),
  nom, bouton « Modifier <nom> » de 48 px. États chargement, vide, erreur avec
  « Réessayer ».

## Formulaire

- Nom de 2 à 50 caractères après suppression des espaces.
- Couleur : « Sans couleur », huit primitives du design system (même palette
  que le Web), ou « Autre couleur » avec un code `#RRGGBB`. Les options sont des
  radios dont l'état est exposé par `aria-checked` (vérifié sur Android et sur
  le Web; VoiceOver n'est pas encore recetté).
- Suppression après confirmation intégrée au formulaire : `Alert` n'a pas de
  boutons sur le Web.
- Erreurs de l'API affichées dans le formulaire : `CATEGORY_NAME_CONFLICT`
  sous le nom, `CATEGORY_IN_USE` explique que des opérations l'utilisent;
  `404` recharge la liste et ferme le formulaire.
- `icon` n'est envoyé que s'il a changé : une icône inchangée, même retirée
  entre-temps de la liste, n'empêche pas de renommer; `INVALID_CATEGORY_ICON` invite
  à en choisir une autre.
- Une erreur de validation est annoncée (`announceForAccessibility`) en plus
  de la zone live Android; « catégorie utilisée » s'affiche dans le bloc de
  confirmation, un conflit de nom sous le champ.
- Les écrans Opérations et Calendrier relisent les catégories sans bruit à
  chaque retour (`useFocusEffect`), car les onglets restent montés. Un
  rechargement qui échoue après une commande réussie garde la liste affichée
  et le signale.
- Écran et modale utilisent le `SafeAreaView` de
  `react-native-safe-area-context` (fournisseur propre à la modale) pour ne
  pas passer sous la barre d'état Android.

## Icône (#132)

- Sélecteur dans le formulaire : aperçu dans la couleur choisie, recherche par
  mot-clé français ou nom Font Awesome (mêmes règles et suggestions que le
  Web), « Sans icône », options radio de 48 px annoncées par leur nom
  (« cart shopping (plein) ») et l'état `aria-checked`; nombre de résultats en
  zone live.
- Dessin avec la police `FontAwesome6` (Free) de `@expo/vector-icons`, déjà
  embarquée : aucune dépendance native, pas de reconstruction du development
  build. `<FontAwesome6 name solid />` pour le style plein, contour sinon.
- Liste autorisée : `src/features/categories/domain/categoryIcons.json`, noms
  et suggestions générés par `scripts/generate-category-icons.mjs` (racine du
  frontend) depuis la liste backend (#84) et le module Web des suggestions.
  Une icône inconnue ou retirée s'affiche en pastille.
- Affichage décoratif (masqué aux lecteurs d'écran, le nom porte le sens) :
  liste des catégories, cartes d'opérations (écran Opérations et calendrier),
  liste textuelle sous le graphique des dépenses. Le graphique ECharts SVG
  lui-même ne dessine pas la police d'icônes. Sans icône, les cartes gardent
  leur pastille actuelle.

## Validation

- Vitest : `categoryDraft` (palette, règles, `icon` seulement si choisi,
  messages), `categoryIcons` (noms présents dans la police et ses styles,
  suggestions, recherche, libellés), `HttpCategoriesGateway`, `parseCategory`
  et les lignes du graphique.
- Playwright sur l'export Web, trois viewports : création avec validation,
  conflit de nom affiché sous le champ, refus de suppression d'une catégorie
  utilisée, retour aux opérations qui relit les catégories, absence de
  débordement. La fausse API (`scripts/serve-export.mjs`) répond aux
  commandes des catégories sans état. Référence `operations-mobile` mise à jour
  pour le lien « Gérer les catégories ».
- Recette du 17 octobre 2026 sur development build (Pixel 5 API 35, Metro dans
  Docker, aucune dépendance native ajoutée) : liste des catégories réelles,
  validation du nom, choix de Bleu annoncé coché, création, confirmation et
  suppression de la catégorie de recette, marges sous la barre d'état, grandes
  polices (×1,3) sans débordement. Après la revue : une catégorie créée apparaît
  dans le formulaire d'opération au retour sur Opérations (rechargement au
  focus), puis est supprimée.
- Recette #132 sur le même development build : icône « cart shopping » choisie
  par la recherche « courses » pour Alimentation (cochée, aperçu), affichée
  sur la carte d'opération après retour sur Opérations, puis retirée (« Sans
  icône »). Le backend de développement a été reconstruit depuis `develop`
  pour appliquer la migration `icon` (#84).
