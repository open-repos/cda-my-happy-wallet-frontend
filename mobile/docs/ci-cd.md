# Strategie CI/CD Mobile

## Responsabilites

- GitLab CI reste la source de verite pour la qualite : installation propre,
  format, lint, type-check, tests, Expo Doctor et export Web.
- EAS Build produit et signe les binaires Android et iOS.
- EAS Submit publie les binaires deja valides vers Google Play et App Store
  Connect.
- EAS Workflows n'est pas ajoute pour eviter de dupliquer l'orchestration
  GitLab.

## Environnements

| Profil        | Usage                  | Declenchement                | Distribution           |
| ------------- | ---------------------- | ---------------------------- | ---------------------- |
| `development` | appareil et simulateur | manuel                       | development build      |
| `preview`     | recette interne        | manuel depuis `develop`      | APK/TestFlight interne |
| `production`  | stores                 | manuel depuis un tag protege | AAB/App Store archive  |

Les builds EAS restent manuels tant que les comptes stores, signatures et
quotas ne sont pas valides. Une pipeline de merge request ne doit jamais
declencher un build distant payant.

## Flux Cible

1. Une merge request execute les controles GitLab locaux au projet mobile.
2. Le merge dans `develop` autorise un build `preview` manuel.
3. Une release versionnee sur `main` autorise les builds `production` manuels.
4. La soumission store est une action manuelle distincte apres recette du
   binaire exact.
5. GitLab conserve le lien EAS du build dans la trace du job.

La commande CI cible est :

```bash
npx eas-cli build --platform android --profile preview --non-interactive --no-wait
```

Le profil et la plateforme varient selon le job. `--no-wait` valide le
declenchement et laisse EAS executer le build sans monopoliser le runner.

## Initialisation EAS Requise

Avant d'activer les jobs distants :

1. Creer le projet dans un compte ou une organisation Expo dediee.
2. Executer une fois `eas init` afin d'ajouter le `projectId` public dans la
   configuration Expo.
3. Creer `eas.json` avec les trois profils.
4. Effectuer un premier build interactif Android puis iOS pour initialiser les
   signatures et repondre aux invites EAS.
5. Configurer ensuite `EXPO_TOKEN` dans GitLab pour les executions
   `--non-interactive`.

Cette initialisation ne doit pas etre automatisee avant la creation du compte
Expo et la validation du proprietaire des credentials.

## Secrets Et Configuration

- `EXPO_TOKEN` : variable GitLab masquee, protegee et limitee aux branches ou
  tags proteges.
- Les credentials de signature restent geres par EAS ; aucun keystore,
  certificat, profil ou mot de passe n'est commite.
- `EXPO_PUBLIC_API_ORIGIN` est public par nature et configure par environnement.
- Aucun secret applicatif ne doit utiliser le prefixe `EXPO_PUBLIC_`.
- Les tokens Expo doivent etre revocables et soumis a une rotation documentee.

## Versionnement

- `expo.version` suit SemVer et reste versionne dans Git.
- `package.json.version` reprend la meme valeur et `npm run version:check`
  controle les deux manifests avant les tests.
- EAS utilise `cli.appVersionSource: remote` pour les versions techniques.
- Le profil `production` utilise `autoIncrement: true` pour eviter les doublons
  de `versionCode` Android et `buildNumber` iOS.
- Un tag mobile ne doit etre cree qu'apres pipeline verte sur `main`.

La politique complete, la compatibilite `/v1` et la recette de release sont
decrites dans [versioning-and-api-compatibility.md](versioning-and-api-compatibility.md).

## Prerequis Stores

- Android : compte Google Play Console, application creee et premier AAB charge
  manuellement avant l'automatisation complete.
- iOS : abonnement Apple Developer actif, bundle identifier reserve et droits
  de gestion des certificats/profils.
- Une recette sur appareil reel est obligatoire avant chaque soumission.

## Retour Arriere

- Ne jamais soumettre automatiquement un build non recette.
- Conserver le dernier binaire store valide et son identifiant EAS.
- En cas de regression JavaScript compatible, une strategie EAS Update pourra
  etre etudiee dans une decision separee.
- En cas de regression native, incrementer la version technique et reconstruire
  un binaire corrige ; un store ne permet pas de remplacer un binaire publie.

## Prochaine Implementation

Ajouter a GitLab CI un job de validation mobile sans `EXPO_TOKEN` ni appel EAS.
Les jobs EAS resteront absents jusqu'a l'initialisation humaine du projet et des
comptes stores.
