# Revue visuelle des listes d’opérations — #387

Les quinze références proviennent exclusivement de [Mobile quality 42347409123](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/42347409123), commit `6bb9e3475666bd027d2020cebe73140e31fba2db`, artefact `mobile-visual-failure` 13564810771. Le ZIP téléchargé a pour SHA-256 `68a7a7d6cb044adc362a803cd372a3ef1cd7fd8cbd92355cdf0b1116b5154278`.

Chaque PNG a été inspecté puis copié sans modification depuis l’artefact. Aucune référence produite localement n’est adoptée. Les rendus de première tentative et de nouvel essai sont identiques quand les deux existent. Le seuil `maxDiffPixelRatio: 0.01` reste inchangé.

Les trois captures de liste montrent le nouveau bouton et le résumé du tri, avec les cartes et la navigation existantes. Le test conserve aussi `operations-current.png`, afin de revoir le bureau même quand la différence reste sous le seuil de comparaison. Les six panneaux d’opérations ponctuelles montrent le texte agrandi à ×2 en clair et sombre, à 390/768/1440 px ; leur contenu se parcourt verticalement. Les six panneaux de budget fixe montrent le tri par défaut, les catégories, le type, la périodicité et les actions d’application et d’annulation, à taille de texte normale.

La correction ultérieure de la limite de catégories ne modifie pas ces vues : les catégories y sont repliées et vides. Les opérations ponctuelles gardent le maximum serveur de 20 ; le choix local des fixes n’a pas cette limite. Le parcours correspondant a échoué sur l’ancien comportement, puis réussi sur téléphone, tablette et bureau.

| Référence                                                                                                                                 | SHA-256                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [operations-mobile-linux.png](../test/visual/critical-screens.spec.ts-snapshots/operations-mobile-linux.png)                              | `3a298769f52bd9e892852cd493a2cd936dbebc81c0e5e5ee6a361214979ac794` |
| [operation-filters-light-mobile-linux.png](../test/visual/operation-filters.spec.ts-snapshots/operation-filters-light-mobile-linux.png)   | `3ff5c853b7c9d386e7e71f4855214ad5fa46d95ed9c98e4c23cf85d4e47765e1` |
| [fixed-filters-light-mobile-linux.png](../test/visual/operation-filters.spec.ts-snapshots/fixed-filters-light-mobile-linux.png)           | `ff7861931db9c3a5ca1178dc7b54a782760e17750c2f6ffe84ef04c6c330082c` |
| [operation-filters-dark-mobile-linux.png](../test/visual/operation-filters.spec.ts-snapshots/operation-filters-dark-mobile-linux.png)     | `76e59a1b948e1ef26b9af2ee60dbba90cea7c6a067a132b208d0c2ae9ae2fba2` |
| [fixed-filters-dark-mobile-linux.png](../test/visual/operation-filters.spec.ts-snapshots/fixed-filters-dark-mobile-linux.png)             | `af89ec67a6e2381c3344ad15a79fc812e0a7d959e651d823778adf8e5cc44fe8` |
| [operations-tablet-linux.png](../test/visual/critical-screens.spec.ts-snapshots/operations-tablet-linux.png)                              | `e460c3dd73ee2b11c25567497021fde173dace53c948351c518477589fd3514c` |
| [operation-filters-light-tablet-linux.png](../test/visual/operation-filters.spec.ts-snapshots/operation-filters-light-tablet-linux.png)   | `75005ded22c0ca42924b06bc73990a7ce288cc0b8845a4579f9c8bbf69166f28` |
| [fixed-filters-light-tablet-linux.png](../test/visual/operation-filters.spec.ts-snapshots/fixed-filters-light-tablet-linux.png)           | `d8849e580435bb3887dd423f49505d3d42575f2355e129ef652f164b6390f896` |
| [operation-filters-dark-tablet-linux.png](../test/visual/operation-filters.spec.ts-snapshots/operation-filters-dark-tablet-linux.png)     | `b2d507f4c1b40af79d7174e94a1810a46271ae5c330d05b8adab95c2c8790b62` |
| [fixed-filters-dark-tablet-linux.png](../test/visual/operation-filters.spec.ts-snapshots/fixed-filters-dark-tablet-linux.png)             | `861c728bf69d563e1d96a9f161ad8a1c48a8bf7ed8ce3c969c61338ea585fb85` |
| [operations-desktop-linux.png](../test/visual/critical-screens.spec.ts-snapshots/operations-desktop-linux.png)                            | `9c12aaf3b473044959fe465a9ba17192c2ca09969b22a0f5f662d07bc22d2ff7` |
| [operation-filters-light-desktop-linux.png](../test/visual/operation-filters.spec.ts-snapshots/operation-filters-light-desktop-linux.png) | `412523a67b1d383c5e0b7682c8fb0e270467d1d1d4b62232f7dc37fcd6adddb3` |
| [fixed-filters-light-desktop-linux.png](../test/visual/operation-filters.spec.ts-snapshots/fixed-filters-light-desktop-linux.png)         | `cff7030b2ad0d44bf52b9a8fbc1997e8b3de57d110d50f7756f280b6dbc938b1` |
| [operation-filters-dark-desktop-linux.png](../test/visual/operation-filters.spec.ts-snapshots/operation-filters-dark-desktop-linux.png)   | `ba1c0378ba890bac915070212406c55054f51f70942480f211d632124ce3e3e1` |
| [fixed-filters-dark-desktop-linux.png](../test/visual/operation-filters.spec.ts-snapshots/fixed-filters-dark-desktop-linux.png)           | `489e3adc04b9d3a62f4f7ddd62075961ffd42c745946a3c9e7257c2fa7ce16a7` |

La revue du code et des captures n’a pas de remarque bloquante restante. Les parcours vérifient les paramètres serveur, le retour à la première page, les suggestions paginées sans doublon, le texte libre borné à 50 caractères, les réponses obsolètes, les plages invalides, l’erreur d’actualisation et son nouvel essai, l’effacement conservant le tri et le filtrage local sur la collection complète des fixes. La matrice 320/390/768/1440 px couvre les deux thèmes, le texte à ×2, l’absence de débordement horizontal de la page et les nouvelles cibles d’au moins 48 dp.

Le premier rendu CI a aussi signalé un nouvel essai sur le retour du focus au bouton d’ajout rapide, avant réussite. Ce parcours existant a ensuite réussi trois fois de suite en local ; les suites finales vérifient à nouveau ce comportement sans modifier son code ni son test.

La recette sur development build Android Pixel 5, grandes polices comprises, reste regroupée avec la fin de parité #213, conformément à l’issue. TalkBack vocal et iOS restent à vérifier sur appareil ; les captures Chromium ne remplacent pas cette recette.
