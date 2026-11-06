# Revue du calendrier natif — #386

Les références proviennent exclusivement du rendu de GitHub Actions :

- [Mobile quality 42267986703](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/42267986703), commit `a26fc197d307ace59a852576c92485a12d52ab11`, artefact `mobile-visual-failure` 13529110573.
- [Mobile quality 42269745445](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/42269745445), commit `ae3cd627a2941d5415149366780c99402cca679b`, artefact `mobile-visual-failure` 13529356171.

Les neuf PNG ont été inspectés puis copiés sans modification depuis les
artefacts. Aucune référence locale ni assouplissement du seuil existant
(`maxDiffPixelRatio: 0.01`) n’a été adopté.

Les trois références historiques `calendar` conservent le mode Repères et le
jour sélectionné. Elles reflètent les cibles de 48 dp, la bordure uniforme qui
empêche Aujourd’hui de réduire ses voisines et le défilement interne. Le détail
quotidien est sous le pli de ces références Repères, sans suppression de contenu.
Les PNG tablette/bureau actualisent aussi la légende exhaustive et le titre
« Éléments », déjà présents dans `develop` mais absents de leurs anciennes
références. Ces composants ne sont pas introduits par #386.
Les six nouvelles références Prévisionnel montrent le détail exact négatif
(-4,17 €) et la phrase du Web, en clair et sombre, pour téléphone, tablette et
bureau. Sur tablette et bureau, la grille montre aussi la valeur positive 17
et la valeur sélectionnée -4 ; le signe reste indépendant de la couleur.
Sur téléphone, le détail est défilé dans la vue et reste au-dessus du FAB.

[Références et revue antérieures](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/fda645cf1f80ba1f92e1f7c89c61b3db020b5acb/mobile/docs/calendar-visual-review.md).
Les anciens PNG peuvent être comparés à partir du même commit `develop`.

| Référence adoptée                                                                                                                                     | SHA-256                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [calendar-daily-remaining-light-mobile-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-light-mobile-linux.png)   | `d92b92dc6cfeba4de90f264a98066839e8a8c879c6f8b56a661265aaa84102e7` |
| [calendar-daily-remaining-dark-mobile-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-dark-mobile-linux.png)     | `0c8679ee48e3c212c1f2ac858430665d51b23190c947fb7ea7b1d3f19de9c53e` |
| [calendar-daily-remaining-light-tablet-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-light-tablet-linux.png)   | `80a498ad748fc5581e8de64394e6f0b321587ab70a0cca59ea74bf59daae8673` |
| [calendar-daily-remaining-dark-tablet-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-dark-tablet-linux.png)     | `1d8d61bc86a1201b622c3d62c773d7a1e558e0b8046d9a5f4db41841be3aa3ea` |
| [calendar-daily-remaining-light-desktop-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-light-desktop-linux.png) | `9f9f007abc14d3de94f9c6d3dfe3f274de07db728ab71a7a7f7e2bea2fbf3031` |
| [calendar-daily-remaining-dark-desktop-linux.png](../test/visual/daily-remaining.spec.ts-snapshots/calendar-daily-remaining-dark-desktop-linux.png)   | `ff19d99682b7c5d7934f8f95b3c23904301f2c7f8256f4f8c4c5c11f17fb20cc` |
| [calendar-mobile-linux.png](../test/visual/critical-screens.spec.ts-snapshots/calendar-mobile-linux.png)                                              | `66c9df3c941fc1ac3cc6666cda8beebb346f75dd9c1ed46a5e5ff678fb973065` |
| [calendar-tablet-linux.png](../test/visual/critical-screens.spec.ts-snapshots/calendar-tablet-linux.png)                                              | `6351f536936c265388e40ded6bb1e4babac238bb9bab7177b32f3548b20632b4` |
| [calendar-desktop-linux.png](../test/visual/critical-screens.spec.ts-snapshots/calendar-desktop-linux.png)                                            | `6e17706cae4657680301caaf30839bc79ea7a1c6269d7b6e58d07218564693f4` |

Les parcours contrôlent les 31 jours dans chacun des trois modes aux largeurs
320/390/768/1440 px, avec les thèmes clair/sombre et du texte agrandi à 200 %.
Ils vérifient aussi le signe des petits déficits, les valeurs absentes/nulles,
les couleurs, le détail, le clavier et le résumé inchangé. Le test d’annonces
observe les mutations de la région live : retour sur l’onglet et nouvelle
valeur serveur restent silencieux ; une sélection utilisateur est annoncée.
Expo Web ne reproduit pas le `fontScale` système : la largeur native est aussi
couverte par les tests de mise en page, sans réduction ni troncature du texte.

La revue indépendante du sous-agent `final_review_386` a vérifié le code,
les corrections et ces captures. La remarque sur les annonces pendant les
relectures silencieuses a été levée après un test rouge/vert ; la mesure de
toutes les cases a confirmé la correction de la bordure d’Aujourd’hui.

La recette sur development build Android Pixel 5 et iOS, grandes polices et
TalkBack/VoiceOver compris, reste explicitement reportée à la recette groupée
de fin de parité #213. Les parcours Chromium et les PNG ne la remplacent pas.
