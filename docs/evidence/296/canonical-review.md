# Revue des références canoniques de #305

Source : [Web visual regression, run 40477114195](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/40477114195), commit `bd7669d031525a9a17f9f8513ccdb4dc4cd7e11b`, artefact `web-visual-evidence` (12720763401).

Les 58 captures modifiées ont été comparées aux références précédentes dans les deux thèmes et aux trois largeurs. Les 32 captures sans écart restent inchangées. Les PNG proviennent du Chromium et du runner Linux de la CI ; aucune référence du navigateur local n’a été utilisée.

Écarts attendus : boutons sauge avec icônes et libellés, séparation des actions destructives, contraste sombre, hauteur tactile, contour de focus rapproché, FAB contrasté dans une rangée dédiée sur téléphone. Les tableaux, graphiques et dernières actions des pages longues restent présents. Les données sont synthétiques.

Sur téléphone, `prepareFullContentCapture` remet le défilement en haut puis étend le conteneur interne uniquement pour la capture pleine page. Cela évite de tronquer les objectifs ou de capturer une zone vide. Les assertions de géométrie précèdent cette adaptation. Les tests `actionDesign.spec.js` vérifient séparément le viewport réel, le défilement, le FAB et son masquage pendant le formulaire ou la navigation. Aucun seuil de comparaison ni workflow n’est modifié.

Cette revue Chromium ne remplace pas la recette Safari/PWA sur appareil réel.

