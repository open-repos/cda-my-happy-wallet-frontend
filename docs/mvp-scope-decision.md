# Décision de périmètre MVP et post-MVP

## Statut de la décision

- Work Item : `M00-04`
- Décision humaine : validée le 9 août 2026
- Canal du MVP : Web responsive uniquement
- Autorité de classement : ce document remplace les marqueurs provisoires `PV`
  de la matrice de traçabilité
- Abandon ou exclusion définitive : aucune

Cette décision sépare le périmètre produit de la couverture technique observée
dans [`requirements-coverage.md`](requirements-coverage.md). Une exigence peut
donc appartenir au MVP tout en restant `partielle` ou `absente` : elle représente
alors du travail nécessaire avant la sortie du MVP.

## Contexte

Le socle Web couvre déjà l'authentification, les revenus et charges récurrents,
ainsi que le calcul du reste à vivre. Des bases mobiles existent, mais les
fonctions métier ne sont pas au même niveau que sur le Web. La PWA, les builds
signés et les validations sur appareils dépendent encore de travaux ou de
services externes.

Le cahier des charges primaire reste introuvable (`GAP-SRC-01`). La décision
s'appuie donc sur l'inventaire versionné, la matrice de preuves, la
classification technique et les réponses explicites du propriétaire du
produit.

La conception des écrans peut aussi s'appuyer sur les wireframes et le
moodboard Figma recensés dans
[`ux-design-references.md`](ux-design-references.md). Les wireframes orientent
les parcours du MVP Web et le moodboard sa cohérence visuelle, sans remplacer
les règles métier, l'accessibilité ni les critères d'acceptation versionnés.

## Options examinées

1. **MVP Web minimal** : compte, revenus, charges et reste à vivre. Cette option
   réduisait le délai, mais ne couvrait pas suffisamment l'usage quotidien
   attendu d'un portefeuille budgétaire.
2. **MVP Web enrichi** : socle minimal complété par les opérations ponctuelles,
   catégories, calendrier, objectifs et graphiques. Cette option demande plus
   de travail, mais livre une proposition fonctionnelle cohérente.
3. **MVP multiplateforme** : Web, PWA et applications natives dès le lancement.
   Cette option augmentait fortement le coût, les validations externes et le
   risque de dispersion avant stabilisation des fonctions métier.

L'option 2 est retenue. Le Web responsive est le seul canal obligatoire au
lancement. Android, iOS et PWA restent dans la roadmap, sans engagement pour le
MVP.

## Fonctions retenues pour le MVP Web

Le MVP doit permettre :

- la création, confirmation et gestion du compte, la connexion, la récupération
  du mot de passe, la déconnexion et la suppression du compte ;
- la gestion du profil ;
- la gestion des revenus et charges récurrents ;
- la gestion des opérations ponctuelles et de leurs catégories ;
- la gestion d'événements dans un calendrier ;
- la gestion d'objectifs financiers et de leur progression ;
- le calcul réel et fictif du reste à vivre par jour, semaine et mois ;
- la consultation de graphiques budgétaires ;
- une expérience Web responsive, accessible, testée et exploitable.

Les notifications, encouragements, fonctions d'administration, PWA et
applications Android/iOS passent en post-MVP. Ils ne sont ni abandonnés ni hors
périmètre du produit.

## Registre des priorités et du périmètre

`P0` désigne le socle critique, `P1` les capacités nécessaires au MVP enrichi et
`P2` les capacités post-MVP. Le périmètre `MVP` regroupe donc `P0` et `P1`.

### Fonctionnel

| Exigences                                  | Priorité | Périmètre | Décision                                                            |
| ------------------------------------------ | -------- | --------- | ------------------------------------------------------------------- |
| `FUNC-ACCOUNT-01` à `FUNC-ACCOUNT-08`      | P0       | MVP       | Cycle de vie complet du compte Web.                                 |
| `FUNC-BUDGET-01`, `FUNC-BUDGET-02`         | P0       | MVP       | Revenus et charges récurrents indispensables au calcul.             |
| `FUNC-RAV-01` à `FUNC-RAV-03`              | P0       | MVP       | Valeur centrale du produit et ses trois périodes.                   |
| `FUNC-OPERATION-01`, `FUNC-OPERATION-02`   | P1       | MVP       | Opérations ponctuelles et catégories demandées pour le MVP enrichi. |
| `FUNC-CALENDAR-01`, `FUNC-CALENDAR-02`     | P1       | MVP       | Gestion et consultation des échéances.                              |
| `FUNC-GOAL-01`                             | P1       | MVP       | Objectifs financiers et progression.                                |
| `FUNC-REPORTING-01`                        | P1       | MVP       | Graphiques budgétaires lisibles, y compris sans données.            |
| `FUNC-ADMIN-01` à `FUNC-ADMIN-03`          | P2       | post-MVP  | Administration reportée sans abandon.                               |
| `FUNC-ENGAGEMENT-01`, `FUNC-ENGAGEMENT-02` | P2       | post-MVP  | Notifications et encouragements reportés.                           |

