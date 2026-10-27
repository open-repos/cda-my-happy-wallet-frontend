# Revue du calendrier Web/PWA

Les six références calendrier hors Simulation proviennent du [run canonique 40550833537](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/40550833537), commit `beaec6c2d0fa74c3939a10c09ed541bf547e35f5`, artefact 12754527783. Elles ont été comparées aux anciennes images aux trois largeurs, en clair et sombre. Les montants de synthèse sont inchangés ; le détail commun remplace les deux anciennes listes. Les opérations fictives d’août ne sont plus montrées dans le mois d’octobre. Les parcours mixtes à 122 opérations couvrent séparément les données du mois et leur pagination.

La première revue a refusé les boutons étirés sur téléphone : le flex est désormais neutralisé dans la colonne et les tests contrôlent 44 à 80 px avant zoom, sans fixer de hauteur maximale en production. Le focus clavier et les annulations sont couverts.

Les six vues Simulation ont ensuite été comparées et relues depuis le [run canonique 40552647692](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/40552647692), commit `2b3c5f4a46214fb72849c8c1666c0068fc5f245e`, artefact 12756660088. Le lien de gestion utilise le texte secondaire de la surface et une cible de 44 px ; les tests mesurent son contraste à au moins 4,5:1 dans les deux thèmes. Les douze références du calendrier ont donc été revues. Les références des autres écrans restent inchangées. Aucun seuil visuel ni workflow modifié ; aucune référence générée par le navigateur local. Les captures de CI sont synthétiques et ne remplacent pas une recette iPhone Safari/PWA/VoiceOver.

## Empreintes des références relues

| Référence                               | Avant (px)  | Après (px)  | SHA-256                                                            |
| --------------------------------------- | ----------- | ----------- | ------------------------------------------------------------------ |
| `desktop/calendar-dark.png`             | 1440 × 1967 | 1440 × 1702 | `4f4000395f139725345e49a42628f0eb05e55406a11203e69d3103331ef7e08f` |
| `desktop/calendar-light.png`            | 1440 × 1967 | 1440 × 1702 | `9034638d1a4f466460cb3a02bf23a0eb4f6e4931325c437a73258ea310102e00` |
| `desktop/simulation-calendar-dark.png`  | 1440 × 2349 | 1440 × 2084 | `a6ec203a6546d52a4b7e4923a8cce2dccd1ccc19acf4af8db80812a16aface5b` |
| `desktop/simulation-calendar-light.png` | 1440 × 2349 | 1440 × 2084 | `1f4fabd6b046854247b5e0490229078e21276c0ecccca74cdc29aad029defe68` |
| `mobile/calendar-dark.png`              | 390 × 2797  | 390 × 2558  | `8161f7b64f554f3763d946977817dad68866c7960e5632464d3d9d3ac731d475` |
| `mobile/calendar-light.png`             | 390 × 2797  | 390 × 2558  | `9994f419ac02596b8d4c9541d1b87af78e0d0eac995e317b20f0e8a8c26bad24` |
| `mobile/simulation-calendar-dark.png`   | 390 × 3332  | 390 × 3299  | `3feec7fb11d8d602516c80f70f586cbf01f1deacfbe01db145980c800d0f9767` |
| `mobile/simulation-calendar-light.png`  | 390 × 3332  | 390 × 3299  | `5c6233b34df10e7afe982d1c3d722577e0c0d4b7016adc15e98394e45ca829e8` |
| `tablet/calendar-dark.png`              | 768 × 2396  | 768 × 2161  | `ed90a9a95c0e7e04cc9c92acb03d208d336f8a1ab536f11a52022926747d0473` |
| `tablet/calendar-light.png`             | 768 × 2396  | 768 × 2161  | `9fa2add4e17024254710e8564f7a7bb0513728d987c95587693ca841b1d5c13a` |
| `tablet/simulation-calendar-dark.png`   | 768 × 2803  | 768 × 2750  | `cf7d66b8ff9f0a6d716bc3b4e80dc21647ad47e5ddb1ba7195c9752cd0faa4fc` |
| `tablet/simulation-calendar-light.png`  | 768 × 2803  | 768 × 2750  | `0a602a038a34bdfa9f855b56997ca003503e226aacd2e887c7c63489562d42fb` |
