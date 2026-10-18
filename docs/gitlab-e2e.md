# E2E optionnels sur le miroir GitLab — ticket #61

Le code et cette configuration restent gérés sur GitHub. Le job `e2e_optional`
du miroir GitLab réutilise exactement la stack du
[ticket #60](web-e2e-stack.md). Il est manuel et non bloquant pour les builds et
la livraison. Il n'ajoute aucun déploiement et n'utilise pas `server_runner_2`.

## État de validation

La configuration, les garde-fous et le nettoyage sont testables dans GitHub.
L'exécution GitLab réelle reste **à valider sur un runner dédié** : aucun accès
GitLab ni runner n'est configuré par cette PR. Ne pas déclarer #61 terminé avant
la première exécution réussie et un essai d'interruption sur ce runner. Le projet
et ses réglages doivent aussi être validés par CI Lint dans l'instance cible.

## Contrat du runner

Utiliser un runner **shell Linux éphémère**, verrouillé à ce projet, marqué
`mhw-e2e-rootless`, avec les jobs sans tag désactivés et une seule tâche par VM.
Le compte de ce runner n'a ni sudo, ni groupe Docker privilégié, ni clé SSH, ni
accès au serveur de production. Le contrôle préalable exige :

- Node 22 et Docker Compose v2.24 ou supérieur dans la branche v2 ;
- un daemon Docker en mode rootless, actif pour ce compte ;
- aucune configuration SSH, de déploiement ou de base réelle dans l'environnement
  du job (`SSH_*`, `SERVER_*`, `DEPLOY_PATH`, `DATABASE_URL`, `SHADOW_DATABASE_URL`
  pour les variables contrôlées dans le script).

L'image Node par défaut du pipeline ne provisionne pas un exécuteur shell :
Node et Docker doivent être présents sur la VM jetable. Ne pas convertir ce job
en montage du socket privilégié du serveur de production ni en DinD privilégié.
Les secrets de déploiement documentés dans [ci-cd.md](ci-cd.md) gardent leur portée
`production`. Ce job ne déclare aucun environnement de déploiement, ne reçoit
aucun artefact et n'utilise pas le cache GitLab partagé.

Les variables natives `GITLAB_CI` et `CI_PROJECT_DIR` sont fournies par GitLab.
Aucun secret ni variable manuelle supplémentaire n'est requis : la stack génère
ses identifiants synthétiques. Ne pas saisir de secret dans le formulaire du job
manuel. Les éventuels secrets GitHub du miroir ne sont pas des variables E2E.

## Lancement et preuves attendues

Après la synchronisation GitHub → GitLab et le passage du job `tests`, lancer
`e2e_optional` sur `develop` ou sur une merge request du même projet. Les merge
requests provenant d'un fork ne satisfont pas la règle MR. Le runner doit rester
verrouillé au projet ; une copie du YAML dans un fork ne doit pas disposer de
ce runner. Le job reste volontairement facultatif et son échec est visible sans
bloquer le pipeline de livraison.

Le contrôle `node scripts/gitlab-e2e-runner.mjs check` précède npm ci et refuse un
Docker privilégié ou un contexte de production. Puis les tests du lanceur et
`npm run test:e2e:stack` construisent le backend épinglé, attendent les healthchecks,
exécutent les 24 parcours et détruisent la stack. Les ports ne sont pas publiés,
les bases sont en mémoire et les commandes privées restent dans le réseau isolé.

Avant de terminer le ticket, conserver dans la PR le lien du pipeline GitLab et
les résultats de ces deux essais sur le même SHA :

1. Exécution nominale : 24 parcours réussis, nettoyage réussi, aucune ressource
   avec le label du projet restant sur le runner.
2. Interruption pendant les tests : annuler le job et vérifier `after_script`,
   puis rejouer le nettoyage ; aucune ressource du projet ne doit subsister.

Le script principal est limité à vingt minutes et le nettoyage dispose de quatre
minutes, dans un job de vingt-cinq minutes, pour réserver une fenêtre après un
timeout du script. Le runner doit prendre en charge ces variables de timeout.
Le `after_script` dépend du fonctionnement du runner ; une VM arrêtée brutalement
ou un daemon inaccessible ne peuvent pas être réparés par un script de job.
La destruction automatique de la VM éphémère reste le dernier niveau de nettoyage.

## Nettoyage limité et diagnostic

Sous GitLab uniquement, le lanceur écrit `.mhw-e2e-project.env` avec un nom
`mhw-e2e-` suivi de douze chiffres hexadécimaux, sans secret. Le fichier est créé
en mode 0600 et de manière exclusive ; une ancienne copie ou un lien symbolique
fait échouer le lancement. Le `after_script` lit ce petit fichier régulier sans
suivre de lien, vérifie de nouveau le runner rootless, puis retire uniquement les
conteneurs et réseaux portant **exactement** ce label Compose.

Ce nettoyage ne relit pas compose.e2e.yml : il fonctionne donc sans réexporter les
secrets jetables perdus après l'arrêt du processus principal. Il refuse les noms
et identifiants inattendus, ne fait aucun `prune` et se répète sans effet quand
la stack a déjà disparu. Le fichier de récupération est supprimé après succès.
Ne pas le publier comme artefact dotenv et ne pas utiliser `source` pour le lire.

Si le contrôle refuse le runner, vérifier les versions et les seules capacités
nécessaires avec `node --version`, `docker compose version --short` et
`docker info --format '{{json .SecurityOptions}}'`. Ne pas publier un dump complet
de l'environnement, du daemon ou des conteneurs. Les journaux de la stack passent
par le même masquage en flux que dans GitHub ; les directives GitHub add-mask
ne sont émises que dans GitHub Actions. Traces, vidéos et storage restent exclus.

## Reproduire les contrôles dans GitHub

```bash
npm ci
npm run test:e2e:runner
npm run format
npm run lint
npm test
npm run build
```

Les tests couvrent le refus d'un runner privilégié et de variables de production,
les métadonnées exclusives, le refus des liens, le périmètre exact du nettoyage,
sa répétition et les propriétés de sécurité du job YAML. La CI GitHub continue
à exécuter la vraie stack Docker ; cela ne prouve pas le provisionnement GitLab.

## Retour arrière

Retirer le job `e2e_optional` et les références à son helper, puis relancer les
validations Web. Le déploiement et ses dépendances restent inchangés. Si une stack
a été interrompue, exécuter d'abord le nettoyage limité sur le runner qui l'a
créée, ou détruire sa VM jetable. Aucun secret, base réelle ou migration à retirer.

## Sources primaires

- [Jobs manuels optionnels GitLab](https://docs.gitlab.com/ci/jobs/job_control/)
- [Sémantique de after_script](https://docs.gitlab.com/ci/yaml/#after_script)
- [Sécurité des runners GitLab](https://docs.gitlab.com/runner/security/)
- [Docker rootless](https://docs.docker.com/engine/security/rootless/)
