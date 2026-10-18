# Service worker public versionné — #49

Le build produit désormais `dist/sw.js` et `dist/pwa-build.json` après le build
Vite habituel. Le worker est autonome, à URL stable, sans import réseau, sans
source map ni dépendance supplémentaire. **Il n’est pas enregistré par défaut par
l’application** : les validations de confidentialité #50/backend #98 et la recette
intégrée précèdent l’activation du client optionnel de
[#53](pwa-updates.md). Les fichiers d’installation de
#52 restent indépendants.

## Construire et identifier une version

```bash
npm ci
npm run build
```

Le script `scripts/build-pwa-worker.mjs` construit une liste explicite des fichiers
hachés de `dist/assets` acceptés par `createCachePolicy`. Les JSON, source maps,
fichiers inconnus et documents de navigation ne sont pas ajoutés au précache.
`offline.html` n’est ajouté que lorsqu’un fichier statique régulier existe ; son
contenu neutre est le périmètre de #51. Aucun état de session ni réponse HTTP de
l’API ne participe au build.

Le script refuse les liens symboliques des assets, du document hors ligne et des
fichiers de sortie. Il refuse aussi un répertoire sans JavaScript public et un
identifiant de version précédente invalide, sans en afficher la valeur.

L’identifiant public contient seize caractères hexadécimaux. Il dépend des
chemins et octets des assets retenus, du code de la politique et du worker, du
générateur, du verrou de dépendances et de la version précédente déclarée. Deux
constructions identiques donnent les mêmes identifiant et worker. Une modification
d’asset, de logique ou de configuration produit une nouvelle version.

`pwa-build.json` expose seulement cet identifiant, le précédent et la liste des
ressources publiques. Ce document n’est pas précaché. Conserver les métadonnées
de la version livrée pour préparer le prochain build et son rollback.

Si la version précédente est connue, après le build principal :

```bash
# Exemple public : remplacer par le véritable identifiant du build livré.
npm run pwa:build -- --previous-build=0123456789abcdef
```

Cette commande régénère le worker et ses métadonnées sans effacer les assets.
Elle n’accepte aucune URL, chemin ou donnée de session en argument. L’identifiant
précédent est une métadonnée publique, pas un secret. Aucun credential ou nouvelle
variable d’environnement n’est requis.

**Si le précédent n’est pas connu, omettre l’option.** Le worker conserve alors les
anciens caches publics au lieu de deviner lequel supprimer. Ce choix peut augmenter
le stockage public utilisé ; la borne de deux versions n’est appliquée que lorsque
le précédent est déclaré et les candidats identifiés. Ne pas inventer un précédent
pour obtenir un nettoyage plus agressif.

## Frontière et cycle de vie

Le runtime `src/js/pwa/publicWorker.js` est partagé par le worker compilé et le
laboratoire #48. Il applique la même politique aux requêtes :

- les ressources publiques explicitement listées sont lues sans cookies,
  Authorization, referrer ni réutilisation du cache HTTP ; les redirections,
  réponses opaques/privées, erreurs et mauvais MIME sont refusés ;
- les API, authentifications, méthodes d’écriture, autres origines, paramètres et
  chemins inconnus ne sont jamais persistés ; les lectures privées gardent leur
  contexte de requête et contournent le cache HTTP lorsque le worker les contrôle ;
- la navigation est réseau, jamais stockée ; sans connexion, seul le document
  neutre est rendu, ou une réponse 503 `no-store` si #51 n’est pas encore présent ;
- aucune commande n’est mise en file ni rejouée après reconnexion.

L’installation télécharge les assets publics avant de terminer. Un échec
abandonne le candidat et retire son cache, sans toucher à la version active. Un
stockage défaillant n’empêche pas une lecture en ligne ; sans stockage et sans
réseau, le worker renvoie l’indisponibilité plutôt qu’une ancienne donnée privée.

Aucune activation anticipée n’est automatique. Le message
`ACTIVATE_PUBLIC_UPDATE` est accepté depuis un client de même origine, et sa
réponse publique identifie la version dont l’activation a été demandée. Le message
`PUBLIC_BUILD` permet une vérification de version ; aucun de ces messages ne
renvoie une donnée utilisateur. Le client optionnel de #53 présente la mise à jour,
bloque les formulaires ouverts et demande un rechargement explicite dans chaque
fenêtre ; il reste désactivé par défaut.

Le nettoyage capture les caches avant d’identifier les workers en cours
(installing/waiting/active). Il préserve leur version : un `controllerchange` ne
signifie pas que le nettoyage précédent est terminé. Si un candidat ne répond
pas, le nettoyage est différé. Avec un historique connu, seuls les anciens noms
exacts `mhw-public-v1-<identifiant>` sont retirés ; caches étrangers, version courante,
précédente et candidats sont conservés. Les canaux de message et délais de garde
sont bornés.

## Hébergement et retour arrière

L’application actuelle est hébergée à la racine de son origine. Le worker utilise
`/sw.js` et des chemins de ressources absolus sous cette racine ; un hébergement
en sous-chemin nécessite une adaptation explicite et ses tests.

En staging, avant toute inscription :

1. Servir `/sw.js` comme JavaScript, sans redirection ni HTML de repli SPA, avec
   une politique HTTP empêchant de réutiliser un ancien script (`no-cache` ou
   `no-store`). L’inscription optionnelle de #53 utilise `updateViaCache: none`.
2. Servir les assets avec leur MIME réel et sans personnalisation ; les JavaScript
   peuvent utiliser `application/javascript` ou `text/javascript`.
3. Conserver les assets de la version précédente pendant la transition et le
   rollback ; vérifier que le serveur privé/proxy respecte backend #98.
4. Vérifier #50, #51, #53 puis l’installation et le mode standalone sur appareils
   dans #54. Les profils Chromium ne valent pas recette Safari iOS.

Pour revenir à une version fonctionnelle, redéployer un ensemble cohérent de code,
assets et worker précédents. Une reconstruction des anciens assets avec un nouveau
précédent produit un nouvel identifiant, mais conserve le comportement de l’ancienne
version. Le cycle d’attente/activation reste applicable. Le cache précédent facilite
le retour ; il ne remplace pas la rétention des assets côté serveur.

Retour arrière de cette PR : revenir au script `vite build`, retirer le générateur,
le runtime et les fichiers générés, puis reconstruire. Aucun worker de l’application
n’est à désinscrire puisque cette unité n’en enregistre aucun. Les procédures de
retrait après activation réelle restent #53/#55, sans purge des autres caches.

## Reproduction des tests

```bash
npm ci
npm run test:pwa:builder
npx playwright install --with-deps chromium
npm run test:pwa:proof
npm run test:pwa:built
```

Les tests du générateur construisent de vrais workers : reproductibilité, changement
de version, exclusion des fichiers privés et source maps, refus des liens et
métadonnées invalides. Ils parsèrent le JavaScript produit comme un script classique.

Le laboratoire initial conserve ses six parcours sur le runtime partagé. La
nouvelle suite construit d’abord le vrai build Web, puis sert son worker compilé
et ses assets sur `127.0.0.1:4176`, avec des pages et une API synthétiques. Elle
vérifie les lectures privées 200/401, le cache public hors ligne, la navigation
neutre/503, le retour réseau, des mises à jour, un rollback, l’échec d’un asset et
un précédent inconnu. Toutes les entrées de CacheStorage sont inspectées pour
refuser une clé privée, Authorization ou le marqueur synthétique de session.

Les variantes de mise à jour sont construites avec le même générateur dans des
répertoires temporaires, avec un asset public synthétique de version. Les pages du
laboratoire n’exécutent pas l’application financière : la suite Docker existante
vérifie séparément ses vrais parcours API. Aucune route de contrôle des tests n’est
incluse dans `dist/` ou le worker.

La CI PWA exécute générateur, laboratoire et worker compilé ; les CI Web/Docker,
mobile et visuelle restent requises. Traces, screenshots et vidéos des preuves
PWA restent désactivés. Aucun réseau externe, compte, secret ou donnée réelle
n’est utilisé dans les parcours navigateur.

## Limites restantes

- Le contrat HTTP avant contrôle par un worker dépend de backend #98 ; ces tests
  simulent ce contrat et ne prouvent pas son déploiement.
- L’interface hors ligne et de mise à jour est livrée séparément (#51/#53) et
  l’inscription reste désactivée par défaut.
- Un navigateur peut évincer le stockage public ; le hors-ligne n’est pas garanti
  en toutes circonstances, notamment en mode privé ou sous quota.
- XSS et hébergement compromis restent hors de la protection d’une liste de cache.
- La recette intégrée et multi-fenêtre de #50/#53/#54 reste nécessaire avant
  activation dans l’application et avant déploiement de production.

Sources : [décision #48](pwa-cache-strategy.md),
[cycle de vie des workers](https://developer.chrome.com/docs/workbox/service-worker-lifecycle),
[API de build Vite](https://v6.vite.dev/guide/api-javascript.html#build) et
[Cache Storage](https://w3c.github.io/ServiceWorker/#cachestorage-interface).
