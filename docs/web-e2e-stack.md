# Parcours E2E Web avec stack isolée — #60

## Ce qui est exécuté

`npm run test:e2e:stack` construit et lance une stack Docker Compose jetable :

- le backend réel du dépôt `open-repos/cda-my-happy-wallet-backend`, fixé au
  commit `c1f4d2897db173b0de9db95175bfc253f4f82eed` dans `compose.e2e.yml` ;
- MySQL 8.0, avec une base `mhw_e2e` exclusivement en mémoire et un utilisateur
  limité à cette base, ainsi que Redis 8.2.1 ;
- le build Web Vite et Chromium de la version Playwright du lockfile, exécutés
  par l'utilisateur `node` dans le conteneur de test.

Aucun dépôt backend voisin n'est nécessaire ou modifié. Les migrations du commit
fixé sont appliquées dans cette base neuve. Le seed de production du backend
n'est jamais appelé : `test/full-stack/seed.cjs` crée uniquement douze comptes
`@example.com`, leurs catégories et deux opérations fixes donnant une base
mensuelle de 1 200 EUR. Chaque couple parcours/viewport dispose de son compte.
Le bootstrap exécute le seed deux fois pour vérifier sa répétabilité.
L'URL shadow pointe vers le nom distinct `mhw_e2e_shadow`, comme l'exige Prisma ;
`migrate deploy` ne crée ni n'utilise cette base shadow.

Les vues visées viennent de la synthèse versionnée des
[références UX](ux-design-references.md), notamment les transitions vide/alimenté,
liste/formulaire, prévision/réalisation et connexion/déconnexion. Cette recette
utilise les contrats implémentés ; elle ne transforme pas Figma en règle métier.

## Parcours et preuves

Chaque parcours tourne aux formats téléphone tactile, tablette et ordinateur,
soit douze tests dans `test/full-stack/journeys/wallet.spec.js` :

| Parcours    | États et effets vérifiés                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Opérations  | Redirection anonyme, connexion réelle, liste vide, validation du formulaire, création/modification/suppression, persistance après rechargement et budget passant de 1 200 à 1 157,50 puis 1 150 et 1 200 EUR |
| Événements  | Création d'un événement de 120 EUR, prévision à 1 080 EUR avec réel à 1 200 EUR, conversion en opération, disparition de la décision à traiter, réel/prévision à 1 080 EUR et une seule opération persistée  |
| Reprise     | Mauvais mot de passe refusé par l'API, connexion valide, lecture interrompue au niveau transport, message récupérable, bouton Réessayer puis réponse réelle                                                  |
| Session Web | Cookie HttpOnly réel, renouvellement via `/v1/token`, rotation du cookie, contenu privé de nouveau disponible, déconnexion locale et redirection anonyme                                                     |

Les lectures et écritures nominales atteignent la vraie API et MySQL, sans
`route.fulfill`, faux JWT ou injection de session dans localStorage. Le seul
échec simulé est une interruption réseau contrôlée d'une lecture d'opérations.
Le test de session avance seulement l'horloge du navigateur au-delà de
l'expiration du premier access token ; l'API garde son horloge réelle et émet
le token renouvelé de cinq minutes. Ce test vérifie le mécanisme client de
renouvellement, pas l'expiration réelle côté serveur.

Le logout Web actuel supprime la session locale : ce test ne revendique pas de
révocation serveur du cookie. Les tests natifs Android/iOS, l'installation PWA,
la délivrabilité email, la conformité visuelle et l'audit d'accessibilité restent
des validations distinctes. Cette stack ne contacte aucun SMTP réel.

## Isolation et confidentialité

- Aucun port n'est publié sur l'hôte, aucune socket Docker n'entre dans les
  conteneurs et aucun volume de données de développement n'est monté.
- Le réseau Compose est `internal`. Le navigateur refuse aussi toute origine
  autre que son serveur local ; API, Google Fonts et services distants ne sont
  pas utilisés comme solutions de secours.
- Le proxy same-origin `/v1` et l'URL relative de l'API existent seulement dans
  `test/full-stack/vite.config.mjs`. Les configurations et artefacts de
  production ne sont pas remplacés.
- Les mots de passe et trois secrets JWT distincts sont aléatoires à chaque
  lancement. Ils restent dans l'environnement éphémère, sont expurgés des sorties du runner et masqués dans
  GitHub Actions et ne sont jamais écrits dans un fichier de configuration.
- Le garde-fou du seed exige `NODE_ENV=test`, `MHW_E2E=1`, un mot de passe
  généré et l'hôte, le port, l'utilisateur et le nom de base exacts de Compose.
  Il s'exécute avant les migrations et avant les fixtures. Aucun paramètre
  ne permet de viser une base existante.
