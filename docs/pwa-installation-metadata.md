# Identité d’installation PWA — #52

Le manifeste `public/manifest.webmanifest` et les liens de `index.html` donnent au
navigateur une identité publique pour My Happy Wallet. Le build Vite copie ces
fichiers dans `dist/`. Aucun service worker n’est enregistré et aucune réponse
privée n’est mise en cache par ces métadonnées.

## Contrat public

| Champ ou ressource         | Valeur                                        | Raison                                                                                                                     |
| -------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `id`, `start_url`, `scope` | `/`                                           | Identité stable sur l’origine, sans token ni paramètre utilisateur ; l’ouverture passe par les routes protégées existantes |
| `name`, `short_name`       | My Happy Wallet / MyHappyWallet               | Nom complet et libellé compact                                                                                             |
| `lang`, `dir`              | `fr`, `ltr`                                   | Interface française ; le document HTML déclare aussi `lang="fr"`                                                           |
| `display`                  | `standalone`                                  | Préférence pour une fenêtre d’application, selon le navigateur                                                             |
| `theme_color`              | `#075E3B`                                     | Vert du design system (`green800`)                                                                                         |
| `background_color`         | `#F4F9F0`                                     | Fond clair du design system (`neutral100`)                                                                                 |
| Icônes standard            | PNG 192×192, PNG 512×512 et SVG               | Tailles courantes et source vectorielle                                                                                    |
| Icône `maskable`           | PNG 512×512 distinct                          | Logo entièrement dans le cercle sûr central, fond opaque jusqu’aux bords                                                   |
| Icône Apple                | PNG 180×180                                   | Lien explicite `apple-touch-icon`                                                                                          |
| Métadonnées Apple          | mode Web app, titre et barre d’état `default` | Repli iOS sans demander de contenu sous la barre d’état                                                                    |

Le manifeste ne contient ni raccourci vers une opération, ni identifiant de
personne, ni jeton, ni URL externe. Il ne redirige pas vers une application store
(`prefer_related_applications: false`). La langue du document ne change ni les
formats financiers ni le contenu des routes.

Le logo à pièces existant `src/assets/icons/logo.svg` est conservé. Le fond et
les marges sont préparés pour l’installation ; les icônes de catégories restent
indépendantes. Les PNG sont opaques. La version maskable contient le dessin dans
un carré central de 288 px sur 512 px, entièrement inscrit dans le cercle sûr de
rayon 204,8 px. Les plateformes peuvent découper le fond sans couper le logo.

## Régénérer les icônes

Prérequis : Node 22 et le Chromium de la dépendance Playwright existante.

```bash
npm ci
npx playwright install --with-deps chromium
npm run pwa:icons
```

Le générateur lit le SVG et les tokens locaux, sans réseau ni téléchargement
d’image. Il produit les deux SVG de présentation et les quatre PNG dans
`public/icons`. Relire les icônes et committer les fichiers générés. Leur
régénération n’est pas nécessaire à chaque build ; les contrôles de dimensions,
décodage, opacité et zone sûre vérifient les fichiers effectivement livrés.

## Vérifications automatisées

```bash
npx vitest run test/vitest/pwaManifest.test.js
npm run build
npx playwright install --with-deps chromium
npm run test:e2e -- pwaManifest.spec.js
```

Les tests de contrat vérifient identité, langue, couleurs, chemins publics,
dimensions PNG et liens Apple.
Les tests navigateur lisent le manifeste via `Page.getAppManifest` : aucun échec
de lecture ou de parsing ne doit être signalé. Ils décodent toutes les icônes et
contrôlent les dimensions, l’opacité et la marge maskable sur trois tailles
Chromium, ainsi que l’absence d’inscription SW dans le contexte navigateur. Les tests locaux sur le build/preview vérifient aussi la copie Vite ;
la CI Web existante exécute les scénarios de navigation et la matrice visuelle.

`Page.getAppManifest` valide la reconnaissance du manifeste, pas une installation
réelle ni l’affichage d’une proposition d’installation. Les profils Chromium ne
certifient pas Safari iOS, le lanceur Android ou la barre d’état en standalone.
Les parcours SW de #48 restent exécutés séparément.

## Recette intégrée et limites

La suite du chantier reste [#49](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/49)
(worker), #50 (frontière privée), #51 (écran hors ligne) et #53 (mises à jour).
L’installation depuis le navigateur, la relance depuis l’icône, le comportement
sans réseau, les changements de version et le rollback de l’application intégrée
restent à vérifier sur appareils dans
[#54](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/54).
Le contrat HTTP privé dépend toujours du
[backend #98](https://github.com/open-repos/cda-my-happy-wallet-backend/issues/98).

Pour cette recette, servir le build sur HTTPS avec un certificat valide. Vérifier
que `/manifest.webmanifest` et `/icons/*` renvoient les fichiers statiques, pas le
HTML de repli de la SPA ; le manifeste doit être servi comme
`application/manifest+json` et les PNG comme `image/png`.
L’origine de test locale de Chromium est une exception de développement, pas un
remplacement du HTTPS de staging.

Après intégration : installer via le menu du navigateur, relancer depuis l’écran
d’accueil, vérifier le nom, l’icône et les zones sûres, puis exécuter les scénarios
connexion/hors ligne/mise à jour/rollback de #54. Les conditions de proposition
d’installation et l’actualisation des métadonnées déjà installées varient selon
le navigateur. Un changement de manifeste ne force pas immédiatement le
remplacement du nom ou de l’icône de toutes les installations existantes.

Retour arrière de #52 : retirer les nouveaux liens/meta et les fichiers publics,
puis reconstruire. Cela n’efface pas une installation déjà créée sur un appareil
et ne désinscrit pas de worker. Cette PR n’en ajoute aucun.

## Sources primaires

- [Web Application Manifest (W3C)](https://www.w3.org/TR/appmanifest/) : identité, lancement, affichage et ressources d’icônes ; document de travail.
- [Critères de proposition d’installation Chrome](https://web.dev/articles/install-criteria) : manifeste, icônes, HTTPS et différences entre navigateurs.
- [Icônes maskable (web.dev)](https://web.dev/articles/maskable-icon) : cercle sûr et découpe de la plateforme.
- [Métadonnées et icônes Web Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) : référence des replis Apple, à compléter par la recette iOS actuelle.
- [Chrome DevTools Protocol, Page](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-getAppManifest) : lecture du manifeste par Chromium.
