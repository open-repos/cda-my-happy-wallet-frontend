# Versionnement De L'Application Et Compatibilite API

## Contexte

Le Web, l'application Expo, les binaires Android/iOS et l'API n'ont pas le
meme cycle de livraison. Une version lisible doit identifier les fonctions de
l'application, tandis que les stores exigent un numero de build strictement
croissant. L'API expose deja ses contrats metier sous `/v1`.

## Decision

- `mobile/app.json` porte la version fonctionnelle SemVer de l'application dans
  `expo.version`. `mobile/package.json` reprend exactement la meme valeur.
- Un changement incompatible ou une nouvelle famille fonctionnelle incremente
  la version majeure ; une fonction compatible incremente la mineure ; un
  correctif compatible incremente le patch.
- Android `versionCode` et iOS `buildNumber` sont geres a distance par EAS. Le
  profil `production` les incremente automatiquement.
- Le code mobile declare la seule version majeure d'API qu'il sait consommer
  dans `src/config/versioning.ts`. La version `0.1.0` consomme `/v1`.
- Une nouvelle version majeure de l'API reste parallele a la precedente pendant
  la fenetre de migration. Une application ne bascule vers `/v2` que dans une
  livraison testee qui modifie explicitement ce contrat.
- Les tags de release utilisent `vMAJOR.MINOR.PATCH` et ne sont crees qu'apres
  recette du commit exact sur `main`. Les tags et le deploiement restent des
  actions manuelles du proprietaire.

Le controle `npm run version:check` bloque une divergence entre les manifests,
un format autre que `MAJOR.MINOR.PATCH`, la perte du compteur EAS distant ou la
desactivation de l'incrementation des builds de production. `npm test` execute
ce controle avant Vitest.

## Options Ecartees

### Utiliser la version SemVer comme numero de build natif

Cette option centralise les valeurs, mais les stores exigent un entier Android
et une chaine iOS croissants pour chaque nouveau binaire, y compris lorsque la
version fonctionnelle ne change pas. EAS evite les collisions entre postes et
pipelines.

### Negocier automatiquement plusieurs versions majeures d'API

Une negociation dynamique permettrait a un meme binaire de parler a plusieurs
API, mais elle multiplierait les contrats et les chemins de test. Le produit ne
dispose actuellement que de `/v1`; une migration explicite reste plus simple et
plus sure.

### Lier la compatibilite API au SDK Expo

Le SDK decrit la compatibilite native, pas le contrat metier du backend. Ces
deux evolutions restent independantes.

## Consequences Et Cas D'Echec

- Une modification de `app.json` doit aussi modifier `package.json`.
- Plusieurs reconstructions d'une meme version fonctionnelle sont possibles,
  car EAS incremente seulement le numero technique.
- Une erreur reseau, un timeout ou une reponse `5xx` ne prouve pas une
  incompatibilite de version. L'application conserve son retour d'erreur reseau
  et permet de reessayer sans effacer la session.
- Un `401` suit le mecanisme existant de renouvellement de session. Un echec de
  renouvellement renvoie vers l'authentification ; il ne provoque pas de
  changement de version d'API.
- Une reponse indiquant un contrat non supporte doit etre traitee comme une
  incompatibilite applicative et conduire a publier une version corrigee. Aucun
  endpoint de version minimale n'existe encore ; il devra faire l'objet d'une
  issue frontend/backend avant d'ajouter un blocage de mise a jour.
- Android et iOS n'autorisent pas le remplacement d'un binaire publie. Le
  retour arriere consiste a reconstruire un correctif avec un nouveau numero de
  build. Une mise a jour JavaScript a distance reste hors perimetre tant
  qu'Expo Updates n'est pas adopte par une decision separee.

## Procedure De Release Reproductible

1. Choisir la prochaine version SemVer a partir des fragments de changelog.
2. Mettre a jour `expo.version` et `package.json.version` dans le meme commit.
3. Executer `npm run version:check`, puis tous les controles mobiles.
4. Produire un development build et verifier sur appareil ou emulateur la
   connexion a `/v1`, la reprise de session apres redemarrage, le renouvellement
   apres `401` et le comportement hors reseau.
5. Produire un build `preview` depuis `develop` et recetter le binaire exact.
6. Apres validation humaine, fusionner la release sur `main`, creer le tag
   correspondant, puis lancer manuellement le build `production` et la
   soumission store.

La prochaine validation humaine porte sur un development build Android puis
iOS de la premiere release candidate. Elle doit relever la version visible, les
numeros de build EAS, la version `/v1` utilisee et les quatre controles de
session/reseau ci-dessus.
