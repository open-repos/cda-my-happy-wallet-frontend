# Migration du backlog et archivage de la roadmap historique

## Objet

Ce document trace la migration suivie par la Work Item `M00-05`. Le nouveau
backlog multi-projets est déjà publié dans GitLab ; cette procédure vérifie que
son import est complet et rejouable, puis archive de manière réversible le
dernier élément frontend de la roadmap historique.

La source versionnée du backlog est le dépôt de gestion
`gitlab_gestion_project`. Aucun token, reçu local `*.published.json` ou contenu
du trousseau de secrets n'est copié dans le frontend.

## État vérifié le 9 août 2026

- 92 brouillons My Happy Wallet sont archivés dans les dossiers `published/` du
  dépôt de gestion : 56 pour le frontend et 36 pour le backend ;
- aucun brouillon My Happy Wallet ne reste dans un dossier `pending/` ;
- les commandes `validate --all` et `publish-all` des deux profils répondent
  toutes « Aucun brouillon en attente » ;
- les Work Items normalisées frontend commencent à l'IID `3` et couvrent les
  milestones `M00` à `M11` ;
- l'ancienne issue frontend `#2`, « Composant - SideBar Menu », est toujours
  ouverte dans le milestone expiré `Dev-Frontend` de 2022 ;
- le composant correspondant existe dans `src/js/components/SideBar.jsx` et ne
  nécessite pas une deuxième implémentation.

La nouvelle roadmap est donc importée. L'issue `#2` est un reliquat historique,
pas une dépendance de la roadmap normalisée.

## Vérification reproductible et sans mutation

Depuis la racine du dépôt de gestion :

```bash
./backlog --profile my-happy-wallet-frontend validate --all
./backlog --profile my-happy-wallet-backend validate --all
./backlog --profile my-happy-wallet-frontend publish-all
./backlog --profile my-happy-wallet-backend publish-all

find issues/my-happy-wallet-frontend/published -type f -name '*.md' | wc -l
find issues/my-happy-wallet-backend/published -type f -name '*.md' | wc -l
find issues/my-happy-wallet-frontend/pending -type f -name '*.md' | wc -l
find issues/my-happy-wallet-backend/pending -type f -name '*.md' | wc -l
```

Les quatre premières commandes doivent indiquer qu'aucun brouillon n'est en
attente. Les comptages attendus sont respectivement `56`, `36`, `0` et `0`.
`publish-all` sans `--apply` est un dry-run : il ne crée et ne modifie aucune
ressource GitLab.

Cette sortie vide démontre l'idempotence opérationnelle : relancer le plan
d'import après la publication des 92 éléments ne propose aucune création
supplémentaire. Ne jamais ajouter `--apply` lorsque le dry-run est vide.

## Archivage réversible de l'ancienne issue frontend

L'archivage consiste à ajouter une note explicative puis à fermer l'issue `#2`.
Elle n'est ni supprimée ni réécrite et conserve son historique complet.

Les règles du dépôt de gestion interdisent à un agent d'exécuter une mutation
GitLab. Le propriétaire du projet doit donc lancer manuellement :

```bash
glab-perso issue note 2 \
  --repo formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend \
  --message "Roadmap historique archivée par M00-05. Le composant Sidebar est intégré ; le suivi actif est remplacé par le backlog normalisé à partir de #3."

glab-perso issue close 2 \
  --repo formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend
```

Résultat attendu : la note retourne son URL et la commande de fermeture confirme
`Closed issue #2`. Aucun secret ne doit apparaître dans la sortie ou dans la
note.

## Rollback testé par conception

La fermeture GitLab est réversible et ne détruit aucune donnée. Si l'issue `#2`
doit redevenir active :

```bash
glab-perso issue reopen 2 \
  --repo formation-cda1/projet-chef-oeuvre-rapport/projet-00-myhappywallet-frontend
```

Vérifier ensuite avec `glab-perso issue view 2 --output json` que `state` vaut
`opened`. Le rollback ne republie aucun brouillon et ne modifie pas les 92 Work
Items normalisées.

## Diagnostic et garde-fous

- Un nombre différent de `56 + 36` impose de comparer les fichiers versionnés
  aux Work Items GitLab avant toute nouvelle publication.
- Un brouillon My Happy Wallet dans `pending/` interdit de déclarer la migration
  terminée ; valider et revoir son dry-run séparément.
- Une commande proposant une création après publication signale un reçu absent,
  un déplacement incomplet ou un doublon potentiel : ne pas utiliser `--apply`.
- Une issue historique encore utile doit être reliée à une Work Item normalisée
  au lieu d'être fermée silencieusement.
- La décision [`mvp-scope-decision.md`](mvp-scope-decision.md) place Android,
  iOS et PWA en post-MVP. La mise à jour des labels de roadmap correspondants
  doit rester une opération de gestion distincte et tracée.

## Critère de fin

`M00-05` peut être fermée après le commit de ce document, les validations Web
dans Docker et la fermeture manuelle vérifiée de l'issue historique `#2`.
