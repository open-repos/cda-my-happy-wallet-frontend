# CI/CD Frontend

## Pipeline

Les branches et merge requests executent le formatage, le lint, les tests, le
type-check et le build. Le contenu exact de l'artefact `dist/` valide est
deployable manuellement uniquement depuis la branche protegee `main`.

`deploy_production` est propose apres un push sur `main` (merge) et pour un
pipeline lance a la main sur `main` (« Run pipeline », source `web`). Les
variables `VITE_*` etant lues au build, changer l'une d'elles (par exemple
`VITE_PWA_ENABLED`) demande un nouveau pipeline sur `main`, puis son
`deploy_production` : relancer seulement le deploiement d'un ancien pipeline
reutiliserait l'artefact construit avec l'ancienne valeur. Le log du job
`build` indique si l'inscription PWA est activee.

Chaque deploiement copie l'artefact dans `releases/$CI_COMMIT_SHA`, puis bascule
atomiquement le lien `current`. Un healthcheck HTTP restaure la release
precedente si le marqueur public `deployment-sha.txt` ne correspond pas au SHA
attendu. Les cinq releases les plus recentes et la release active sont
conservees.

Avant la bascule, le script lit le `pwa-build.json` public de la version en
ligne et copie dans la nouvelle release les assets haches qu'il liste et qui
manquent, depuis la release courante. Les onglets deja ouverts et un service
worker en transition trouvent ainsi encore les fichiers de la version
precedente. Seule cette version est reportee : un asset plus ancien, non liste,
n'est pas recopie, et un fichier deja present dans la nouvelle release n'est
jamais remplace. Si la liste est indisponible, le deploiement continue sans
report et l'indique dans le journal.

## Variables GitLab

Configurer ces variables avec la portee d'environnement `production` et
l'option `Protected` :

| Variable          | Type     | Usage                                     |
| ----------------- | -------- | ----------------------------------------- |
| `SSH_PRIVATE_KEY` | File     | Cle privee dediee au deploiement          |
| `SSH_KNOWN_HOSTS` | File     | Cle d'hote verifiee du serveur            |
| `SERVER_IP`       | Variable | Hote SSH cible                            |
| `SERVER_USER`     | Variable | Compte de deploiement sans privilege root |
| `DEPLOY_PATH`     | Variable | Repertoire web cible                      |

La cle publique correspondante doit etre limitee au compte de deploiement. Ne
pas produire `SSH_KNOWN_HOSTS` dans le job avec `ssh-keyscan` : verifier
l'empreinte du serveur hors CI avant d'enregistrer la variable.

## Reglages GitLab

- Proteger la branche `main`.
- Proteger l'environnement `production` si l'offre GitLab le permet.
- Activer `Prevent outdated deployment jobs`.
- Configurer le runner `server_runner_2` pour les jobs tags uniquement et les
  refs protegees.
- Conserver les jobs de validation sur les runners GitLab ou sur un runner CI
  isole du serveur de production.

## Preparation Serveur

Le repertoire cible appartient a `mhw-frontend:www-data`. Les repertoires sont
en mode `2750` et les fichiers en mode `640`. Nginx sert le lien `current` :

```nginx
root /var/www/myhappywallet.andriacapai.com/current;
```

Avant le premier deploiement, conserver la version actuelle comme release
initiale :

```bash
base=/var/www/myhappywallet.andriacapai.com
sudo -u mhw-frontend install -d -m 2750 "$base/releases/legacy"
sudo -u mhw-frontend cp -a "$base/index.html" "$base/assets" "$base/releases/legacy/"
sudo -u mhw-frontend ln -s releases/legacy "$base/current"
```

Modifier ensuite la directive `root` Nginx, valider avec `sudo nginx -t`,
recharger Nginx et verifier le site avant de retirer les anciens fichiers a la
racine. Le compte `mhw-frontend` ne doit appartenir ni a `sudo` ni a `docker`.

## Compression Et Cache Des Ressources — #153

### Mesure initiale du 22 octobre 2026

La mesure du 21 octobre avait trouvé un cache immuable mais aucun encodage pour
le JSON des icônes. Le contrôle du **22 octobre 2026 à 16 h 34 CEST (14 h 34 UTC)**
confirme ce résultat sur `https://myhappywallet.andriacapai.com`, utilisé comme
hébergement réel de recette faute de staging distinct (voir [PWA](pwa-updates.md)).
Les requêtes GET sont publiques, sans cookie ni authentification, et ne changent
ni le déploiement ni les données.

- `deployment-sha.txt` : `74e6f95b5ec06ca24582ea38bfb9237374a0ecbd`.
- Le HTML référence `/assets/index-CPhTffZM.js`, qui référence
  `/assets/category-icons-CJSyu0PD.json` : le nom de l'asset est découvert dans
  **le build servi**, sans supposer qu'il correspond au dernier `develop`.
- Réponses du JSON : HTTP 200, `Content-Type: application/json`, JSON valide,
  `Cache-Control: public, max-age=31536000, immutable`.

