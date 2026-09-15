# Development build Android en local

Ce guide couvre un poste Linux x86_64, de la creation du premier AVD au
lancement de My Happy Wallet sur l'emulateur Android. Il utilise le backend
local Docker, un development build installe dans l'emulateur et Metro pour
servir le code TypeScript.

## Definir le chemin du workspace

Dans chaque nouveau terminal, definir une fois le chemin absolu du workspace en
remplacant la valeur d'exemple par le chemin de l'installation locale :

```bash
export PATH_TO_APP="/chemin/absolu/vers/my-happy-wallet"
```

Par exemple, si le workspace se trouve directement dans `dev_sandbox/Perso` du
repertoire personnel :

```bash
export PATH_TO_APP="$HOME/dev_sandbox/Perso/my-happy-wallet"
```

Verifier la valeur avant de poursuivre :

```bash
test -f "$PATH_TO_APP/docker-compose.dev.yml" && echo "Workspace trouve"
```

La variable n'est valable que dans le terminal courant. La redefinir dans tout
nouveau terminal utilise pour les commandes de ce guide.

## Premiere installation du poste

Le workspace doit contenir les depots frontend et backend ainsi que
`docker-compose.agent.yml` et `docker-compose.dev.yml`. Un clone du frontend
seul ne fournit pas ces fichiers d'orchestration. Demander le workspace de
developpement au mainteneur si le controle precedent echoue.

Prevoir Docker Engine avec Compose v2, Android Studio, une connexion pour les
telechargements et suffisamment d'espace pour le SDK, l'image systeme, Gradle
et les dependances. Le parcours ci-dessous utilise un seul emulateur x86_64 ;
un poste ARM ou un appareil physique exige une architecture native adaptee.

### Installer le SDK et creer un AVD

