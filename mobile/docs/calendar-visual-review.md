# Revue du calendrier natif — #386

La grille suit la [décision du propriétaire](https://github.com/open-repos/cda-my-happy-wallet-frontend/pull/398#issuecomment-6695527598) : sept colonnes égales et visibles sans défilement horizontal. Les montants compacts suivent la police système jusqu’à ×1,3, puis sont plafonnés avec `maxFontSizeMultiplier`, sans troncature ni réduction automatique. Le détail et le libellé accessible conservent la valeur exacte.

Chaque cible garde une hauteur d’au moins 48 dp. Sa largeur vaut un septième de la largeur disponible : le minimum de 48 dp est respecté quand celle-ci atteint 336 dp, notamment sur Pixel 5. À 320 px, la priorité confirmée par le propriétaire est de voir les sept colonnes ; la largeur des cibles est donc inférieure à 48 dp.

## Provenance des références

Les quinze PNG proviennent exclusivement du rendu de GitHub Actions. Ils ont été inspectés puis copiés sans modification depuis les artefacts, sans référence locale ni assouplissement du seuil existant (`maxDiffPixelRatio: 0.01`).

- **A** — [Mobile quality 42267986703](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/42267986703), commit `a26fc197d307ace59a852576c92485a12d52ab11`, artefact `mobile-visual-failure` 13529110573 : six détails Prévisionnel conservés, toujours conformes dans la nouvelle CI.
- **B** — [Mobile quality 42269745445](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/42269745445), commit `ae3cd627a2941d5415149366780c99402cca679b`, artefact `mobile-visual-failure` 13529356171 : deux références Repères tablette/bureau conservées.
- **C** — [Mobile quality 42296861520](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/42296861520), commit `c61456fe7e0ca7bdd9221f9594e66a47f1ce6077`, artefact `mobile-visual-failure` 13541669292 : six nouvelles grilles Prévisionnel et la référence Repères mobile actualisée. Le ZIP a pour SHA-256 `361c7c23819438792fbfd3e0ca5264a7bf88080301360c4850d46964afb30e04`.

Les six grilles Prévisionnel montrent les sept colonnes, la valeur positive 17 et le déficit -4, en clair et sombre, sur téléphone, tablette et bureau. Le signe reste indépendant de la couleur. Les six captures du détail conservent le montant exact négatif (-4,17 €) et la phrase du Web ; sur téléphone, le détail est défilé dans la vue au-dessus du FAB. La référence Repères mobile retire le message de défilement et garde le jour sélectionné visible. Les références Repères tablette/bureau restent identiques. La bordure uniforme empêche Aujourd’hui de réduire ses voisines.

| Référence adoptée                                                                                                                                     | Source | SHA-256                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| [calendar-daily-remaining-light-mobile-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-light-mobile-linux.png)   | A      | `d92b92dc6cfeba4de90f264a98066839e8a8c879c6f8b56a661265aaa84102e7` |
| [calendar-daily-remaining-dark-mobile-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-dark-mobile-linux.png)     | A      | `0c8679ee48e3c212c1f2ac858430665d51b23190c947fb7ea7b1d3f19de9c53e` |
| [calendar-daily-remaining-light-tablet-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-light-tablet-linux.png)   | A      | `80a498ad748fc5581e8de64394e6f0b321587ab70a0cca59ea74bf59daae8673` |
| [calendar-daily-remaining-dark-tablet-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-dark-tablet-linux.png)     | A      | `1d8d61bc86a1201b622c3d62c773d7a1e558e0b8046d9a5f4db41841be3aa3ea` |
| [calendar-daily-remaining-light-desktop-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-light-desktop-linux.png) | A      | `9f9f007abc14d3de94f9c6d3dfe3f274de07db728ab71a7a7f7e2bea2fbf3031` |
| [calendar-daily-remaining-dark-desktop-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-dark-desktop-linux.png)   | A      | `ff19d99682b7c5d7934f8f95b3c23904301f2c7f8256f4f8c4c5c11f17fb20cc` |
| [calendar-mobile-linux.png](../test/visual/critical-screens.spec.ts-snapshots/calendar-mobile-linux.png)                                              | C      | `832954d8248ffefad58242b60dab9f9a960b094c69e7caed6554aab48a6c7331` |
| [calendar-tablet-linux.png](../test/visual/critical-screens.spec.ts-snapshots/calendar-tablet-linux.png)                                              | B      | `6351f536936c265388e40ded6bb1e4babac238bb9bab7177b32f3548b20632b4` |
| [calendar-desktop-linux.png](../test/visual/critical-screens.spec.ts-snapshots/calendar-desktop-linux.png)                                            | B      | `6e17706cae4657680301caaf30839bc79ea7a1c6269d7b6e58d07218564693f4` |
| [calendar-daily-grid-light-mobile-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-grid-light-mobile-linux.png)             | C      | `72ea46980173dddab71fa82f51e6535c12b6a5200b2d3f76438b9d2540c78ad7` |
| [calendar-daily-grid-light-tablet-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-grid-light-tablet-linux.png)             | C      | `158371cd3c104ab2853d5770164dc33c65afb9efe3e8a11310383b9640e1d6f0` |
| [calendar-daily-grid-light-desktop-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-grid-light-desktop-linux.png)           | C      | `866999d91c24577aa726da715f7a2ce52d0c4a5b6d333c983036e5fd1b2ad62b` |
| [calendar-daily-grid-dark-mobile-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-grid-dark-mobile-linux.png)               | C      | `5b76b42120db7ede0b68583863c67d296f7d24bc2977eaa710b6b3c9e7a25fa2` |
| [calendar-daily-grid-dark-tablet-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-grid-dark-tablet-linux.png)               | C      | `79dc4e701769563846c4d9f0916a7b3048b398545696802680ca9a92a9a6a150` |
| [calendar-daily-grid-dark-desktop-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-grid-dark-desktop-linux.png)             | C      | `5717d26df90b5b1ee23c54f6de6cf0b11954ec49a2e2a7cf76d1d957ba9b9c03` |

## Vérification et limites

Les tests de mise en page et les parcours ont d’abord échoué sur le comportement attendu, puis réussi après adaptation. Les parcours mesurent les 31 cases aux largeurs 320/390/768/1440 px, en clair/sombre et à ×1, ×1,3 et ×2 : colonnes égales et contenues, hauteur minimale de 48 dp, montants plafonnés à ×1,3 et détail agrandi à la taille complète. Ils vérifient aussi les petits déficits, les valeurs absentes/nulles, les couleurs, le clavier, les annonces et le résumé mensuel inchangé.

Expo Web ne reproduit pas le `fontScale` système ni `maxFontSizeMultiplier` : les tests navigateur agrandissent le texte en appliquant le plafond natif partagé aux seuls montants compacts. Les preuves CI à 320 px et ×2 ont aussi été inspectées en clair et sombre. La revue indépendante du sous-agent `final_review_386` approuve le code et l’adoption des sept PNG nouveaux ou modifiés ; les huit autres références restent inchangées.

Le propriétaire a déjà validé `a1d7d44` sur Pixel 5 / Android 35 : contrat, signes, détail, sélection, annonces et thème sombre. La nouvelle grille doit être revérifiée sur ce development build à ×1, ×1,3 et ×2. TalkBack avec la voix et iOS restent à couvrir dans la recette groupée #213 ; les parcours Chromium ne les remplacent pas. Le bouton Prévisionnel coupé à ×1,3 et la relecture du mois au retour par l’onglet restent hors périmètre, conformément à la demande.