| Référence                               | Avant (px)  | Après (px)  | SHA-256 du PNG canonique                                           |
| --------------------------------------- | ----------- | ----------- | ------------------------------------------------------------------ |
| `desktop/budget-forecast-dark.png`      | 1440 × 2426 | 1440 × 2420 | `84975b48dd8b6ace924a24f2e0618d41d155ce952909f12d3005f059e53b893c` |
| `desktop/budget-forecast-light.png`     | 1440 × 2426 | 1440 × 2420 | `0e380b163ce2cfcfb18c8778a925fc3b73b1ed8626a00249e700229a3e5c3e2b` |
| `desktop/calendar-dark.png`             | 1440 × 1979 | 1440 × 1967 | `2433884c2f0ffab778fae1186ef27f548476bb8d01c58bf2cb04e0bbb3b6e481` |
| `desktop/calendar-light.png`            | 1440 × 1979 | 1440 × 1967 | `d486d93edb030f8a6b3e3595ac0d3a98afc78049748cfb545d6a659fb87de45d` |
| `desktop/categories-dark.png`           | 1440 × 900  | 1440 × 900  | `31577f310d9aa6b0de25dcbef15e7bfd40871343319e5c0fb94be65651c820d6` |
| `desktop/categories-light.png`          | 1440 × 900  | 1440 × 900  | `8bfc3748c63741f768ad1c912c2619df2c5bb7922ad670e29dcf33576b3d712c` |
| `desktop/events-goals-dark.png`         | 1440 × 2393 | 1440 × 2387 | `85f38b7029db41f0fa5acec4c59d20c790d0009a6c9268821692ac0166e17779` |
| `desktop/events-goals-light.png`        | 1440 × 2393 | 1440 × 2387 | `ff617ba591ec275ce660377a9a75a3dbc839682f519e5d41091c5d3ccc813c66` |
| `desktop/operations-dark.png`           | 1440 × 900  | 1440 × 900  | `bce44ed4f0af8b5cddb4645cc3d63562f26ed9fa93df2923fc25349dfd25f36a` |
| `desktop/operations-empty-dark.png`     | 1440 × 900  | 1440 × 900  | `d8db544496ef9f0b690ad64d07de42c99ae831b6a4e0e923b6850021be131d82` |
| `desktop/operations-empty-light.png`    | 1440 × 900  | 1440 × 900  | `7e23f5ac2f582ab3ee6d680f08b31457f36b9d089b1deb1b7b21e1610eab734d` |
| `desktop/operations-light.png`          | 1440 × 900  | 1440 × 900  | `59b9d0219096ba9283ffb97deeca0c4ad272ebd1893af4888d5c377992e18b4b` |
| `desktop/savings-comparison-dark.png`   | 1440 × 3399 | 1440 × 3387 | `b59c7f55b840494d4a663b91e3caa450f3a6a9a4e95efafef6f6d5c3718ec05f` |
| `desktop/savings-comparison-light.png`  | 1440 × 3399 | 1440 × 3387 | `c3196733d7e3d2fef8452c13a7efaa3babce10157eb727be727f183a2dcc2a06` |
| `desktop/simulation-calendar-dark.png`  | 1440 × 2367 | 1440 × 2349 | `ef8968148374aaa5b9d11eb70631a6261856adb61640345b6944b336409ead6c` |
| `desktop/simulation-calendar-light.png` | 1440 × 2367 | 1440 × 2349 | `c744dcccbbb1f0b0e1ba002bbd0c53779de103bcb5a9945d52c93a2493140ca2` |
| `mobile/analytics-dark.png`             | 390 × 1308  | 390 × 1325  | `eb8422c723a6a2679df2e2e31ff5f829e73b51bc6fb52118036316e448623c71` |
| `mobile/analytics-light.png`            | 390 × 1308  | 390 × 1325  | `80c8d58996e36e72f43823ca7e0a2f136fefe50f754a22b8c72913b9bc456fff` |
| `mobile/budget-forecast-dark.png`       | 390 × 3153  | 390 × 3152  | `69ecc8a237abe0cb117b7d40af60b12e8e1345beab044351e52067d08d466d97` |
| `mobile/budget-forecast-light.png`      | 390 × 3153  | 390 × 3152  | `2db337e085ea83ec68a3db1f31854b0edd2e90bcaf9240f1eeb1ce4bc3391f15` |
| `mobile/calendar-dark.png`              | 390 × 2782  | 390 × 2797  | `2bccd7aa53d3e39e218fda14a29eab0b523fc72ee4e50ed6ed4ea0cdf97488d7` |
| `mobile/calendar-light.png`             | 390 × 2782  | 390 × 2797  | `e936577d9d219bbdb4d196a98cf91f3d1a8f3e4468302e7960834675eaac1b07` |
| `mobile/categories-dark.png`            | 390 × 996   | 390 × 1013  | `7a781a5b21a7b71f2e2ca3cd0e82a1a4dc41384af2b16cae1f022ca012615b3f` |
| `mobile/categories-light.png`           | 390 × 996   | 390 × 1013  | `ef532537d67b58165612ceca720817152b0c4fcf37c83605afd1e17c6b19f9d8` |
| `mobile/events-goals-dark.png`          | 390 × 4006  | 390 × 4007  | `51a8687ef594b8e742f377ec17a619c437c74c46236445cd72a346cef023c5b1` |
| `mobile/events-goals-light.png`         | 390 × 4006  | 390 × 4007  | `cd0d4baf7990fcd2aafd037868300c0334ba4e0a8f833a22d23378dc04e15247` |
| `mobile/home-dark.png`                  | 390 × 3163  | 390 × 3180  | `cac910d48813ceff32a0300cd3188b287a88c688a7e3418fb596a5944d7dc26f` |
| `mobile/home-light.png`                 | 390 × 3163  | 390 × 3180  | `eb7859fe23e066ff3df024d56b06a60a3242da375c7477903670139e2405c16f` |
| `mobile/operations-dark.png`            | 390 × 996   | 390 × 1013  | `a78ea62445de9d54a9b6f6a5e232263331096449c305a210d8336b1e189aed20` |
| `mobile/operations-empty-dark.png`      | 390 × 996   | 390 × 1013  | `bc35fe8d1f00e6eac3ec1d0ff36aa96b115fc83b4019eee325ced9366deb15a6` |
| `mobile/operations-empty-light.png`     | 390 × 996   | 390 × 1013  | `886aa18d9dabfa4a8cbe227c0e450089d4c01660be0f7a27a4a007cf8b4cc40e` |
| `mobile/operations-error-dark.png`      | 390 × 996   | 390 × 1013  | `cd0b925143fd42369144952f0e86d6a05a810471a4cfa5345767c7694619303d` |
| `mobile/operations-error-light.png`     | 390 × 996   | 390 × 1013  | `d2b1cbf6f1bb057a9b7d80eb9cbd07ed6e06d88334bf10777e8caf018b7df610` |
| `mobile/operations-light.png`           | 390 × 996   | 390 × 1013  | `cfde7f8c526b93687535a0e19488a366b1029c84cbb6538e2bb39e1fc51ff81b` |
| `mobile/operations-loading-dark.png`    | 390 × 996   | 390 × 1013  | `824bcbec91eb0f50b8e2fdc5e7cb9b5a8aeaa293ee921fb1ace85f00ce395610` |
| `mobile/operations-loading-light.png`   | 390 × 996   | 390 × 1013  | `ef4c9a162633a3f680fe13f36006c939f4f66be5d531210d005382126c325e16` |
| `mobile/profile-dark.png`               | 390 × 954   | 390 × 971   | `3439ff997ae236ce5f4ce602f1602f4011dd6aeebe61d525b9dc43fc9f26eea5` |
| `mobile/profile-light.png`              | 390 × 954   | 390 × 971   | `7132ed207d6a8438f1e3c0bf5301eb1a678676ba603adc059eb99227b43efc6c` |
| `mobile/savings-comparison-dark.png`    | 390 × 6698  | 390 × 6687  | `27c522b35709c9d749ddce752e106bebb4475105249682d3c22047c1b30fcf65` |
| `mobile/savings-comparison-light.png`   | 390 × 6698  | 390 × 6687  | `eaa2e384af1b81ddf2a59f5be097f1dabb452bb8942c142a86a6a00338a3e516` |
| `mobile/simulation-calendar-dark.png`   | 390 × 3329  | 390 × 3332  | `15de07608ca647e5805bcf0b9ac290cbf5d5f7ec3c5939cf8d40184379ccbc9a` |
| `mobile/simulation-calendar-light.png`  | 390 × 3329  | 390 × 3332  | `9d4ddb019b9939e366b2194d820e3acec5ade43d70ef354963a3cc5cf6b6303b` |
| `tablet/budget-forecast-dark.png`       | 768 × 2726  | 768 × 2714  | `a4a8d2ddf204213d55228f6b66fbe0bf6dee941e58a4c07ccbc968ad5564254a` |
| `tablet/budget-forecast-light.png`      | 768 × 2726  | 768 × 2714  | `8c1d1f99a71b59c6c1f0ea3836edc7faa121773596b0f91fa4c255b08dab285c` |
| `tablet/calendar-dark.png`              | 768 × 2420  | 768 × 2396  | `c3507099a322b81cf0d9a509dfc85f6ee012b071896e6a2276f8494d938cb755` |
| `tablet/calendar-light.png`             | 768 × 2420  | 768 × 2396  | `d095d398e945e2ee85d35308f6dc38344c3949d1655a1a36f4fa4d0c9d1973ac` |
| `tablet/categories-dark.png`            | 768 × 1024  | 768 × 1024  | `29a7856e88f4d6c14d567e9a058cc92e58427c22172a4b8676314fc0066c74a6` |
| `tablet/categories-light.png`           | 768 × 1024  | 768 × 1024  | `4b6284f282dc2246943c71b0b3a89b5de5ce5286c75df67624d3c3aefbfc0256` |
| `tablet/events-goals-dark.png`          | 768 × 3195  | 768 × 3179  | `9d307d5bcc2a403883f0d04d0ee3c8762f85083fdebcb49bc1949f7b33e5c31e` |
| `tablet/events-goals-light.png`         | 768 × 3195  | 768 × 3179  | `7a84cc818708cd4a689e9de76d8334e8b81edf6ec6d12cb4b176e8185f32ee68` |
| `tablet/operations-dark.png`            | 768 × 1024  | 768 × 1024  | `9b584247a1094587b9075aa1f2237dd43ae81f58300f767770c1b7e7463ad2ad` |
| `tablet/operations-empty-dark.png`      | 768 × 1024  | 768 × 1024  | `3380e5739962c92742aa23d6c37b7a56275d047658f06821ba021225c2cd52d6` |
| `tablet/operations-empty-light.png`     | 768 × 1024  | 768 × 1024  | `f515cd1631f16c594cbbcef14dc22447c1ee5c2269e1052edcfbf0032818be2c` |
| `tablet/operations-light.png`           | 768 × 1024  | 768 × 1024  | `0642618d79ebd26ef223337f6ef438d3f8a57b8430fcbf6f3cef71513a8330ba` |
| `tablet/savings-comparison-dark.png`    | 768 × 4998  | 768 × 4976  | `c04b64209f7634cea65eeb4790b6174a16357ec029294270aadb0d29845e2ee5` |
| `tablet/savings-comparison-light.png`   | 768 × 4998  | 768 × 4976  | `5272319db70bda4b544fcbb883a634620085bcb55ffe6cd37e14edfe0d1b8129` |
| `tablet/simulation-calendar-dark.png`   | 768 × 2833  | 768 × 2803  | `24ec6666ebbc9d590b47305db66291406ef1d81775574479aa4f9a25d55b6bc4` |
| `tablet/simulation-calendar-light.png`  | 768 × 2833  | 768 × 2803  | `f51ced9ebb0fca3b2b2d360e14cee1f26777fd5c82dd1f2e9ca759dd58de05de` |