- Le Dockerignore propre au Dockerfile de test exclut les `.env*`, les clones
  Git, caches et dépendances locales. Le backend vient d'un contexte Git fixé.
- Traces, vidéos et captures Playwright sont désactivées. Aucun état navigateur,
  cookie ou rapport brut n'est publié comme artefact ; les journaux indiquent
  les étapes et résultats des assertions sans afficher les réponses d'auth.

Les accès réseau pendant la construction servent seulement à récupérer les
sources fixées, images, paquets du lockfile et navigateur. L'isolement réseau
concerne l'exécution, après cette préparation.

## Exécution locale et CI GitHub

Prérequis : Git, Docker Engine avec Compose V2/BuildKit, Node 22 et accès aux
registres d'images, npm, GitHub et aux téléchargements Playwright. Prévoir de la
mémoire pour MySQL et Chromium ; la base est jetable et reste en RAM.

Depuis le dépôt frontend autonome :

```bash
npm ci
npm run test:e2e:runner
npm run test:e2e:stack
```

Ne pas lancer directement `docker compose up` : le script prépare des secrets
neufs et un nom de projet unique `mhw-e2e-<suffixe>`, puis construit, attend la
readiness réelle de l'API et lance le navigateur. Le script propage le code de
sortie des tests. Résultat attendu : douze tests réussis et code `0`.

Le contrôle GitHub existant
[`Web format, lint, test and build`](../.github/workflows/web-quality.yml)
exécute ce parcours après les contrôles Web et les neuf tests du runner. Aucun
secret de dépôt, déploiement, accès VPS ou paramétrage GitLab n'est requis.
Le timeout de ce job est de 25 minutes pour inclure la construction des images.

Sans Docker dans le checkout cloud, exécuter les contrôles Web habituels,
`npm run test:e2e:runner`, le build avec la configuration E2E et la découverte :

```bash
npx vite build --config test/full-stack/vite.config.mjs
MHW_E2E=1 E2E_PASSWORD=discovery-only npx playwright test --config playwright.full-stack.config.js --list
```

La découverte seule ne prouve pas les douze parcours ; leur validation complète
est fournie par la CI Docker. L'ancienne commande `npm run test:e2e` garde les
parcours publics et les contrôles responsive avec API simulée de `test/e2e/`.
Le ticket #61 reste distinct pour l'intégration optionnelle dans GitLab CI.

## Nettoyage, interruption et retour arrière

Le runner exécute `down --volumes --remove-orphans` dans son bloc `finally`,
même si le build, la readiness ou un parcours échoue, puis répète le nettoyage.
Les tests `test/e2eStack.test.mjs` vérifient les erreurs de chaque étape, les
exceptions, l'interruption et le refus de considérer un nettoyage raté comme
une réussite. SIGINT/SIGTERM interrompent la commande active et déclenchent ce
nettoyage. SIGKILL ou la destruction du runner ne permettent pas de garantir
l'exécution d'un bloc `finally`.

Le workflow possède aussi un nettoyage `always()` limité aux conteneurs et au
réseau portant le label du projet exact créé par ce job. Il n'utilise aucune
commande globale de prune. Après interruption locale brutale, récupérer le nom
public affiché au démarrage, puis ne supprimer que les conteneurs de ce projet :

```bash
# Remplacer la valeur par le nom exact affiché, jamais celui d'un autre projet.
project=mhw-e2e-0123456789ab
docker ps --all --filter "label=com.docker.compose.project=$project"
docker network ls --filter "label=com.docker.compose.project=$project"
```

Après vérification, `docker rm --force <IDs>` et `docker network rm <ID>`
retirent uniquement ces ressources. Il n'y a aucun volume de données persistant
à restaurer. Ne pas afficher l'environnement des conteneurs pour diagnostiquer.

| Symptôme                             | Diagnostic                                                                                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker/Compose absent                | Installer les prérequis ou utiliser le résultat du job GitHub ; ne pas substituer une API distante                                                       |
| Échec de build                       | Vérifier les accès aux registres et au commit backend fixé ; conserver ce pin pour la reproductibilité                                                   |
| Readiness non atteinte               | Vérifier les statuts des conteneurs du projet ; le bootstrap ou une migration peut avoir échoué. Ne pas rediriger DATABASE_URL vers une autre base       |
| Échec Playwright                     | Lire l'assertion et le viewport dans le journal du job, reproduire la stack fraîche ; ne pas augmenter les retries ou approuver des références visuelles |
| Régression après mise à jour backend | Examiner le contrat du nouveau commit, mettre à jour le pin et relancer toute la recette dans une PR dédiée                                              |

Pour revenir à la validation précédente du dépôt, révoquer le commit de #60.
Cette modification ne déploie rien et ne change aucune donnée existante.