1. Installer [Android Studio](https://developer.android.com/studio), puis ouvrir
   **SDK Manager** et relever le chemin **Android SDK Location**. Utiliser ce
   meme chemin pour Android Studio, ADB et Gradle.
2. Dans **SDK Tools**, installer Android SDK Platform-Tools, Android Emulator,
   Android SDK Command-line Tools (latest), et les Build-Tools demandes par le
   projet. Accepter les licences apres lecture dans l'interface.
3. Installer la plateforme de compilation du projet. Le catalogue local
   `mobile/node_modules/react-native/gradle/libs.versions.toml` indique, pour
   le lockfile courant, `compileSdk=36`, `buildTools=36.0.0` et
   `ndkVersion=27.1.12297006`. Verifier ces valeurs apres installation des
   dependances et apres toute montee de version ; ne pas choisir une version
   de NDK au hasard. Les composants natifs manquants sont signales par Gradle.
4. Dans **Device Manager > Create Virtual Device**, choisir un telephone Pixel,
   puis telecharger une image **Google APIs, API 35, x86_64** pour reproduire
   l'emulateur historique. La version Android de l'AVD est distincte du SDK
   utilise pour compiler ; elle doit etre au moins egale au `minSdk` du projet.
5. Donner un nom explicite, par exemple `Pixel_5_API_35_Light`, terminer la
   creation et demarrer l'AVD. Ce nom est un exemple a creer, pas un appareil
   fourni avec Git.

Definir maintenant le SDK du terminal en remplacant le chemin d'exemple par
**Android SDK Location** releve ci-dessus. Ces variables doivent aussi etre
definies dans chaque nouveau terminal :

```bash
export ANDROID_HOME="/chemin/absolu/du/sdk-android"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

Sous Linux, l'acceleration utilise KVM. Verifier la virtualisation dans le
BIOS/UEFI et les droits de l'utilisateur selon la distribution si le controle
suivant echoue :

```bash
"$ANDROID_HOME/emulator/emulator" -accel-check
"$ANDROID_HOME/emulator/emulator" -list-avds
```

Attendu : acceleration utilisable et nom de l'AVD cree dans la liste. Une liste
vide demande de creer l'AVD avec le meme utilisateur et la meme configuration
Android, pas de reinstaller l'application.

### Installer les dependances mobiles dans Docker

Depuis la racine du workspace, avec l'utilisateur habituel UID 1000 :

```bash
cd "$PATH_TO_APP"
docker compose -f docker-compose.agent.yml up -d agent-frontend-node
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'id -u && node --version'
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend/mobile && npm ci'
```

Attendu : UID `1000`, Node `v22...`, installation depuis `package-lock.json`.
Les dependances mobiles sont dans `mobile/node_modules`, sur le montage du
workspace ; elles sont donc aussi visibles par Metro. En cas de refus Docker,
faire configurer l'acces au daemon pour l'utilisateur. En cas de fichiers
appartenant a root, identifier les chemins et faire corriger leurs permissions ;
ne pas relancer l'installation en root.

### Generer le projet Android absent d'un clone neuf

`mobile/android` est ignore par Git. Si `android/gradlew` est absent, generer
le projet natif avec Expo installe par le lockfile :

```bash
cd "$PATH_TO_APP"
git -C my-happy-wallet-frontend status --short
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend/mobile && npx --no-install expo prebuild --platform android --no-clean --no-install --skip-dependency-update react-native,react'
test -f my-happy-wallet-frontend/mobile/android/gradlew && echo "Wrapper Android genere"
git -C my-happy-wallet-frontend diff -- mobile/package.json mobile/package-lock.json
```

Expo peut modifier les scripts du manifeste meme avec `--no-install`. Examiner
le diff et conserver seulement les changements intentionnels ; ne pas ecraser
un manifeste qui contenait deja du travail local. La CLI installee avec Expo
SDK 57 nettoie par defaut les dossiers natifs ; `--no-clean` evite cette
suppression, mais les plugins peuvent toujours modifier les fichiers existants.
Sauvegarder toute modification native locale avant une regeneration volontaire.
La page Expo CNG decrit encore l'ancien comportement : pour les options exactes,
verifier la CLI du lockfile dans Docker avec `expo prebuild --help`. Le controle
du 14 septembre 2026 confirme `clean: !args['--no-clean']` dans la CLI installee.

### Prerequis du build natif existant

La commande Gradle de l'etape 4 est celle du parcours **humain sur le poste** :
elle exige un JDK 17 ou compatible avec le wrapper genere, le SDK et Node 22
accessible au processus Gradle. Les scripts Gradle React Native invoquent Node,
meme sans commande npm explicite. Configurer `JAVA_HOME` vers le JDK choisi et
utiliser le meme JDK dans Android Studio et dans le terminal ; verifier
`java -version` avant la compilation. Android Gradle Plugin 8.x exige au
minimum JDK 17 ; verifier aussi la compatibilite du wrapper si sa version change.

Le service `agent-frontend-node` actuel contient Node mais pas la chaine
Android/JDK complete. Un agent soumis a la regle Node exclusivement dans Docker
ne doit donc pas executer Gradle sur l'hote, ni le lanceur qui peut installer
l'APK automatiquement. La conteneurisation du build natif demande un travail
explicite de configuration ; M01-01 documente le parcours existant sans modifier
l'infrastructure. Le build local de debug ne requiert ni publication Google
Play ni declenchement EAS.

## Lancement automatise recommande

Depuis la racine du depot frontend, verifier d'abord le poste sans demarrer la
stack ni modifier l'emulateur :

```bash
./mobile/scripts/diagnose-android-host.sh
```

Le diagnostic controle Linux, les variables et outils Android, Java 17,
Docker Compose, l'acces au daemon, KVM, les AVD et les appareils ADB. Les
prerequis manquants sont des echecs avec un code de sortie `1`; les composants
optionnels absents sont des avertissements. Pour preparer un lancement
immediat, exiger aussi un appareil en ligne avec le development build installe :

```bash
./mobile/scripts/diagnose-android-host.sh --require-device
```

Apres la premiere installation ci-dessus, le script versionne regroupe les
commandes des sections suivantes pour le lancement humain. Il appelle Gradle
sur le poste si l'APK manque, meme sans `--install` :

```bash
cd "$PATH_TO_APP"
./my-happy-wallet-frontend/mobile/scripts/start-android-dev.sh
```

Il reutilise par defaut l'emulateur et le development build deja installes,
demarre la stack Docker, applique les migrations, configure les ports ADB,
lance Metro dans Docker puis ouvre l'application. Garder le terminal ouvert et
utiliser `Ctrl+C` pour arreter uniquement Metro.

Metro est defini dans `mobile/compose.dev-client.yml`. Le lanceur recree ce
service, attend la reponse exacte `packager-status:running`, ouvre le
development build puis suit ses journaux. A l'arret, il supprime uniquement ce
conteneur Compose ; les donnees applicatives de l'emulateur et la session
restent intactes.

Pour consulter les journaux Metro depuis un autre terminal :

```bash
docker compose -f my-happy-wallet-frontend/mobile/compose.dev-client.yml \
  logs --follow metro
```

Si aucun emulateur n'est actif, le demarrer dans Android Studio ou fournir le
nom exact d'un AVD existant :

```bash
./my-happy-wallet-frontend/mobile/scripts/start-android-dev.sh \
  --avd Pixel_5_API_35_Light
```

Les operations lentes restent explicites :

```bash
# Reconstruire la stack Docker
./my-happy-wallet-frontend/mobile/scripts/start-android-dev.sh --build-stack

# Recompiler et reinstaller aussi l'APK natif
./my-happy-wallet-frontend/mobile/scripts/start-android-dev.sh --install

# Tout reconstruire
./my-happy-wallet-frontend/mobile/scripts/start-android-dev.sh \
  --build-stack --install
```

Afficher toutes les options sans rien demarrer :

```bash
./my-happy-wallet-frontend/mobile/scripts/start-android-dev.sh --help
```

## Ce qui doit tourner

Le parcours local relie quatre elements :

1. l'emulateur Android ;
2. le development build `com.andriacapai.myhappywallet` ;
3. Metro sur le port `8081` ;
4. le backend My Happy Wallet sur le port `4200`.

`adb reverse` rend les deux ports de l'ordinateur accessibles dans
l'emulateur sous l'adresse `127.0.0.1`. Il n'est donc pas necessaire de chercher
l'adresse IP du PC pour un emulateur Android local.

## Choisir l'origine API Android

Le lanceur utilise par defaut `http://127.0.0.1:4200`. Cette origine fonctionne
sur un emulateur et sur un appareil Android relie a ADB, car le script configure
`adb reverse tcp:4200 tcp:4200` avant d'ouvrir l'application.

Pour tester un appareil reel par le reseau local, fournir une origine que le
telephone peut joindre :

```bash
./my-happy-wallet-frontend/mobile/scripts/start-android-dev.sh \
  --api-origin http://192.168.1.42:4200
```

Remplacer l'adresse d'exemple par l'adresse IPv4 du poste sur le meme reseau
que le telephone. Le port `4200` doit etre accessible depuis ce reseau. Utiliser
un reseau de confiance et refermer toute regle de pare-feu temporaire apres le
test.

`--api-origin` attend uniquement une origine HTTP ou HTTPS : ne pas ajouter
`/v1`, d'identifiants, de query ou de fragment. Le lanceur transmet cette valeur
a Metro via `EXPO_PUBLIC_API_ORIGIN`; l'application ajoute elle-meme `/v1` pour
les routes metier et utilise l'origine nue pour `/health/ready`. Cette variable
est publique et ne doit jamais contenir de secret.

## 1. Verifier ADB

Choisir le chemin releve dans Android Studio. Exemple pour l'installation
XDG utilisee historiquement par le projet, avec repli si `XDG_CONFIG_HOME`
n'est pas defini :

```bash
export ANDROID_HOME="${XDG_CONFIG_HOME:-$HOME/.config}/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
hash -r
command -v adb
adb version
```

Si Android Studio utilise un autre dossier, remplacer `ANDROID_HOME` par son
chemin exact. `Installed as` doit pointer vers ce SDK, et non vers un ancien
ADB systeme. Le lanceur donne priorite a `ANDROID_SDK_ROOT`, puis
`ANDROID_HOME`, puis au chemin XDG : garder les deux variables identiques.
Aucun chargement d'un fichier Zsh personnel n'est necessaire pour ce guide.

## 2. Demarrer l'emulateur

Dans Android Studio, ouvrir **Device Manager**, puis demarrer
`Pixel_5_API_35_Light`. Verifier ensuite :

```bash
adb wait-for-device
adb devices -l
```

Le statut attendu est `device` :

```text
emulator-5554  device  product:sdk_gphone16k_x86_64 ...
```

Si le statut est `offline` ou si la liste est vide :

```bash
adb kill-server
adb start-server
adb wait-for-device
adb devices -l
```

Si `wait-for-device` reste bloque, redemarrer l'appareil virtuel depuis Device
Manager. Utiliser **Cold Boot** seulement si un redemarrage normal ne suffit
pas. **Wipe Data** efface les applications et sessions de l'emulateur : ne pas
l'utiliser pour un simple probleme ADB.

## 3. Demarrer la stack locale

Depuis la racine du workspace :

```bash
cd "$PATH_TO_APP"
docker compose -f docker-compose.dev.yml up -d --build
docker compose -f docker-compose.dev.yml ps
```

Les services `mysql`, `mailpit`, `backend` et `frontend` doivent etre demarres,
et le backend doit devenir `healthy`.

Appliquer ensuite les migrations Prisma qui n'ont pas encore ete executees dans
le volume MySQL local :

```bash
docker compose -f docker-compose.dev.yml exec backend npm run db:deploy
```

Cette commande met le schema a jour sans supprimer les donnees locales. Elle
est notamment necessaire si l'inscription retourne `Bad Request` alors que les
champs sont valides et que la table `OperationCategoryTemplate` manque. Ne pas
la remplacer par `down -v`, qui effacerait toute la base locale.

Adresses utiles :

- application Web : http://localhost:5173
- API : http://localhost:4200/v1/
- emails locaux : http://localhost:8025

Si aucun compte local n'existe, le creer depuis l'application Web puis ouvrir
Mailpit pour cliquer sur le lien de confirmation. Aucun email reel n'est
envoye.

Utiliser directement http://localhost:5173/register pour creer le compte. La
page **Mot de passe oublie** ne cree pas d'utilisateur : pour des raisons de
securite, elle affiche la meme confirmation meme lorsque l'adresse demandee
n'existe pas. Dans ce cas, aucun message n'apparait dans Mailpit. Le lien de
confirmation d'une nouvelle inscription expire apres cinq minutes ; refaire
l'inscription s'il a expire.

Le mot de passe d'inscription doit contenir au moins huit caracteres, dont une
minuscule, une majuscule, un chiffre et un caractere special parmi
`! @ # $ % ^ & * ( ) + = . _ -`. Les deux champs de mot de passe doivent etre
identiques. Le formulaire Web affiche actuellement seulement `Bad Request` si
une de ces regles backend n'est pas respectee.

## 4. Installer le development build

Cette etape est necessaire lors de la premiere installation, apres un
changement de dependance native, apres une modification de `app.json` ou apres
une mise a niveau Expo. Elle peut prendre plusieurs minutes au premier passage.

Cette commande est reservee au parcours humain avec les prerequis natifs
ci-dessus. Verifier le JDK, le wrapper et l'architecture de l'appareil :

```bash
java -version
test -x "$PATH_TO_APP/my-happy-wallet-frontend/mobile/android/gradlew"
adb shell getprop ro.product.cpu.abi
```

Attendu pour ce guide : wrapper executable et `x86_64`. Avec plusieurs
appareils, fermer les autres emulateurs/debrancher les appareils supplementaires
avant d'utiliser le lanceur, qui ne propose pas de selection par numero de serie.
Puis compiler seulement cette architecture et installer l'APK :

```bash
cd "$PATH_TO_APP/my-happy-wallet-frontend/mobile/android"
./gradlew :app:installDebug -PreactNativeArchitectures=x86_64
```

Le resultat attendu se termine par :

```text
Installed on 1 device.
BUILD SUCCESSFUL
```

Verifier aussi `adb shell pm path com.andriacapai.myhappywallet` : la sortie
doit commencer par `package:`. L'APK de debug se trouve normalement dans
`mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Conserver une copie
de l'APK precedent avant une reconstruction si un retour arriere est souhaite.

Pour une simple modification TypeScript, JavaScript ou de styles, il n'est pas
necessaire de reconstruire l'APK : relancer Metro suffit.

## 5. Demarrer Metro

Dans un terminal dedie, depuis la racine du workspace :

```bash
cd "$PATH_TO_APP"
docker run --rm -it \
  --network host \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -e npm_config_cache=/tmp/npm-cache \
  -e EXPO_UNSTABLE_HEADLESS=1 \
  -e EXPO_PUBLIC_API_ORIGIN=http://127.0.0.1:4200 \
  -v "$PATH_TO_APP/my-happy-wallet-frontend/mobile:/app" \
  -w /app \
  node:22-bookworm \
  bash -lc 'npm run start:dev-client -- --localhost --port 8081'
```

Garder ce terminal ouvert. La ligne attendue est :

```text
Waiting on http://localhost:8081
```

Si `node_modules` n'existe pas encore, executer une fois `npm ci` avec le
service Docker agent documente dans le README mobile avant de lancer Metro.

## 6. Relier et ouvrir l'application

Dans un second terminal :

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:4200 tcp:4200
adb reverse --list
```

Ouvrir ensuite **My Happy Wallet** dans l'emulateur. Si le launcher affiche un
champ d'URL, saisir :

```text
http://127.0.0.1:8081
```

Il est aussi possible d'ouvrir directement le projet :

```bash
adb shell am start \
  -a android.intent.action.VIEW \
  -d 'myhappywallet://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081' \
  com.andriacapai.myhappywallet
```

Attendre la fin du bundling. Si l'ecran **Service indisponible** etait deja
affiche avant le demarrage du backend, appuyer une fois sur **Reessayer**.

## 7. Controle fonctionnel

Avec une session valide, la barre inferieure doit proposer :

- Accueil ;
- Calendrier ;
- Objectifs ;
- Operations ;
- Profil.

Verifier que chaque onglet est ouvrable, que le bouton Retour Android suit
l'historique des onglets et que la deconnexion du profil renvoie vers la
connexion. Sans session, les onglets proteges ne doivent pas apparaitre.

### Parcours d'authentification

Depuis la connexion, verifier aussi les parcours publics suivants :

1. ouvrir **Creer un compte**, faire defiler les cinq champs et soumettre un
   formulaire vide pour controler le message accessible ;
2. creer un compte avec une adresse locale, puis ouvrir Mailpit sur
   `http://localhost:8025` et suivre son lien de confirmation ;
3. revenir a la connexion, ouvrir **Reinitialiser**, envoyer une adresse et
   verifier la confirmation generique qui ne revele pas si le compte existe ;
4. couper temporairement le reverse API avec
   `adb reverse --remove tcp:4200`, soumettre une demande et verifier l'erreur
   reseau, puis retablir le tunnel avec `adb reverse tcp:4200 tcp:4200` ;
5. se connecter, redemarrer l'application et verifier la restauration de la
   session avant de tester la deconnexion.

Utiliser uniquement des comptes de test locaux. Aucun mot de passe, token ou
lien de confirmation ne doit etre copie dans Git.

### Tableau de bord mobile

Avec une session de test verifiee, controler successivement :

1. sans charge ni revenu fixe, l'accueil affiche l'etat initial et permet
   d'ouvrir la gestion du budget fixe mobile ;
2. apres ajout d'au moins un revenu et une charge fixes, le reste a vivre
   mensuel correspond a `total des revenus - total des charges` et les deux
   totaux affiches correspondent aux donnees du compte ;
3. la page se fait defiler sans masquer les cartes **Operations** et
   **Objectifs**, et chaque carte ouvre l'onglet attendu ;
4. le titre, le montant et les actions ne passent ni sous la barre d'etat ni
   sous la navigation inferieure ;
5. apres `adb reverse --remove tcp:4200` et un redemarrage de l'application,
   la restauration de session affiche un etat d'erreur accessible ; retablir
   `adb reverse tcp:4200 tcp:4200`, puis appuyer sur **Reessayer** et verifier
   que le tableau de bord reapparait sans nouvelle connexion.

Les projections semaine/jour, graphiques et objectifs alimentes sont traites
par les Work Items M05 et ne doivent pas etre simules avec des donnees locales.

## Diagnostic rapide

### SDK, Java ou wrapper introuvable

- `gradlew` absent : suivre la generation Expo, le dossier natif n'est pas clone.
- `SDK location not found` : verifier `ANDROID_HOME` et Android SDK Location.
  Un ancien `android/local.properties` peut contenir un autre `sdk.dir` ; le
  corriger localement sans versionner ce chemin personnel.
- Erreur Java/Gradle : comparer `java -version`, `JAVA_HOME` et le Gradle JDK
  d'Android Studio ; utiliser un JDK compatible avec le wrapper genere.
- Licence ou composant SDK absent : ouvrir SDK Manager, installer la version
  demandee et accepter sa licence apres lecture. Ne pas changer le lockfile
  npm pour masquer un composant SDK manquant.
- `Cannot run program "node"` dans Gradle : Node manque dans l'environnement
  du build humain. Le Node du conteneur n'est pas visible depuis Gradle sur
  l'hote ; ne pas conclure que l'installation npm a echoue.

### Plusieurs appareils ou appareil non autorise

`adb devices -l` doit montrer un unique appareil `device` pour le lanceur.
`unauthorized` demande d'accepter l'autorisation USB sur l'appareil concerne.
Pour les commandes manuelles, `adb -s NUMERO ...` permet de choisir une cible ;
le lanceur actuel ne propage pas cette option. Les details appareil physique
et origines API sont reserves a M01-03.

### `adb: no devices/emulators found`

Relancer ADB, puis l'emulateur si necessaire :

```bash
adb kill-server
adb start-server
adb devices -l
```

### `emulator-5554 offline`

Verifier d'abord que `adb version` pointe vers le SDK XDG. Fermer les anciens
serveurs ADB, redemarrer l'emulateur et refaire `adb devices -l`.

### `Service indisponible`

Verifier les trois points suivants :

```bash
docker compose -f "$PATH_TO_APP/docker-compose.dev.yml" ps
adb reverse --list
adb devices -l
```

Le backend doit etre actif, et les ports `8081` et `4200` doivent etre inverses.
Relancer ensuite Metro avec `EXPO_PUBLIC_API_ORIGIN=http://127.0.0.1:4200`, puis
appuyer sur **Reessayer**.

### `Port 8081 is being used by another process`

Un serveur Metro est peut-etre deja actif. Ne pas accepter automatiquement le
port `8082`, car le development build et la commande `adb reverse` utilisent
`8081` dans ce guide.

Identifier d'abord le processus et les conteneurs actifs :

```bash
ss -ltnp 'sport = :8081'
docker ps --format '{{.ID}} {{.Names}} {{.Image}} {{.Command}}'
```

Si le conteneur correspond au Metro My Happy Wallet lance avec
`npm run start:dev-client`, le reutiliser et passer directement a l'etape 6.
Il est deja pret lorsque son terminal affiche
`Waiting on http://localhost:8081`.

Si son origine API est inconnue ou incorrecte, relever son nom exact, verifier
qu'il s'agit bien d'un conteneur temporaire My Happy Wallet, puis l'arreter avec
`docker stop NOM_EXACT`. Relancer ensuite la commande de l'etape 5. Ne jamais
arreter un conteneur uniquement parce qu'il utilise l'image `node:22-bookworm` :
d'autres services de developpement utilisent cette image.

### Repartir sans session locale

Cette commande efface toutes les donnees locales de My Happy Wallet dans
l'emulateur, notamment le refresh token SecureStore :

```bash
adb shell pm clear com.andriacapai.myhappywallet
```

Ne l'utiliser que si la suppression de la session locale est volontaire. Elle
ne supprime pas le compte stocke dans la base locale.

## Arret

Faire `Ctrl+C` dans le terminal Metro. Pour arreter la stack tout en conservant
la base locale :

```bash
cd "$PATH_TO_APP"
docker compose -f docker-compose.dev.yml down
```

Ne pas ajouter `-v` sauf si la suppression complete de la base locale et des
emails Mailpit est volontaire.

## Retour arriere et preuve de reprise

Pour revenir a un APK de debug conserve, avec la meme signature et une version
compatible, utiliser `adb install -r /chemin/vers/app-debug-precedent.apk`, puis
verifier la presence du package et relancer Metro sur le code correspondant.
Si Android refuse la version ou la signature, conserver le message et analyser
la compatibilite ; ne pas desinstaller automatiquement au risque de perdre la
session locale. Un changement TypeScript seul ne demande pas de reinstaller
l'APK. Arreter l'AVD depuis Device Manager conserve ses donnees.

Une reprise sans contexte doit pouvoir suivre dans l'ordre : SDK/AVD, variables
Android, dependances Docker, prebuild si necessaire, stack et migrations,
installation native humaine, Metro, tunnels, ouverture et controle fonctionnel.
Consigner le commit, les versions JDK/ADB, l'AVD et son ABI, `BUILD SUCCESSFUL`,
la presence du package et les controles realises. Ne pas assimiler la relecture
du guide a une nouvelle compilation ou a une recette native reussie.

Ce guide contribue a `OPS-09` et `PLAT-04` de la
[matrice de tracabilite](../../docs/requirements-traceability.md), sans modifier
leur statut de couverture. Il applique le choix Expo/development client et
conserve la [strategie CI/CD](ci-cd.md). M01-02 traite la fiabilisation du
lanceur/Metro, M01-03 les origines API, M01-04 la recette auth, M01-05 les liens
email et M01-06 le diagnostic automatise. La publication stores reste en M10.

## References officielles

Documentation consultee le 14 septembre 2026 ; versions du projet a verifier
avec le lockfile, pas avec les seules versions les plus recentes des guides.

- [SDK Manager](https://developer.android.com/studio/intro/update#sdk-manager)
- [Creation des AVD](https://developer.android.com/studio/run/managing-avds)
- [Acceleration Linux/KVM](https://developer.android.com/studio/run/emulator-acceleration)
- [JDK et Gradle](https://developer.android.com/build/jdks)
- [Generation native Expo](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Build local Expo](https://docs.expo.dev/guides/local-app-development/)
- Android Debug Bridge : https://developer.android.com/tools/adb
- Development builds Expo :
  https://docs.expo.dev/develop/development-builds/introduction/
- Utiliser un development build :
  https://docs.expo.dev/develop/development-builds/use-development-builds/
