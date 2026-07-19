# CI/CD Frontend

## Pipeline

Les branches et merge requests executent le formatage, le lint, les tests, le
type-check et le build. Le contenu exact de l'artefact `dist/` valide est
deployable manuellement uniquement depuis la branche protegee `main`.

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
