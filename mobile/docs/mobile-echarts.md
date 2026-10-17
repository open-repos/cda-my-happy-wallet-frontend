# Graphiques mobiles — décision et validation #122

## Diagnostic et choix minimal

Base : `develop` au commit `8221869`. La dépendance #119 est fermée et la
synthèse budgétaire est intégrée. L'issue #122 n'a aucun commentaire expliquant
un incident technique : son label ne prouve pas une incompatibilité native.
Les trois dépendances graphiques et leur intégration mobile étaient absentes.
Aucune PR existante liée à #122 n'a été trouvée lors de cette intervention.

Le Web utilise déjà ECharts 6.1.0. Le mobile conserve React 19.2.3 et React
Native 0.86.3; l'alignement des correctifs Expo 57.0.30 est arrivé sur
`develop` par #129, cette PR ne modifie plus les versions Expo. Ajout en
versions exactes :

| Dépendance                 | Version | Motif                                                  |
| -------------------------- | ------- | ------------------------------------------------------ |
| echarts                    | 6.1.0   | Alignement sur le Web                                  |
| @wuba/react-native-echarts | 3.1.1   | Portage SVG imposé par la décision                     |
| react-native-svg           | 15.15.4 | Version du `bundledNativeModules.json` d'Expo installé |

Commande exécutée depuis `mobile/` :

```bash
EXPO_OFFLINE=1 npx expo install @wuba/react-native-echarts@3.1.1 echarts@6.1.0 react-native-svg@15.15.4 -- --save-exact
```