| `Accept-Encoding` demandé | `Content-Encoding` reçu | `Vary` reçu | Corps téléchargé |
| ------------------------- | ----------------------- | ----------- | ---------------: |
| `identity`                | absent                  | absent      | 1 191 928 octets |
| `gzip`                    | absent                  | absent      | 1 191 928 octets |
| `br, gzip`                | absent                  | absent      | 1 191 928 octets |

Les trois corps ont le même SHA-256 :
`04414f05fe855d77346b50f6dee9469a3b22f0a0d8cb1ed6c039ef2b731ae891`.
Une compression **locale**, gzip niveau 6, donne 403 094 octets, soit environ
66 % de moins. Ce chiffre est une estimation reproductible, pas un transfert
compressé observé sur le serveur. Les tailles ci-dessus excluent les en-têtes
et le surcoût TLS ; `curl` n'a pas décompressé les corps automatiquement.

**Avant correction : cache long conforme ; compression absente sur le chemin
HTTP mesuré.** Le point de sortie cloud affiche `Server: envoy` : il peut y avoir un
intermédiaire. Ces GET ne permettent donc ni d'identifier la version Nginx de
l'origine, ni de lire sa configuration effective, ni de garantir qu'un proxy ne
transforme pas les réponses. Refaire le contrôle depuis le poste du propriétaire
et depuis l'hôte d'origine pour distinguer les deux chemins. Ne pas conclure que
le serveur utilise les valeurs par défaut à partir des seuls en-têtes publics.

### Validation après intervention du propriétaire

Le propriétaire a appliqué la configuration Nginx pendant la recette guidée.
Son GET du **22 octobre 2026 à 17 h 40 CEST (15 h 40 UTC)** renvoie HTTP 200,
`application/json`, `Content-Encoding: gzip`, `Vary: Accept-Encoding` et le cache
immuable existant. La taille gzip est maintenant un **transfert réellement mesuré**.

Une seconde mesure indépendante depuis le cloud à **17 h 41 CEST (15 h 41 UTC)**
confirme les deux variantes, sur le même asset du même build :

| `Accept-Encoding` demandé | `Content-Encoding` reçu | `Vary` reçu       | Corps téléchargé |
| ------------------------- | ----------------------- | ----------------- | ---------------: |
| `identity`                | absent                  | `Accept-Encoding` | 1 191 928 octets |
| `gzip`                    | `gzip`                  | `Accept-Encoding` |   403 094 octets |

Les deux réponses gardent `Content-Type: application/json` et
`Cache-Control: public, max-age=31536000, immutable`. Le gain est de
**788 834 octets, soit 66,18 %**. `gzip -t` réussit sur le corps gzip ; sa
décompression donne exactement les octets de la variante identity, avec le
SHA-256 initial `04414f05fe855d77346b50f6dee9469a3b22f0a0d8cb1ed6c039ef2b731ae891`.
Le JSON a également été parsé avec succès. Le contrôle HTTP est donc passé de
rouge avant correction à vert après intervention réelle, sans serveur simulé.

Pendant l'édition, une copie `myhappywallet.andriacapai.comes` dans
`/etc/nginx/sites-enabled/` déclarait aussi les domaines du frontend sur 80 et 443. Gzip avait été ajouté dans cette copie, tandis que l'original restait
inchangé. Le diff ne contenait que gzip et l'indentation. La procédure guidée a
prévu la sauvegarde de l'original, la reprise de la copie corrigée dans le fichier
source et l'archivage du doublon hors des configurations actives. Le propriétaire
a ensuite fourni ce test, **sans avertissement de conflit** :

