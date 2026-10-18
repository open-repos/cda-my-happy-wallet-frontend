# Décision PWA et politique de cache — #48

Décision du 18 octobre 2026. Parent : [#47](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/47).
Dépendance de cadrage [#20](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/20) fermée.

## Résultat et périmètre

La PWA proposera une installation et une coque hors ligne **neutre**, sans budget,
identité, opération, formulaire prérempli ou ancienne réponse API. Hors connexion,
on ne consulte ni ne modifie ses finances. Aucune écriture différée n’est prévue.

Cette PR livre une décision, une politique pure exécutable et un laboratoire de
cycle de vie. **Elle n’enregistre aucun service worker dans l’application**, ne
change pas son authentification et n’ajoute aucune donnée au stockage existant.
Le worker du laboratoire n’est ni une ressource publique du build Vite ni un
module importé par `src/main.jsx`. Il ne contrôle que son origine de test séparée.

L’installation testée ici est celle du service worker. L’installation depuis un
navigateur, le mode standalone et les comportements réels iOS/Android restent la
recette [#54](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/54),
après manifeste, écran hors ligne et mécanisme de mise à jour. Les profils
Chromium mobile/tablette/desktop ne prouvent pas le comportement de Safari iOS.

## Contexte, options et choix

Le Web est une SPA React/Vite qui lit une API financière authentifiée. Il n’a
actuellement ni manifeste ni enregistrement de service worker. L’API peut être
sur une autre origine. Un worker contrôlant une page peut intercepter ses
requêtes vers cette API : une exclusion par simple scope de chemin ne suffit pas.

| Option                                                  | Intérêt                                                | Compromis                                                                         | Décision                                            |
| ------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------- |
| Aucun worker                                            | Aucun nouveau cache applicatif                         | Pas de coque hors ligne ; ne règle pas le cache HTTP des API                      | État de production conservé pendant la préparation  |
| Cache global ou stale-while-revalidate pour les données | Lecture rapide et budget ancien hors ligne             | Persistance de données financières, réponses périmées et risque multi-utilisateur | Rejetée                                             |
| Workbox avec routes et précache générés                 | Outils établis pour le cycle de vie                    | Configuration et dépendances supplémentaires ; exclusions toujours à prouver      | Alternative si la complexité future le justifie     |
| Worker natif minimal, liste publique explicite          | Frontière courte, testable et sans nouvelle dépendance | Génération du manifeste d’assets et cycle de vie à maintenir et tester            | Retenue pour #49, après la preuve de cette décision |

Les noms de fichiers hachés servent au versionnement, pas à authentifier un
serveur compromis. La génération doit exclure secrets, fichiers d’environnement,
fixtures privées, source maps et réponses API. Une extension seule ne rend jamais
une ressource publique : son chemin doit aussi figurer dans la liste du build.

## Matrice des requêtes

| Requête                                                              | Réseau                                                                                 | CacheStorage                                              | Hors ligne                                                  |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| GET d’un asset haché explicitement listé                             | Cookies, en-têtes privés et referrer omis ; redirection refusée ; cache HTTP contourné | Réponse 200 de même origine et de type attendu uniquement | Asset public de la version active                           |
| `/offline.html` statique neutre                                      | Même politique publique                                                                | Document statique uniquement                              | Message neutre, sans reconstruire l’application financière  |
| Navigation de même origine                                           | Réseau avec `cache: no-store` ; contexte de session préservé                           | Jamais sa réponse ni son URL de navigation                | Document neutre si le réseau est inaccessible               |
| API, auth, requête avec Authorization, autre origine, chemin inconnu | Réseau avec `cache: no-store` lorsque le worker contrôle la page                       | Jamais                                                    | Échec explicite, jamais une ancienne réponse                |
| POST/PUT/PATCH/DELETE/HEAD                                           | Réseau uniquement, sans file de reprise                                                | Jamais                                                    | Échec explicite ; pas de double écriture au retour en ligne |
| Asset avec query string ou fragment                                  | Réseau uniquement                                                                      | Jamais                                                    | Pas de clé de cache contenant un paramètre privé            |
| Manifeste et icônes non hachées                                      | Réseau uniquement dans la politique actuelle                                           | Non admis implicitement                                   | Extension éventuelle à spécifier et tester dans #52         |

`src/js/pwa/cachePolicy.js` réalise la classification, construit la requête
publique sans contexte privé, valide les réponses stockables et borne le
nettoyage au namespace `mhw-public-v1-<16 caractères hexadécimaux>`.
Les réponses opaques, redirigées, partielles, d’erreur, de mauvais MIME, avec
`Vary: *`, `private` ou `no-store` ne sont pas stockables.
Une panne de stockage ne doit pas empêcher une lecture réseau ; un échec de
précache doit empêcher l’installation de la nouvelle version.

La politique ne garantit pas qu’une URL présente dans un build fiable restera
publique si le serveur est compromis. Elle suppose que les assets statiques sont
servis sans personnalisation. Le serveur doit émettre le MIME attendu, notamment
`application/javascript` pour les scripts ; les autres MIME doivent être ajoutés
explicitement avec leurs tests avant utilisation.

## Deux caches distincts et dépendance backend

`CacheStorage` est un stockage explicite piloté par JavaScript. Les directives
HTTP ne remplacent pas ses garde-fous : le code doit refuser les données privées.
Réciproquement, l’absence d’un `cache.put` ne protège pas le cache HTTP du
navigateur, d’un proxy ou d’un CDN, notamment au premier chargement sans worker.

La lecture du backend develop `c1f4d2897db173b0de9db95175bfc253f4f82eed`
a identifié des `no-store` explicites sur les sondes et aucun contrat général
équivalent sur les réponses API privées. Le ticket
[backend #98](https://github.com/open-repos/cda-my-happy-wallet-backend/issues/98)
porte donc le contrat `Cache-Control: private, no-store` des réponses privées et
d’authentification, y compris erreurs, parsing, refus et limitation. Le
[frontend #50](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/50)
en dépend pour sa validation complète. Le laboratoire simule ce contrat ; il ne
prouve pas que le backend ou le proxy de production le fournit déjà.

Les caches HTTP déjà présents ne sont pas effacés par cette politique. Il faut
vérifier les en-têtes réellement reçus en staging, les caches intermédiaires et
l’absence de réutilisation privée via 304 avant activation.
Le stockage actuel de session de l’application reste hors de ce changement :
on ne prétend ni supprimer ses tokens existants ni corriger un risque XSS.

## Cycle de vie retenu

1. Générer la liste des assets publics du build et son identifiant déterministe.
   Le script du worker garde une URL stable, est servi sans réutilisation de
   cache périmé et ses imports sont également revérifiés (`updateViaCache: none`).
2. Installer la nouvelle version dans son propre cache public. Si un téléchargement
   échoue ou si sa réponse est interdite, abandonner le candidat ; la version
   active continue à fonctionner.
3. Garder la mise à jour en attente. Ne pas appeler `skipWaiting` automatiquement.
   #53 proposera une action explicite, après protection des formulaires en cours.
   L’activation naturelle après fermeture des anciennes pages reste possible.
4. Après activation, conserver la version courante et la précédente ; supprimer
   uniquement les noms correspondant exactement au namespace public. Un candidat
   en attente peut temporairement ajouter un troisième cache avant activation.
   Ne jamais faire un nettoyage de tous les caches de l’origine. Capturer la liste
   avant d’identifier les workers installing/waiting/active et préserver aussi
   leurs caches : `controllerchange` peut précéder la fin du précédent nettoyage.
   Si un candidat ne répond pas, différer le nettoyage ; la borne de deux versions
   est alors temporairement relâchée, sans sacrifier la prochaine version.
5. Au retour en ligne, refaire la lecture réseau ; aucune commande privée n’est
   rejouée. L’interface doit indiquer la connexion retrouvée et laisser l’utilisateur
   relancer une lecture, sans réessayer silencieusement une écriture.
6. Pour revenir en arrière, redéployer le build public précédent sous la même URL
   de worker, garder ses assets disponibles côté serveur et repasser par le cycle
   d’installation/activation. Le cache précédent facilite ce retour, mais ne
   remplace pas un déploiement cohérent des assets et du script.

La coexistence de plusieurs onglets et l’accord de mise à jour de formulaires
sont des critères de #53. Le laboratoire utilise une page sans formulaire et
prouve le maintien en attente ainsi que l’activation explicite.

## Modèle de menace et limites de confiance

| Menace                                                            | Réponse                                                                       | Limite ou test complémentaire                                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Ancien budget visible après déconnexion ou changement de personne | Aucune réponse privée ou navigation persistée ; fallback neutre               | #50 doit vérifier les vrais parcours de session et les caches HTTP                                       |
| URL avec token conservée dans une clé                             | Requêtes de ressources avec paramètres exclues ; navigation jamais stockée    | Aucun log de corps, URL sensible ou dump d’environnement                                                 |
| Réponse API ressemblant à un asset                                | Liste de build, méthode/origine/en-têtes et MIME contrôlés ; aucun JSON admis | Build et hébergement statique restent des frontières de confiance                                        |
| Redirection, erreur ou réponse opaque stockée                     | Refus explicite, `redirect: error` pour les assets                            | Vérifier aussi le reverse proxy de staging                                                               |
| Mise à jour coupant une session ou un formulaire                  | Candidat en attente, activation explicite                                     | #53 : fenêtres concurrentes et formulaires non enregistrés                                               |
| Nettoyage destructeur d’un autre module                           | Namespace strict, conservation courant/précédent                              | Test avec un cache appartenant à une autre application                                                   |
| Quota, éviction, mode privé ou installation ratée                 | Fonctionnement en ligne sans stockage, ancien worker préservé                 | Le navigateur peut toujours évincer les assets ; aucun engagement hors ligne absolu                      |
| XSS ou serveur compromis                                          | Pas de nouveau contexte privé transmis aux assets publics                     | Un script de même origine peut accéder au DOM et au stockage ; cette politique n’est pas une défense XSS |

Les identifiants d’essai sont synthétiques. Aucun artefact de traces, vidéo ou
screenshot du laboratoire n’est conservé. Le serveur écoute uniquement sur
`127.0.0.1:4175`, sans API externe, app React, base de données ou secret.

## Reproduction et preuves

Prérequis : Node 22 pour l’environnement canonique et Chromium Playwright.
Dans un checkout propre :

```bash
npm ci
npx playwright install --with-deps chromium
npx vitest run test/vitest/pwaCachePolicy.test.js
npm run test:pwa:proof
```

Les tests unitaires couvrent refus des API/auth, méthodes, origines, paramètres,
listes de build invalides, réponses interdites et périmètre du nettoyage.
Le laboratoire sert un vrai worker et ses réponses synthétiques sans intercepter
ses requêtes avec `page.route` : installation, lectures privées 200/401, cache
public hors ligne, fallback neutre, retour réseau, mise à jour A→B→C en attente,
conservation de deux versions hors candidats en attente, mises à jour rapides
pendant une activation, rollback C→B et installation défaillante.
Il inspecte toutes les entrées de CacheStorage et refuse le marqueur privé
synthétique. La même suite s’exécute sur trois profils Chromium.

La CI `PWA cache policy proof` reproduit ce laboratoire indépendamment de la
stack financière. Les suites Web, Docker et visuelles existantes restent
requises. Docker est absent de cet environnement Cloud ; les contrôles locaux
peuvent y tourner directement conformément à AGENTS.md, la CI valide la stack.

Pour vérifier la sensibilité des tests, retirer temporairement l’exclusion des
requêtes avec Authorization ou élargir les assets au chemin API : les tests de
frontière doivent échouer. Restaurer le code avant commit.

| Critère #48                                          | Preuve de cette unité                                    | Validation de livraison suivante                           |
| ---------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| Décision reproductible et compromis tracés           | Ce document et la politique testée                       | Revue de la décision avant activation                      |
| Aucun cache privé introduit                          | Classification stricte et inspection du laboratoire      | #50 et backend #98 sur les vraies réponses ; staging       |
| Installation, mise à jour, retour réseau et rollback | Cycle de vie SW réel, sur trois profils                  | Installation de l’app et standalone sur appareils dans #54 |
| Menaces et régressions                               | Matrice, tests de refus et tests sensibles aux mutations | #50/#53 pour les sessions et fenêtres de l’app             |
| Absence de secret                                    | Fixtures locales synthétiques, pas d’artefacts privés    | Contrôle du build et des en-têtes avant déploiement        |

## Séquence des tickets et point de validation

- #48 : décision et laboratoire sans inscription dans l’application.
- #49 : génération du worker et des assets versionnés ; inscription désactivée
  tant que les exigences de confidentialité et d’expérience ne sont pas livrées.
- #52 : manifeste, identité d’installation, icônes et métadonnées iOS, avec langue
  française cohérente ; ne pas réutiliser les icônes de catégories comme identité.
- #50 + backend #98 : refus de persistance privée et contrat HTTP réels.
- #51 : écran hors ligne neutre utilisable sans état financier.
- #53 : notification, activation et reprise avec plusieurs fenêtres/formulaires.
- #54 : recette installabilité et standalone iOS, Android et desktop ; tests de
  connexion, mise à jour et rollback du produit intégré.
- #55 : configuration d’hébergement, en-têtes et procédure d’exploitation.

**Point de validation humaine suivant :** revue de cette décision et des preuves
avant inscription du worker ; puis recette staging et appareils dans #54 avant
activation en production. Aucun déploiement, compte store ou credential n’est
créé par cette unité.

Retour arrière de cette PR : retirer la politique et le laboratoire. Aucun
worker de l’application ne doit être désinscrit puisqu’aucun n’est enregistré.
Après activation future, la procédure de secours doit d’abord laisser passer le
réseau, retirer seulement notre inscription et notre namespace, puis restaurer
la version publique précédente ; elle sera vérifiée dans #53/#55.

## Sources primaires

- [RFC 9111, Cache-Control](https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.5) : distinction entre `private` et `no-store` pour les caches HTTP.
- [Spécification Cache](https://w3c.github.io/ServiceWorker/#cache-interface) : stockage explicite et correspondance des requêtes.
- [Cycle de vie du service worker, Chrome](https://developer.chrome.com/docs/workbox/service-worker-lifecycle) : installation, attente et activation.
- [Fetch Standard](https://fetch.spec.whatwg.org/) : credentials, modes de cache et redirections.