Le premier essai en ligne a échoué sur un délai du proxy Expo. Le mode hors
ligne utilise la matrice de compatibilité embarquée; npm a téléchargé les
paquets. Cela ne constitue pas une preuve de compatibilité Android.
Le lockfile résout un unique `zrender` 6.1.0. Skia n'est pas installé.
L'import dédié `@wuba/react-native-echarts/svgChart` évite l'entrée globale
qui expose aussi Skia. Sources :
[import individuel Wuba](https://wuba.github.io/react-native-echarts/docs/advanced-guides/import-individually),
[code Wuba](https://github.com/wuba/react-native-echarts).

## Comportement

Deux sections indépendantes sur le tableau de bord : dépenses réelles du mois
par catégorie en barres et anneau global des objectifs EUR. Les appels passent
par le client HTTP autorisé existant. Comme le Web, les dépenses excluent les
charges fixes et les entrées; toutes les pages d'opérations et de catégories
sont lues via le gateway existant. Les objectifs sont lus sur `/goals` avec
pagination contrôlée. Aucun changement backend ni donnée simulée.

Le mois suit Europe/Paris. Les calculs se font en centimes; chaque objectif
est plafonné à sa cible avant le calcul global, arrondi à l'inférieur comme
sur le Web. Les montants réels par objectif restent lisibles sous l'anneau.
Chargement, vide, erreur et relance sont propres à chaque section; retour sur
l'écran recharge les données et les réponses obsolètes sont ignorées.

Les graphiques utilisent les tokens du thème clair (`themes.light.color`),
comme le reste de l'application mobile qui n'a pas encore de thème sombre :
en mode sombre système, les cartes restent cohérentes avec l'écran. L'axe des
montants limite les graduations (`splitNumber: 3`, `hideOverlap`) pour qu'elles
ne se chevauchent pas sur un écran de 360 px. Les animations sont
désactivées. Le dessin SVG est masqué aux lecteurs d'écran, l'aria ECharts est
désactivé; une liste française visible contient chaque catégorie et montant,
le taux global et chaque objectif avec épargne/cible. Les boutons de relance
mesurent au moins 48 px. La largeur suit `onLayout`; l'instance est détruite
au changement de taille/options et au démontage.

## Recette Android

**Statut : recette faite le 17 octobre 2026 sur development build reconstruit.**

Environnement : AVD Pixel 5 API 35 (x86_64), backend local et compte de test,
development build reconstruit avec `react-native-svg` puis installé via le
script du [guide Android](android-development-build.md)
(`scripts/start-android-dev.sh --avd <avd> --install`), Metro dans Docker. Les ports
API/Metro sont inversés; ni Expo Go ni Expo Web seul.

Résultats :

- Les deux graphiques s'affichent avec les montants et le taux attendus.
- Arbre d'accessibilité : dessins SVG masqués, libellés français lus une seule
  fois.
- Grandes polices : aucun débordement des cartes graphiques.
- Mode sombre système : cartes cohérentes en thème clair (voir plus haut).
- API indisponible au démarrage : état d'erreur, puis reprise par
  « Réessayer ».
- Correctif constaté pendant la recette : graduations de l'axe qui se
  chevauchaient, corrigées par `splitNumber`/`hideOverlap`.

Hors périmètre, suivis à part : libellés d'onglets tronqués en grandes polices,
absence de thème sombre mobile. L'application est verrouillée en portrait
(`app.json`). Grille de recette conservée pour les évolutions :

- Dépenses de plusieurs catégories et plusieurs pages : montants égaux au Web,
  aucune entrée ni autre devise; mois courant Paris.
- Objectifs vides, partiels, atteints et dépassés : taux plafonné par objectif,
  sommes textuelles exactes, aucun double comptage.
- Chargement, collection vide, coupure API et relance; une section en erreur
  ne bloque ni l'autre ni la synthèse.
- Retour après modification d'une opération, changement de compte, rotation
  et navigation répétée : pas de données obsolètes ni d'instance persistante.
- Clair/sombre, grandes polices, libellés longs et TalkBack : tous les montants
  accessibles, absence de lecture SVG en double, relance activable.

## Retour arrière

Retirer les deux imports et l'insertion `DashboardCharts` du tableau de bord,
le dossier `src/features/charts`, les trois dépendances et leur lockfile via
un revert du commit. Reconstruire ensuite le development build correspondant.
La synthèse #119 et les contrats backend restent inchangés.

## Résultats dans cet environnement

- `npm ci`, format, lint, typage : réussis.
- `npm test` : 23 fichiers, 110 tests réussis, dont 7 nouveaux cas pour les
  centimes, filtrage, plafonnement, pagination, erreurs API, mois Paris et
  options SVG dans les deux thèmes. Le rendu SVG de test utilise ECharts SSR;
  il ne valide pas le pont natif Wuba ni TalkBack.
- `npm run build:web` et `npx expo export --platform android --output-dir
dist-android-check` : réussis. Le second produit un bundle Hermes, pas un APK.
- Premier `npm run doctor` : **19/20**, échec sur six correctifs Expo préexistants
  dans le manifeste et le lockfile de la base :

| Paquet             | Installé | Attendu par Doctor |
| ------------------ | -------- | ------------------ |
| expo               | 57.0.27  | ~57.0.30           |
| expo-constants     | 57.0.21  | ~57.0.22           |
| expo-dev-client    | 57.0.19  | ~57.0.20           |
| expo-linking       | 57.0.12  | ~57.0.13           |
| expo-router        | 57.0.25  | ~57.0.28           |
| expo-splash-screen | 57.0.9   | ~57.0.10           |

Ces six écarts préexistants ont ensuite été corrigés via :

```bash
EXPO_OFFLINE=1 npx expo install expo@~57.0.30 expo-constants@~57.0.22 expo-dev-client@~57.0.20 expo-linking@~57.0.13 expo-router@~57.0.28 expo-splash-screen@~57.0.10
```

Il s'agit uniquement de correctifs dans SDK 57, sans changement React/RN.
La reconstruction du development build doit inclure ces correctifs.

Après alignement et nouvelle installation propre (`npm ci`) : format, lint,
typage, 110 tests et **Expo Doctor 20/20** réussis. Les exports Web et Android
ont été relancés avec ce lockfile. Les tests automatisés ne couvrent pas les
gestes, TalkBack ni la compilation native : voir la recette Android ci-dessus.

## Correction du contrôle visuel de la PR #126

Le premier run Mobile quality a réussi format, lint, typage, tests, Doctor et
export, mais a échoué sur les neuf parcours visuels après connexion. La
première validation locale n'avait pas exécuté cette suite visuelle.

La reproduction navigateur a d'abord isolé une exception au chargement :
`Cannot destructure property '__extends' ... as it is undefined`. ECharts et
zrender embarquent tslib 2.3.0; son entrée conditionnelle `import` réexporte
un défaut UMD que Metro ne sait pas interpréter. `metro.config.js` sélectionne
l'entrée ESM du même paquet uniquement pour les imports tslib depuis ECharts
ou zrender, sur Web et natif. Les autres résolutions sont déléguées à Expo.
Aucune dépendance ni version n'est remplacée.

Le moteur SVG Wuba attend un hôte natif avec `getChartSize` et `patch`.
Son composant Web expose un élément HTML, incompatible avec ce moteur. Metro
sélectionne maintenant `NativeChart.web.tsx` pour Expo Web : cet adaptateur
utilise le moteur SVG standard d'ECharts sur un div. Android continue à
utiliser l'adaptateur Wuba de `NativeChart.tsx`, sans changement de dépendance.

La fixture visuelle sert désormais un objectif EUR. Le test du tableau de
bord vérifie les deux SVG, les montants français, le taux d'atteinte et
l'absence d'erreur JavaScript avant la comparaison visuelle. Les captures du tableau de bord sont actualisées lorsque les nouvelles sections
sont visibles; six captures dédiées aux cartes graphiques couvrent également
les trois tailles d’écran.

SVG est un format de rendu vectoriel, pas une capture figée : ECharts
recalcule le dessin à chaque mise à jour des données. Les séries restent
volontairement sans interactions tactiles (`silent`) et sans animations;
les valeurs complètes sont disponibles dans le texte accessible.

Vérification après correction : les 15 scénarios Playwright passent sans
mise à jour des références, les 110 tests unitaires passent et Doctor reste
à 20/20. Le téléchargement Chromium standard était indisponible dans cet
environnement; les tests locaux ont utilisé un Chromium 149 fourni par un
paquet temporaire hors dépôt, avec les polices Liberation. Aucune dépendance
ni configuration locale de navigateur n'a été ajoutée au projet. La CI conserve
son installation Playwright officielle et ses seuils de comparaison inchangés.

La reproduction CI a ensuite confirmé 12 parcours existants réussis et trois
écarts sur les nouvelles captures de dépenses. Les artefacts attendu/obtenu/diff
montrent un décalage vertical du tracé et des graduations, sans différence de
valeur. La hauteur de ligne des deux axes est désormais explicite (16 px,
police 12 px), pour éviter que la géométrie `containLabel` dépende des métriques
de police par défaut de l'environnement. Le seuil de comparaison reste à 1 %.
Les trois références de dépenses ont été régénérées après cette correction.

Le navigateur officiel Chrome for Testing 149.0.7827.55 (headless shell) a
finalement été téléchargé depuis le miroir Google; les derniers contrôles
utilisent directement `npm run test:visual`, sans configuration temporaire.
La CI conserve les traces et images de ses échecs pendant trois jours pour
rendre les différences vérifiables.

Les références suivent le rendu de la CI (`ubuntu-latest` et Chromium installé
par `npx playwright install --with-deps`), où les 15 scénarios passent. Dans
le conteneur local `agent-playwright` (image `mcr.microsoft.com/playwright`),
la capture tablette du tableau de bord dépasse le seuil de 1 % (8 292 pixels) :
environ un quart de l'écart vient des polices de la barre d'onglets, le reste
de la zone du graphique, car cette référence précède la hauteur de ligne
explicite des axes. Elle passe en CI avec peu de marge : la rafraîchir depuis
un artefact de rendu CI si elle échoue. Ne pas régénérer de référence depuis
ce conteneur.
