# CI/CD Frontend

## Pipeline

Les branches et merge requests executent le formatage, le lint, les tests, le
type-check et le build. Le contenu exact de l'artefact `dist/` valide est
deployable manuellement uniquement depuis la branche protegee `main`.

Chaque deploiement copie l'artefact dans `releases/$CI_COMMIT_SHA`, puis bascule
atomiquement le lien `current`. Un healthcheck HTTP restaure la release
precedente si le marqueur public `deployment-sha.txt` ne correspond pas au SHA
attendu. Les cinq releases les plus recentes et la release active sont
conservees.

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
