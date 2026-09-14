# My Happy Wallet Mobile

Application mobile Expo/React Native distincte du frontend Web.

## Configuration

Copier les noms publics documentes dans `.env.example` vers un fichier local
non versionne. Les variables `EXPO_PUBLIC_*` ne doivent jamais contenir de
secret.

## Commandes

Toutes les commandes sont executees dans le service Docker frontend depuis la
racine du workspace :

```bash
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend/mobile && npm ci'

docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend/mobile && npm run format && npm run lint && npm run type-check && npm test && npm run doctor && npm run build:web'
```

Le serveur Expo peut ensuite etre demarre avec `npm start`. Le spike utilise
Expo SDK 57. Pendant sa phase de transition, privilegier un development build
pour les essais sur appareil physique.

Le guide Android local couvre la premiere installation SDK/AVD, les dependances
Docker, la generation du dossier Android absent d'un clone neuf, les prerequis
du build natif humain, ADB, Metro, le backend et les retours arriere :
[`docs/android-development-build.md`](docs/android-development-build.md).

## Development Build Sur iPhone

Expo Go sur iPhone ne permet pas de choisir une version compatible avec chaque
SDK. Le profil EAS `development` produit donc une application My Happy Wallet
installable sur un appareil physique. Un abonnement Apple Developer actif est
necessaire pour la signature cloud iOS.

Depuis la racine du workspace, se connecter a Expo puis enregistrer l'iPhone :

```bash
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend/mobile && npx eas-cli@latest login'

docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend/mobile && npx eas-cli@latest device:create'
```

Ouvrir sur l'iPhone le lien affiche par `device:create`, puis lancer le build :

```bash
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend/mobile && npx eas-cli@latest build --platform ios --profile development'
```

Installer le build depuis le lien EAS. Pour charger ensuite le code local,
demarrer Metro en mode development client avec une origine API joignable depuis
l'iPhone :

```bash
docker run --rm -it \
  --network host \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -e npm_config_cache=/tmp/npm-cache \
  -e EXPO_UNSTABLE_HEADLESS=1 \
  -e EXPO_PUBLIC_API_ORIGIN=http://ADRESSE_IP_DU_PC:4200 \
  -v "$PWD/my-happy-wallet-frontend/mobile:/app" \
  -w /app \
  node:22-bookworm \
  bash -lc 'npm ci && npm run start:dev-client -- --lan --port 8081'
```

Scanner le QR avec l'appareil photo iOS. Le lien ouvre l'application My Happy
Wallet installee, et non Expo Go.

## Stockage De Session

Le port `SessionVault` isole le refresh token du reste de l'application.
L'adapter natif utilise `expo-secure-store` avec une cle dediee a l'appareil ;
l'access token et le profil utilisateur ne sont pas persistants dans ce coffre.

Documentation officielle : https://docs.expo.dev/

Strategie de build et de publication : [`docs/ci-cd.md`](docs/ci-cd.md).
