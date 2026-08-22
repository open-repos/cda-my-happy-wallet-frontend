# Development build Android en local

Ce guide permet de lancer seule l'application mobile My Happy Wallet sur
l'emulateur Android. Il utilise le backend local Docker, un development build
installe dans l'emulateur et Metro pour servir le code TypeScript.

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

## Ce qui doit tourner

Le parcours local relie quatre elements :

1. l'emulateur Android ;
2. le development build `com.andriacapai.myhappywallet` ;
3. Metro sur le port `8081` ;
4. le backend My Happy Wallet sur le port `4200`.

`adb reverse` rend les deux ports de l'ordinateur accessibles dans
l'emulateur sous l'adresse `127.0.0.1`. Il n'est donc pas necessaire de chercher
l'adresse IP du PC pour un emulateur Android local.

## 1. Verifier ADB

Le projet utilise le SDK installe dans le repertoire XDG. Apres avoir recharge
la configuration Zsh, verifier que ce binaire est prioritaire :

```bash
source "$XDG_CONFIG_HOME/zsh/.zshrc"
hash -r
which -a adb
adb version
```

Le resultat attendu contient :

```text
Installed as ~/.config/android-sdk/platform-tools/adb
```

Si necessaire, appliquer cette configuration pour le terminal courant :

```bash
export ANDROID_HOME="$XDG_CONFIG_HOME/android-sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
hash -r
```

Ne pas utiliser `/usr/bin/adb` : la version systeme 28 est trop ancienne pour
l'emulateur actuel.

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

Verifier d'abord qu'une version recente de Node est active dans le terminal :

```bash
node --version
```

Puis compiler seulement l'architecture de l'emulateur et installer l'APK :

```bash
cd "$PATH_TO_APP/my-happy-wallet-frontend/mobile/android"
./gradlew :app:installDebug -PreactNativeArchitectures=x86_64
```

Le resultat attendu se termine par :

```text
Installed on 1 device.
BUILD SUCCESSFUL
```

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

## Diagnostic rapide

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

## References officielles

- Android Debug Bridge : https://developer.android.com/tools/adb
- Development builds Expo :
  https://docs.expo.dev/develop/development-builds/introduction/
- Utiliser un development build :
  https://docs.expo.dev/develop/development-builds/use-development-builds/
