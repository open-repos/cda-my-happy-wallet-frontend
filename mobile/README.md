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
  bash -lc 'cd my-happy-wallet-frontend/mobile && npm run format && npm run lint && npm run type-check && npm test && npm run build:web'
```

Le serveur Expo peut ensuite etre demarre avec `npm start`. Le spike utilise
Expo SDK 57. Pendant sa phase de transition, privilegier un development build
pour les essais sur appareil physique.

Documentation officielle : https://docs.expo.dev/

Strategie de build et de publication : [`docs/ci-cd.md`](docs/ci-cd.md).