### Plateformes et expérience

| Exigences            | Priorité | Périmètre | Décision                                              |
| -------------------- | -------- | --------- | ----------------------------------------------------- |
| `PLAT-01`, `PLAT-02` | P0       | MVP       | Web React/Vite responsive, seul canal de lancement.   |
| `UX-01` à `UX-07`    | P1       | MVP       | Expérience cohérente, accessible et compréhensible.   |
| `PLAT-03`            | P2       | post-MVP  | Installation et comportement PWA reportés.            |
| `PLAT-04`            | P2       | post-MVP  | Applications Android/iOS reportées.                   |
| `PLAT-05`            | P2       | post-MVP  | Parité à réévaluer lors de chaque ouverture de canal. |

### Sécurité et confidentialité

| Exigences                     | Priorité | Périmètre | Décision                                                                               |
| ----------------------------- | -------- | --------- | -------------------------------------------------------------------------------------- |
| `SEC-01`, `SEC-03`            | P0       | MVP       | Absence de secret côté client et session Web sécurisée.                                |
| `SEC-02`, `SEC-04` à `SEC-09` | P2       | post-MVP  | Contraintes propres au mobile, à la PWA et aux signatures reportées avec leurs canaux. |

Les protections transversales déjà présentes restent maintenues même lorsque
leur canal est post-MVP. Le classement `P2` n'autorise pas une régression de
sécurité dans le code existant.

### Qualité et exploitation

| Exigences             | Priorité | Périmètre | Décision                                                                   |
| --------------------- | -------- | --------- | -------------------------------------------------------------------------- |
| `QUAL-01` à `QUAL-06` | P1       | MVP       | Tests, typage progressif, documentation et séparation des responsabilités. |
| `OPS-04`, `OPS-05`    | P0       | MVP       | Déploiement Web atomique, healthcheck et retour arrière.                   |
| `OPS-01` à `OPS-03`   | P2       | post-MVP  | Exploitation PWA reportée avec la PWA.                                     |
| `OPS-06` à `OPS-09`   | P2       | post-MVP  | Builds, signatures et recette mobile reportés avec le mobile.              |

## Conséquences sur la couverture

Le périmètre MVP contient 38 exigences : 19 en P0 et 19 en P1. À la date de la
décision, 14 sont `réalisée`, 22 `partielle` et 2 `absente`. Les deux exigences
MVP sans preuve d'implémentation sont les catégories d'opérations
(`FUNC-OPERATION-02`) et les graphiques (`FUNC-REPORTING-01`).

Le post-MVP contient 22 exigences : 7 sont déjà `réalisée`, 6 `partielle` et 9
`absente`. Une capacité post-MVP déjà réalisée ne doit pas être supprimée ; elle
reste maintenue, mais ne bloque pas la sortie du MVP Web.

Cette décision implique de réconcilier la roadmap existante : notamment, les
lots Android et PWA ne doivent plus être marqués comme bloquants pour le MVP
Web. Cette mise à jour relève de `M00-05` et ne modifie pas silencieusement les
Work Items dans la présente décision.

## Seuil de sortie du MVP

La sortie du MVP peut être validée uniquement lorsque :

1. toutes les exigences P0 et P1 sont implémentées ;
2. format, lint, type-check, tests et build passent dans Docker ;
3. les parcours Web essentiels passent de bout en bout ;
4. les emails réels et l'affichage responsive ont fait l'objet d'une validation
   manuelle tracée ;
5. aucun blocage critique de sécurité ou d'accessibilité ne reste ouvert.

## Inconnues et prochain contrôle humain

Les règles métier détaillées des catégories, événements, objectifs et
graphiques doivent encore être formalisées avant leur implémentation. La
délivrabilité des emails et la recette responsive dépendent d'une validation
externe. Le cahier des charges primaire doit toujours être retrouvé ou son
absence acceptée explicitement avant de revendiquer une exhaustivité historique.

Le prochain contrôle humain intervient après la réconciliation de la roadmap
par `M00-05`, puis à nouveau avant la déclaration de fin du MVP pour vérifier le
seuil de sortie ci-dessus sur l'artefact Web candidat.

## Maintenance

Toute modification de périmètre doit citer une nouvelle décision humaine datée.
Une évolution de la couverture technique met d'abord à jour la matrice et
`requirements-coverage.md`; elle ne change pas automatiquement la priorité ou
le périmètre définis ici.
