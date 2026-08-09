# Migration du backlog et archivage de la roadmap historique

## Objet

Ce document trace la migration suivie par la Work Item `M00-05`. Le nouveau
backlog multi-projets est déjà publié dans GitLab ; cette procédure vérifie que
son import est complet et rejouable, puis confirme que le catalogue publié et
versionné remplace la roadmap historique comme source opérationnelle.

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

La nouvelle roadmap est donc importée. L'issue `#2` est une référence historique,
pas une dépendance de la roadmap normalisée. Elle reste consultable et ne doit
pas être rattachée artificiellement à la milestone `M00`.

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

## Conservation des anciennes issues

La décision de cadrage impose de conserver les anciennes issues comme références
historiques. L'issue `#2` reste donc ouverte et inchangée : elle n'appartient pas
à `M00` et sa fermeture n'est pas un critère de cette migration.

L'archivage visé par `M00-05` est l'enregistrement versionné des 92 spécifications
dans les dossiers `published/`, matérialisé dans le dépôt de gestion au commit
`744aabb`. Ce mécanisme préserve le contenu proposé et rend le nouveau catalogue
auditable sans supprimer les anciennes références GitLab.

Le rollback consiste à continuer d'utiliser les anciennes issues comme références
et à ne pas appliquer un nouveau lot si le dry-run propose des créations
inattendues. Aucune mutation de `#2` n'est nécessaire pour ce retour arrière.

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

`M00-05` peut être fermée après le commit de ce document et les validations Web
dans Docker. Les anciennes issues restent consultables mais ne pilotent plus
l'ordre de livraison.
