# Inventaire des exigences de référence

## Objet et limites

Ce document constitue le registre d'entrée de la traçabilité My Happy Wallet.
Il inventorie les exigences explicites des documents disponibles au 9 août 2026,
sans évaluer leur couverture, leur priorité ni leur appartenance au MVP. Ces
qualifications relèvent des étapes de matrice et de validation produit suivantes.

Le cahier des charges primaire n'est pas présent dans le workspace autorisé. Le
backlog de coordination est donc la source fonctionnelle normalisée disponible.
Cette limite interdit de déclarer l'inventaire exhaustif par rapport au document
primaire ; elle est conservée comme anomalie de source `GAP-SRC-01` jusqu'à ce
que le propriétaire du produit fournisse ou référence une copie versionnée.

## Registre des sources

| ID     | Source                                                 | Rôle                                                     | État lors de l'inventaire                    |
| ------ | ------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------- |
| SRC-01 | Work Item GitLab frontend `M00-01`, IID 4              | Objectif et critères du présent inventaire               | Disponible en ligne                          |
| SRC-02 | `agent-workspace/docs/agent/BACKLOG.md`                | Besoins fonctionnels, UX, PWA, qualité et exploitation   | Disponible dans le workspace de coordination |
| SRC-03 | `agent-workspace/docs/agent/ARCHITECTURE.md`           | Contraintes d'architecture, de session et de plateformes | Disponible dans le workspace de coordination |
| SRC-04 | `agent-workspace/docs/agent/ADR-001-CROSS-PLATFORM.md` | Décision Web et mobile native                            | Disponible dans le workspace de coordination |
| SRC-05 | [`testing-strategy.md`](testing-strategy.md)           | Outillage et stratégie de test frontend                  | Versionné dans ce dépôt                      |
| SRC-06 | [`ci-cd.md`](ci-cd.md)                                 | Qualité, livraison Web et retour arrière                 | Versionné dans ce dépôt                      |
| SRC-07 | [`../mobile/README.md`](../mobile/README.md)           | Configuration et session mobile                          | Versionné dans ce dépôt                      |
| SRC-08 | [`../mobile/docs/ci-cd.md`](../mobile/docs/ci-cd.md)   | Qualité, signatures et publication mobile                | Versionné dans ce dépôt                      |
| SRC-09 | Cahier des charges primaire historique                 | Autorité produit d'origine                               | Non localisé (`GAP-SRC-01`)                  |
| SRC-10 | [Wireframes Figma](https://www.figma.com/design/H3SgTwXZrsAh9nlp0SsGgV/CDA-Chef-d-oeuvre?node-id=403-33767&m=dev) | Parcours, navigation et hiérarchie de l'information | Contexte vérifié par MCP le 9 août 2026 |
| SRC-11 | [Moodboard Figma](https://www.figma.com/design/H3SgTwXZrsAh9nlp0SsGgV/CDA-Chef-d-oeuvre?node-id=353-27068&m=dev) | Direction et cohérence visuelles | Contexte vérifié par MCP le 9 août 2026 |

Les chemins `agent-workspace/...` sont relatifs à la racine du workspace My
Happy Wallet et non à ce dépôt Git. Les exigences ci-dessous en conservent une
copie textuelle autonome afin que le registre reste lisible depuis un clone du
frontend seul.

Le statut et les règles d'usage des sources Figma sont détaillés dans
[`ux-design-references.md`](ux-design-references.md). Elles orientent la
conception, mais ne remplacent ni les exigences versionnées ni les critères
d'acceptation d'une Work Item.

## Règles d'identification

- Un identifiant désigne une seule capacité ou contrainte durable.
- `FUNC` couvre le comportement métier, `PLAT` les plateformes, `UX`
  l'expérience, `SEC` la sécurité, `QUAL` la qualité et `OPS` l'exploitation.
- Une source indique l'origine de l'exigence, pas une preuve d'implémentation.
- Aucun statut de réalisation n'est déduit dans cet inventaire.
- Une modification de sens conserve l'identifiant et ajoute une note datée ; une
  nouvelle exigence reçoit un nouvel identifiant.

## Exigences fonctionnelles

| ID                 | Exigence normalisée                                                                     | Source         |
| ------------------ | --------------------------------------------------------------------------------------- | -------------- |
| FUNC-ACCOUNT-01    | Un visiteur peut créer un compte utilisateur.                                           | SRC-02         |
| FUNC-ACCOUNT-02    | Un utilisateur peut confirmer son compte au moyen du lien ou du jeton reçu.             | SRC-02         |
| FUNC-ACCOUNT-03    | Un utilisateur confirmé peut se connecter.                                              | SRC-02         |
| FUNC-ACCOUNT-04    | Une session valide peut être renouvelée sans nouvelle saisie des identifiants.          | SRC-02, SRC-03 |
| FUNC-ACCOUNT-05    | Un utilisateur peut se déconnecter et révoquer la session concernée.                    | SRC-02, SRC-03 |
| FUNC-ACCOUNT-06    | Un utilisateur peut demander puis terminer une réinitialisation de mot de passe.        | SRC-02         |
| FUNC-ACCOUNT-07    | Un utilisateur authentifié peut supprimer son compte.                                   | SRC-02         |
| FUNC-ACCOUNT-08    | Un utilisateur authentifié peut consulter et gérer son profil.                          | SRC-02         |
| FUNC-ADMIN-01      | Un administrateur dispose d'un accès réservé à l'administration.                        | SRC-02         |
| FUNC-ADMIN-02      | Un administrateur autorisé peut consulter la liste des utilisateurs.                    | SRC-02         |
| FUNC-ADMIN-03      | La liste d'administration n'expose aucune donnée d'authentification sensible.           | SRC-02         |
| FUNC-BUDGET-01     | Un utilisateur peut créer, consulter, modifier et supprimer ses charges fixes.          | SRC-02         |
| FUNC-BUDGET-02     | Un utilisateur peut créer, consulter, modifier et supprimer ses revenus fixes.          | SRC-02         |
| FUNC-OPERATION-01  | Un utilisateur peut gérer des opérations financières ponctuelles.                       | SRC-02         |
| FUNC-OPERATION-02  | Une opération ponctuelle peut être classée dans une catégorie.                          | SRC-02         |
| FUNC-CALENDAR-01   | Un utilisateur peut gérer des événements mensuels.                                      | SRC-02         |
| FUNC-CALENDAR-02   | Les événements sont consultables dans un calendrier.                                    | SRC-02         |
| FUNC-GOAL-01       | Un utilisateur peut gérer un objectif financier avec une date prévisionnelle.           | SRC-02         |
| FUNC-RAV-01        | L'application calcule et affiche le reste à vivre réel.                                 | SRC-02, SRC-03 |
| FUNC-RAV-02        | L'application permet de simuler un reste à vivre fictif sans le confondre avec le réel. | SRC-02, SRC-03 |
| FUNC-RAV-03        | Le reste à vivre est consultable selon des vues mensuelle, hebdomadaire et journalière. | SRC-02         |
| FUNC-ENGAGEMENT-01 | L'application peut notifier l'utilisateur d'un événement pertinent.                     | SRC-02         |
| FUNC-ENGAGEMENT-02 | L'application peut afficher des encouragements liés au suivi budgétaire.                | SRC-02         |
| FUNC-REPORTING-01  | L'application présente des graphiques budgétaires.                                      | SRC-02         |

## Exigences de plateformes et d'expérience

| ID      | Exigence normalisée                                                                                     | Source                 |
| ------- | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| PLAT-01 | React/Vite reste l'application Web de référence.                                                        | SRC-03, SRC-04         |
| PLAT-02 | L'interface Web est utilisable sur mobile, tablette et ordinateur.                                      | SRC-02, SRC-04         |
| PLAT-03 | Une PWA Web est installable sur Safari iPhone, Chrome Android et ordinateur.                            | SRC-02                 |
| PLAT-04 | L'application Android/iOS durable est une application React Native avec Expo distincte du frontend Web. | SRC-03, SRC-04, SRC-07 |
| PLAT-05 | La parité de chaque capacité doit être qualifiée séparément pour le Web, la PWA et le mobile natif.     | SRC-02                 |
| UX-01   | La navigation s'adapte à la largeur et au mode d'interaction de l'écran.                                | SRC-02, SRC-10         |
| UX-02   | Les états de chargement, d'erreur et de succès sont explicites et cohérents.                            | SRC-02, SRC-10         |
| UX-03   | Les messages utilisateur emploient une terminologie cohérente.                                          | SRC-02, SRC-10, SRC-11 |
| UX-04   | Les formulaires sont compacts, utilisables au clavier et accessibles.                                   | SRC-02, SRC-10         |
| UX-05   | Une suppression exige une confirmation claire avant l'action irréversible.                              | SRC-02, SRC-10         |
| UX-06   | Les vues mensuelle, hebdomadaire et journalière du reste à vivre restent lisibles.                      | SRC-02, SRC-10         |
| UX-07   | L'absence de charges ou de revenus produit un état vide non ambigu.                                     | SRC-02, SRC-10         |

## Exigences de sécurité et de confidentialité

| ID     | Exigence normalisée                                                                                    | Source                 |
| ------ | ------------------------------------------------------------------------------------------------------ | ---------------------- |
| SEC-01 | Aucun secret n'est embarqué dans un bundle Web ou mobile.                                              | SRC-04, SRC-07, SRC-08 |
| SEC-02 | Seule une configuration publique telle que l'origine de l'API peut utiliser le préfixe `EXPO_PUBLIC_`. | SRC-04, SRC-07, SRC-08 |
| SEC-03 | Le Web conserve un transport de session par cookies sécurisés et ne réutilise pas le coffre natif.     | SRC-02, SRC-03         |
| SEC-04 | Le mobile natif transporte ses sessions sans cookie sur HTTPS.                                         | SRC-03                 |
| SEC-05 | Le coffre natif persiste uniquement le refresh token dans le stockage sécurisé de l'appareil.          | SRC-03, SRC-07         |
| SEC-06 | L'access token et le profil utilisateur ne sont pas persistés dans le coffre natif.                    | SRC-03, SRC-07         |
| SEC-07 | La PWA ne met en cache ni API, ni authentification, ni jeton, ni donnée financière.                    | SRC-02                 |
| SEC-08 | Le mode hors ligne n'affiche aucune donnée utilisateur provenant d'une session précédente.             | SRC-02                 |
| SEC-09 | Les clés de signature, certificats, profils et jetons de publication restent hors de Git.              | SRC-06, SRC-08         |

## Exigences de qualité et d'exploitation

| ID      | Exigence normalisée                                                                                                  | Source                         |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| QUAL-01 | Les règles de domaine, services, composants critiques et parcours principaux disposent de tests automatisés adaptés. | SRC-02, SRC-05                 |
| QUAL-02 | Les parcours critiques disposent de tests de navigation, formulaire, responsive et bout en bout.                     | SRC-02, SRC-05                 |
| QUAL-03 | Chaque dépôt exécute format, lint, type-check, tests et build avant livraison.                                       | SRC-02, SRC-05, SRC-06, SRC-08 |
| QUAL-04 | Le typage strict est appliqué au backend et au mobile, puis introduit progressivement dans le Web historique.        | SRC-02, SRC-07                 |
| QUAL-05 | La documentation décrit les prérequis, commandes, résultats attendus, erreurs usuelles et retours arrière.           | SRC-01, SRC-06, SRC-08         |
| QUAL-06 | Les responsabilités domaine, application, infrastructure et présentation restent séparées.                           | SRC-02, SRC-03                 |
| OPS-01  | La PWA versionne son service worker et maîtrise l'activation de ses mises à jour.                                    | SRC-02                         |
| OPS-02  | La PWA met uniquement en cache le shell et les ressources statiques versionnées.                                     | SRC-02                         |
| OPS-03  | Les mises à jour PWA, retours en ligne, invalidations de cache et retours arrière sont testés.                       | SRC-02                         |
| OPS-04  | Un artefact Web validé est déployé depuis `main` avec bascule atomique et healthcheck.                               | SRC-06                         |
| OPS-05  | Un échec de healthcheck Web restaure la release précédemment active.                                                 | SRC-06                         |
| OPS-06  | GitLab CI valide le mobile sans lancer automatiquement de build EAS payant.                                          | SRC-08                         |
| OPS-07  | Les builds et soumissions Android/iOS restent manuels jusqu'à validation des comptes, signatures et quotas.          | SRC-08                         |
| OPS-08  | Une recette sur appareil réel précède chaque soumission mobile en store.                                             | SRC-08                         |
| OPS-09  | Android peut être construit sous Linux ; iOS exige macOS/Xcode ou un service distant tel qu'EAS.                     | SRC-04                         |

## Anomalies et cas limites de source

| ID         | Cas                                                                         | Traitement attendu                                                                                     |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| GAP-SRC-01 | Le cahier des charges primaire n'est pas localisé.                          | Ne pas déclarer l'inventaire exhaustif ; demander une source versionnée lors de la validation produit. |
| GAP-SRC-02 | Deux sources emploient des formulations différentes pour une même capacité. | Conserver une exigence normalisée et toutes les références, sans inventer de règle plus précise.       |
| GAP-SRC-03 | Une source décrit une implémentation constatée plutôt qu'un besoin.         | La conserver comme contexte, sans en déduire un statut de couverture.                                  |
| GAP-SRC-04 | Une exigence mélange plusieurs plateformes.                                 | Conserver le besoin métier ici et qualifier chaque plateforme dans la future matrice.                  |
| GAP-SRC-05 | Une exigence nouvelle n'a aucune source durable.                            | Ne pas l'ajouter de mémoire ; créer ou référencer d'abord la décision ou la Work Item qui l'autorise.  |

## Procédure de maintenance et de vérification

### Prérequis

- travailler depuis la racine du workspace My Happy Wallet ;
- disposer du dépôt frontend et des documents `agent-workspace` au même niveau ;
- exécuter les commandes Node uniquement dans `agent-frontend-node` ;
- ne jamais introduire de secret ou de valeur d'environnement réelle.

### Contrôles documentaires

Depuis `my-happy-wallet-frontend` :

```bash
test -f docs/requirements-inventory.md
grep -E '^\| (FUNC|PLAT|UX|SEC|QUAL|OPS)-' docs/requirements-inventory.md \
  | cut -d'|' -f2 | tr -d ' ' | sort | uniq -d
grep -Ec '^\| (FUNC|PLAT|UX|SEC|QUAL|OPS)-' docs/requirements-inventory.md
```

Le premier contrôle ne produit aucune sortie et retourne `0`. Le contrôle des
doublons ne produit aucune sortie. Le comptage retourne `60` pour cette version.
Relire ensuite chaque chemin du registre et rapprocher les formulations de leur
source avant d'accepter une modification.

### Validation du dépôt

Depuis la racine du workspace :

```bash
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend && npm run format && npm run lint && npm run type-check && npm test && npm run build'
```

La commande attendue se termine avec le code `0`, sans erreur Prettier, ESLint,
TypeScript/Vite, Vitest ou build. Elle protège le dépôt contre une régression
collatérale ; elle ne prouve pas la couverture fonctionnelle des exigences.

### Diagnostic des erreurs usuelles

- Chemin `agent-workspace` absent : utiliser le registre autonome pour lecture,
  mais reporter toute modification d'exigence jusqu'au rétablissement des sources.
- Identifiant dupliqué : fusionner les formulations réellement équivalentes ou
  attribuer un nouvel identifiant à la capacité distincte.
- Source contradictoire : ne pas arbitrer silencieusement ; consigner l'écart et
  le soumettre à la validation produit prévue.
- Commande Docker indisponible : vérifier que le service
  `agent-frontend-node` est démarré et que la commande est lancée depuis la
  racine du workspace.
- Validation applicative déjà en échec : conserver le diagnostic séparé et ne
  pas masquer l'échec dans une modification documentaire.

### Retour arrière

Avant commit, restaurer uniquement ce livrable avec :

```bash
git restore docs/requirements-inventory.md
```

Après commit, créer un commit inverse dédié ; ne pas réécrire l'historique
partagé. Une suppression de l'inventaire doit également remettre `M00-02` en
attente, car sa matrice dépend des identifiants définis ici.
