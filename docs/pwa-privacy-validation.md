# Confidentialité des caches PWA — préparation de #50

Backend #98 a été fusionné par la PR #99 au commit
`9a2444a26fc2cc063feeeb95329ab20170003785`. Sa CI Backend quality est verte sur
la tête `0e710753df46befbfd8cae639fdb09cbf306489a`. La stack Docker frontend est
épinglée sur ce commit de fusion immuable, sans utiliser ni modifier un clone
backend voisin. Le contrat impose `Cache-Control: private, no-store` sur les
réponses API, succès et erreurs, ainsi que l’absence d’ETag/304 privé.

L’inscription applicative reste désactivée par défaut :
`VITE_PWA_ENABLED=false`. Aucun environnement ou déploiement de production n’est
modifié par cette unité.

## Preuves avec réponses synthétiques

`test/pwa-build/privacy-boundary.spec.js` exécute le vrai worker compilé par le
générateur #49, avec une origine locale et des réponses synthétiques. Les quatre
familles de parcours s’exécutent sur les profils mobile, tablette et desktop :

| Frontière                   | Vérification navigateur                                                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API et authentification     | GET privés 200/204/400/401/403/404/422/429/500, écritures POST/PUT/PATCH/DELETE et corps de session fictif exclus des caches du worker                            |
| Authorization et paramètres | Un asset demandé avec Authorization passe au réseau et reçoit sa réponse privée synthétique ; les clés à paramètres et les données privées ne sont pas persistées |
| Deux propriétaires fictifs  | Les lectures passent de A à B ; le hors-ligne ne rend ni la réponse de A ni une ancienne page privée, et une écriture échouée n’est pas rejouée au retour réseau  |
| Requête publique            | Cookies, Authorization, en-tête privé personnalisé et referrer absents de la requête publique reconstruite                                                        |
| Réponse publique impropre   | Réponses `private`, `no-store`, `Vary: *`, HTML sous URL JavaScript, erreur 500 et redirection vers une API exclues du cache public                               |
| Cache étranger              | Un cache synthétique tiers contenant une ancienne réponse API ou navigation n’est ni consulté pour ces lectures ni effacé par le worker                           |

L’inspection vérifie toutes les entrées des caches appartenant à l’espace exact
`mhw-public-v1-<16 caractères hexadécimaux>` : chemins explicitement livrés, absence
de paramètres et d’Authorization, absence des marqueurs privés dans les corps et
absence de réponses marquées privées ou `no-store`. Le test de cache étranger y
place volontairement des données **fictives** : l’application ne revendique pas
le droit de supprimer les caches d’autres applications sur la même origine.

Le changement de propriétaire utilise un cookie de fixture, pas les vrais flux de
connexion/déconnexion. Le serveur permet aussi deux lectures avant contrôle du
worker et une requête conditionnelle synthétique sans 304. Cette vérification
caractérise uniquement la fixture ; elle doit être répétée sur le contrat réel.