```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Les critères compression, cache et preuve sur hébergement réel sont vérifiés.
La modification du serveur a été effectuée par le propriétaire ; l'agent n'a
exécuté aucun SSH, rechargement ou déploiement. Le retour arrière est documenté
ci-dessous, mais n'a pas été exécuté : les mesures finales sont conformes.
Les GET publics de contrôle renvoient aussi HTTP 200 pour `/login` (`text/html`)
et `/sw.js` (`application/javascript`, `Cache-Control: no-cache`). Ces contrôles
statiques ne sont pas une recette de connexion avec un compte réel.

### Configuration de référence et procédure propriétaire

La configuration active reste administrée par le propriétaire. La procédure
suivante permet de reproduire et maintenir le réglage vérifié ci-dessus, sans
accès SSH depuis l'environnement cloud.

Sur l'hôte, identifier le bloc existant qui sert les assets publics hachés, par
exemple `location /assets/`, et y intégrer les directives ci-dessous. **Conserver
le `root`/`alias`, les contrôles d'accès et le `Cache-Control` existants** ; ne pas
créer un second bloc concurrent ni dupliquer les en-têtes de cache. La proposition
est limitée aux assets statiques publics et ne change pas la politique de l'API,
des réponses privées, du HTML ou du service worker.

```nginx
# Dans le bloc existant qui sert les assets publics haches uniquement.
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_min_length 1024;
gzip_proxied any;
gzip_types application/javascript application/json image/svg+xml text/css;
```

`gzip_types` inclut explicitement le JSON ; `gzip_vary` permet aux caches de
distinguer les variantes par `Accept-Encoding`. `gzip_proxied any` s'applique ici
uniquement aux assets publics du bloc, y compris quand une requête traverse un
proxy. Gzip suffit ; aucune installation de module Brotli n'est nécessaire pour
cette proposition. Source : [module gzip Nginx](https://nginx.org/en/docs/http/ngx_http_gzip_module.html).

Procédure propriétaire, après validation du périmètre :

1. Refaire d'abord les mesures depuis le poste et l'origine. Si les deux chemins
   servent déjà correctement gzip, conserver ces preuves sans modifier Nginx.
   Si seule la sortie cloud diffère, traiter cela comme une limite de mesure.
2. Si la correction à l'origine est nécessaire, sauvegarder le fichier actif **hors de tout répertoire servi**
   et noter le chemin de cette sauvegarde. Ne pas exporter la configuration
   complète ni des secrets dans l'issue ou les journaux CI.
3. Intégrer les directives dans le bloc existant, sans changer le cache immuable.
4. Exécuter `sudo nginx -t`. En cas d'échec, restaurer la sauvegarde sans recharger.
5. Si le test réussit, exécuter `sudo systemctl reload nginx`, puis les mesures
   ci-dessous sur l'origine et sur l'URL publique. Vérifier aussi que la page de
   connexion et les en-têtes de `/sw.js` restent conformes.
6. Si une régression apparaît, restaurer le fichier sauvegardé, refaire
   `sudo nginx -t`, puis `sudo systemctl reload nginx` et les contrôles HTTP.
   Aucune suppression d'asset ni purge des caches utilisateurs n'est nécessaire.

Le test de syntaxe réel est fourni par le propriétaire ci-dessus ; le rollback
reste une procédure de secours non exercée pendant cette intervention. Une
validation CI du dépôt ne remplace pas les contrôles HTTP de l'hébergement.

### Reproduire et vérifier le résultat

Prérequis : `curl`, `gzip`, un shell POSIX ; requêtes sans authentification.
Découvrir le nouveau nom haché si le build servi a changé, puis adapter `icon_url`.
Ne pas utiliser `--compressed`, qui masquerait la taille du corps compressé.

```sh
icon_url=https://myhappywallet.andriacapai.com/assets/category-icons-CJSyu0PD.json
measurement_dir=$(mktemp -d)
trap 'rm -rf "$measurement_dir"' EXIT HUP INT TERM

curl --fail --silent --show-error --max-time 30 \
  -H 'Accept-Encoding: identity' -D "$measurement_dir/identity.headers" \
  -o "$measurement_dir/identity.body" \
  -w 'identity: HTTP %{http_code}, %{size_download} octets de corps\n' "$icon_url"
curl --fail --silent --show-error --max-time 30 \
  -H 'Accept-Encoding: gzip' -D "$measurement_dir/gzip.headers" \
  -o "$measurement_dir/gzip.body" \
  -w 'gzip: HTTP %{http_code}, %{size_download} octets de corps\n' "$icon_url"

cat "$measurement_dir/identity.headers" "$measurement_dir/gzip.headers" \
  | tr -d '\r' | rg -i '^(HTTP/|content-type:|content-encoding:|content-length:|cache-control:|vary:)'
gzip -t "$measurement_dir/gzip.body"
gzip -dc "$measurement_dir/gzip.body" | cmp - "$measurement_dir/identity.body"
```

Le filtrage utilise `rg` (ou `grep -iE` avec la même expression). Avant correction,
`gzip -t` échouait sur le JSON reçu sans compression. Après intervention du
propriétaire, `gzip -t` et la comparaison du contenu réussissent. Pour toute
validation ultérieure, attendre :

- HTTP 200 et `Content-Type: application/json` sur les deux réponses ; pas de
  page HTML de repli servie à la place de l'asset.
- `Content-Encoding: gzip` pour la demande gzip et `Vary` contenant
  `Accept-Encoding` ; aucune compression forcée pour la demande identity.
- `Cache-Control` conservant `public`, `max-age=31536000` et `immutable` dans les
  deux cas, sans directives contradictoires.
- `gzip -t` et la comparaison `cmp` réussis : le décodage rend le même JSON.
- Un corps gzip sensiblement plus petit (environ 403 Ko pour ce contenu), sans
  imposer une taille exacte qui dépend du niveau et de la version de gzip.

Si l'origine passe mais pas l'URL publique, examiner la négociation et le cache
des intermédiaires avant toute autre modification ; conserver les preuves des
deux chemins. Reporter dans #153 le SHA déployé, le nom de l'asset, la date, les
en-têtes utiles et les tailles. Ne joindre ni cookies, ni en-têtes d'autorisation,
ni configuration serveur complète.
