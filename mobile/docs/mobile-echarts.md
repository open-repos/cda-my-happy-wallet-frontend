# Graphiques mobiles — décision et validation #122

## Diagnostic et choix minimal

Base : `develop` au commit `8221869`. La dépendance #119 est fermée et la
synthèse budgétaire est intégrée. L'issue #122 n'a aucun commentaire expliquant
un incident technique : son label ne prouve pas une incompatibilité native.
Les trois dépendances graphiques et leur intégration mobile étaient absentes.
Aucune PR existante liée à #122 n'a été trouvée lors de cette intervention.

Le Web utilise déjà ECharts 6.1.0. Le mobile passe du correctif Expo 57.0.27 à 57.0.30 et conserve React
19.2.3 et React Native 0.86.3. Ajout en versions exactes :

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

Les tokens clair/sombre suivent le thème système. Les animations sont
désactivées. Le dessin SVG est masqué aux lecteurs d'écran, l'aria ECharts est
désactivé; une liste française visible contient chaque catégorie et montant,
le taux global et chaque objectif avec épargne/cible. Les boutons de relance
mesurent au moins 48 px. La largeur suit `onLayout`; l'instance est détruite
au changement de taille/options et au démontage.

## Recette obligatoire avant clôture

**Statut : préparé, recette Android non établie. Garder #122 ouverte et bloquée.**
L'environnement de cette intervention n'a ni Docker, ni SDK/ADB, ni émulateur.
Les commandes de contrôle ont été lancées directement dans le checkout isolé,
conformément à AGENTS.md. Les exports Metro ne remplacent pas cette recette.

Suivre [le guide Android](android-development-build.md) avec le backend local
et un compte de test. Après installation des dépendances, reconstruire le
**development build**, car `react-native-svg` ajoute du code natif :

```bash
cd mobile
npm ci
npx expo prebuild --platform android --no-clean
npx expo run:android --device
npm run start:dev-client
```

Choisir l'AVD Pixel 5 du guide; conserver les ports API/Metro inversés et ne
pas utiliser Expo Go ou uniquement Expo Web. Vérifier :

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

Joindre avant clôture : commit testé, versions npm/Expo/RN/SVG/Wuba, AVD et ABI,
commande et résultat de compilation, installation APK, captures clair/sombre,
résultats TalkBack et des cas ci-dessus. Aucune preuve Android n'est revendiquée.

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
ont été relancés avec ce lockfile. Seule la recette du development build
Android reste à établir; les tests automatisés ne couvrent pas les gestes,
TalkBack ni la compilation native.