Le module `privacy-fixture.mjs` n’appartient qu’au serveur de preuve local. Ses
commandes, compteurs, cookies fictifs et réponses ne sont pas copiés dans `dist/`,
le worker, l’API réelle ou les environnements déployés. Les observations serveur
ne retiennent que des booléens d’en-têtes et des compteurs ; aucun en-tête privé
entrant n’est journalisé. Traces, captures et vidéos des parcours sont désactivées.

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:pwa:built -- privacy-boundary
npm run test:pwa:built
```

La seconde commande de tests conserve aussi les preuves d’installation, retour en
ligne, mise à jour, rollback et conservation de formulaires de #49/#51/#53.

## Parcours avec le véritable backend

`test/full-stack/journeys/pwaPrivacy.spec.js` ajoute un parcours par profil dans
la stack Docker jetable, avec deux comptes isolés par profil. Les comptes sont
créés par le seed frontend uniquement dans `mhw_e2e`, exécuté deux fois pour
vérifier sa répétabilité. Aucun compte distant, faux JWT, réponse API simulée ou
injection de session dans localStorage n’est employé dans ce parcours.

```bash
npm run test:e2e:stack
```

Le test n’utilise **aucun routage Playwright** : `page.route` et `context.route`
désactivent le cache HTTP et fausseraient cette preuve. Le réseau Docker reste
interne. Un chemin public de contrôle propre au serveur de test est réellement
mis en cache, et les événements CDP prouvent cette utilisation. Aucune réponse
API n’est produite par ce contrôle : elles traversent toutes le vrai proxy.

Avant contrôle du worker, le parcours vérifie les en-têtes et l’absence de hit
HTTP privé sur des refus 401, une erreur de parsing 400, la connexion réelle et
les lectures privées, y compris `If-None-Match: *` et `If-Modified-Since`.
Ensuite, le vrai worker est construit dans `dist-e2e` et inscrit **manuellement
par le test** ; ce réglage ne change pas le défaut de l’application. Le parcours
crée une opération privée de A, vérifie le refus 422, inspecte les caches, coupe
le réseau, obtient l’écran neutre et vérifie qu’une écriture échouée ne réapparaît
pas après reconnexion. Il renouvelle la session via le vrai client Axios et son
cookie HttpOnly, se déconnecte localement, se connecte comme B puis vérifie que
l’opération de A est absente et son accès direct refusé en 404. CacheStorage est
réinspecté et les indicateurs de cache HTTP restent sans hit API privé.

Les observations d’assertion se limitent à des statuts, compteurs, identifiants
synthétiques et booléens. Les jetons, cookies, mots de passe et corps API ne sont
pas renvoyés par les helpers d’inspection. Traces, captures et vidéos restent
désactivées. Le décalage d’horloge pour le refresh concerne seulement le client,
comme dans le parcours de session existant ; l’API garde son horloge réelle.
Le logout Web appelle `POST /users/logout`, qui révoque la session côté serveur ;
le parcours `wallet.spec.js` le vérifie en relançant l’ancien cookie.

La CI backend #99 couvre en complément les vrais refus natifs, conflits,
limitation 429, erreurs serveur 500, corps trop volumineux 413, CORS refusé et
sondes/docs préservées. La frontière du worker avec ces familles est couverte
par les fixtures ; elles ne remplacent pas cette validation backend.

Deux mutations locales séparées vérifient la sensibilité des nouveaux parcours :
retirer le classement réseau des requêtes Authorization fait échouer le premier
parcours navigateur ; retirer le refus de `private`/`no-store` fait échouer le
parcours de réponses publiques impropres. Les sources sont restaurées après
chaque essai et la suite normale est rejouée.

## Recette d’hébergement restante

La CI Docker ne certifie pas le proxy de production. Avant activation dans un
hébergement réel, vérifier les en-têtes privés sans worker puis sous contrôle,
l’absence de personnalisation des assets publics et les politiques des caches
intermédiaires. Conserver le drapeau désactivé pendant cette préparation. La
recette installation/standalone réelle sur iOS, Android et desktop reste #54,
puis la documentation de livraison #55. Aucun déploiement de production n’est
effectué par ces tests.

## Limites de confiance

Le worker contrôle uniquement ses requêtes et ses propres caches. Il ne peut pas
corriger rétroactivement un cache HTTP privé créé avant sa prise de contrôle ni
un proxy qui ne respecte pas les en-têtes. D’où le contrat backend #98 et la
validation avant premier contrôle. Il ne protège pas contre une origine
compromise ou du JavaScript capable de lire les données privées déjà reçues.

Une réponse privée servie à tort sous une URL publique est refusée pour la
persistance, mais peut être rendue à l’appelant réseau ; corriger ce serveur reste
nécessaire. Le cache étranger n’est pas une source de repli. Aucune écriture n’est
mise en file et aucune réponse privée n’est utilisée hors ligne.

Le stockage de session existant n’est pas modifié : ces tests ne démontrent pas
une absence totale de jetons dans tous les stockages du navigateur, la mémoire,
l’historique ou les captures de l’utilisateur. Leur périmètre est la persistance
introduite par le cache HTTP et le service worker PWA.

Références : [décision de cache](pwa-cache-strategy.md),
[worker versionné](pwa-versioned-worker.md),
[activation optionnelle](pwa-updates.md),
[frontend #50](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/50)
et [backend #98](https://github.com/open-repos/cda-my-happy-wallet-backend/issues/98).

Sources techniques : [routage Playwright et cache HTTP](https://playwright.dev/docs/api/class-browsercontext#browser-context-route), [événements réseau CDP](https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-requestServedFromCache).
