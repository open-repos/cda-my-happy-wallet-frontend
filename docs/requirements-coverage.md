# Statuts de couverture des exigences

## Objet

Ce document classe les 60 exigences de
[`requirements-inventory.md`](requirements-inventory.md) à partir des preuves de
[`requirements-traceability.md`](requirements-traceability.md). Il répond à la
question « quel niveau de couverture les preuves actuelles permettent-elles de
défendre ? ».

Le classement reste technique et conservateur. Il ne décide ni de la priorité,
ni de l'appartenance au MVP, ni de l'abandon d'un besoin. Ces arbitrages sont
réservés à la validation humaine `M00-04`.

La décision humaine est désormais consignée dans
[`mvp-scope-decision.md`](mvp-scope-decision.md). Le présent document conserve
le statut technique indépendamment du périmètre produit retenu.

## Règles de classement

| Statut           | Règle utilisée                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `réalisée`       | Le critère observable possède une implémentation cohérente et des tests suffisants sur son périmètre actuellement démontré. |
| `partielle`      | Une implémentation ou une preuve existe, mais un canal, un cas important, un test ou une validation externe manque.         |
| `absente`        | Aucune implémentation n'est cartographiée ; une page vide ou la seule documentation ne suffit pas.                          |
| `abandonnée`     | Une décision humaine explicite renonce durablement à l'exigence.                                                            |
| `hors périmètre` | Une décision humaine explicite place l'exigence hors du produit ou de la version considérée.                                |

Une page ou une configuration prouve qu'un chantier existe, pas qu'il est
terminé. À l'inverse, l'absence de preuve cartographiée n'affirme pas que le code
n'existe nulle part : elle impose une recherche ou une implémentation avant de
revendiquer la couverture.

## Synthèse

| Statut           | Nombre | Lecture                                                                       |
| ---------------- | -----: | ----------------------------------------------------------------------------- |
| `réalisée`       |     21 | Capacités ou contraintes étayées par code et tests sur le périmètre démontré. |
| `partielle`      |     28 | Base existante, mais preuve, canal, qualité ou validation encore incomplète.  |
| `absente`        |     11 | Aucun comportement d'implémentation cartographié.                             |
| `abandonnée`     |      0 | Aucune décision d'abandon enregistrée.                                        |
| `hors périmètre` |      0 | En attente de l'arbitrage humain `M00-04`.                                    |

## Couverture fonctionnelle

| Exigence             | Statut    | Justification fondée sur les preuves                                       | Écart principal                                                                    |
| -------------------- | --------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `FUNC-ACCOUNT-01`    | partielle | Backend, formulaire Web et tests de création existent.                     | Parcours email et validation réelle de bout en bout non démontrés.                 |
| `FUNC-ACCOUNT-02`    | partielle | Endpoint de confirmation et logique backend cartographiés.                 | Expiration, réutilisation et parcours client/email restent à valider manuellement. |
| `FUNC-ACCOUNT-03`    | réalisée  | Login backend, Web et mobile couvert par tests unitaires et d'intégration. | Recette réelle Android/production encore externe au statut fonctionnel démontré.   |
| `FUNC-ACCOUNT-04`    | réalisée  | Rotation Web/native, concurrence mono-vol et refus de session sont testés. | Aucune lacune bloquante dans le périmètre automatisé actuel.                       |
| `FUNC-ACCOUNT-05`    | réalisée  | Révocation serveur, déconnexion native et nettoyage local sont testés.     | Recette sur appareil réel à conserver avant livraison.                             |
| `FUNC-ACCOUNT-06`    | partielle | Backend sécurisé, formulaires Web et tests existent.                       | Délivrabilité email et parcours réel complet non validés.                          |
| `FUNC-ACCOUNT-07`    | partielle | Suppression protégée et test API existent.                                 | Confirmation UX et couverture client explicite insuffisantes.                      |
| `FUNC-ACCOUNT-08`    | partielle | Une page Profil Web est routée.                                            | Contrat backend de profil et tests de consultation/modification non cartographiés. |
| `FUNC-ADMIN-01`      | réalisée  | Route backend protégée par authentification et rôle administrateur.        | Interface d'administration non requise par le critère minimal actuel.              |
| `FUNC-ADMIN-02`      | partielle | La liste backend existe pour un administrateur.                            | Pagination, interface cliente et tests dédiés restent incomplets.                  |
| `FUNC-ADMIN-03`      | réalisée  | La projection backend sélectionne explicitement les champs non sensibles.  | Maintenir un test de non-régression à chaque évolution du DTO.                     |
| `FUNC-BUDGET-01`     | réalisée  | CRUD charges backend/Web et tests API/composants sont cartographiés.       | Recette utilisateur finale toujours utile avant livraison.                         |
| `FUNC-BUDGET-02`     | réalisée  | CRUD revenus backend/Web et tests API/composants sont cartographiés.       | Recette utilisateur finale toujours utile avant livraison.                         |
| `FUNC-OPERATION-01`  | partielle | Une route et une page Web d'opérations sont présentes.                     | Domaine, API ponctuelle, persistance et tests dédiés non cartographiés.            |
| `FUNC-OPERATION-02`  | absente   | Aucune implémentation de catégories n'est cartographiée.                   | Concevoir domaine, persistance, API et interfaces.                                 |
| `FUNC-CALENDAR-01`   | partielle | Une page Calendrier Web est présente.                                      | CRUD événement, persistance, API et tests absents de la cartographie.              |
| `FUNC-CALENDAR-02`   | partielle | La route Web du calendrier existe.                                         | Affichage fonctionnel daté, états vides et tests non démontrés.                    |
| `FUNC-GOAL-01`       | partielle | Une page Objectifs Web est présente.                                       | Domaine, API, progression et tests non cartographiés.                              |
| `FUNC-RAV-01`        | réalisée  | Calcul backend/Web et tests de période réelle sont présents.               | Surveiller la cohérence des règles dupliquées entre couches.                       |
| `FUNC-RAV-02`        | partielle | Le calculateur fournit une base de simulation.                             | Isolation explicite du fictif, persistance et tests de non-altération manquent.    |
| `FUNC-RAV-03`        | partielle | Sélecteur et calculs de périodes existent côté Web.                        | DTO backend par période et couverture complète jour/semaine/mois insuffisants.     |
| `FUNC-ENGAGEMENT-01` | absente   | Aucune preuve de notification n'est cartographiée.                         | Définir événements, canaux, consentement et tests.                                 |
| `FUNC-ENGAGEMENT-02` | absente   | Aucun moteur d'encouragement n'est cartographié.                           | Définir règles produit et possibilité de désactivation.                            |
| `FUNC-REPORTING-01`  | absente   | Aucun graphique budgétaire fonctionnel n'est cartographié.                 | Définir projections, composants accessibles et cas sans données.                   |

## Couverture plateformes et expérience

| Exigence  | Statut    | Justification fondée sur les preuves                                         | Écart principal                                                               |
| --------- | --------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `PLAT-01` | réalisée  | Le frontend React/Vite est construit, testé et déployable par CI.            | Maintenir le canal Web comme référence lors des évolutions natives.           |
| `PLAT-02` | réalisée  | Layout responsive et tests Playwright sur plusieurs largeurs sont présents.  | Recette appareils réels à renouveler pour les parcours nouveaux.              |
| `PLAT-03` | absente   | Aucun manifeste ni service worker PWA n'est cartographié.                    | Implémenter le chantier PWA complet avant test d'installation.                |
| `PLAT-04` | partielle | Application Expo, navigation, auth, CI et configuration EAS existent.        | Validation Android réelle et build/signature iOS restent externes.            |
| `PLAT-05` | partielle | La matrice expose désormais Web, mobile et PWA pour chaque exigence.         | Les statuts par canal et le périmètre cible doivent être validés humainement. |
| `UX-01`   | réalisée  | Navigation protégée, shell responsive et tests de débordement sont présents. | Étendre les tests aux futurs écrans mobiles fonctionnels.                     |
| `UX-02`   | partielle | Plusieurs écrans Web/mobile exposent chargement et erreur.                   | Harmonisation systématique sur tous les parcours non démontrée.               |
| `UX-03`   | partielle | Messages auth Web/mobile et erreurs génériques sont testés.                  | Vocabulaire transversal du produit non audité.                                |
| `UX-04`   | partielle | Formulaires Web/mobile et premiers tests d'accessibilité existent.           | Audit clavier, lecteur d'écran, focus et zoom incomplet.                      |
| `UX-05`   | partielle | Des actions destructives et sorties existent.                                | Confirmation et annulation cohérentes non prouvées pour chaque suppression.   |
| `UX-06`   | partielle | Les périodes du reste à vivre sont représentées côté Web.                    | Lisibilité et cohérence des trois périodes pas entièrement testées.           |
| `UX-07`   | réalisée  | États vides charges/revenus couverts par composants et tests Home.           | Conserver ce contrat lors de l'ajout des opérations ponctuelles.              |

## Couverture sécurité et confidentialité

| Exigence | Statut    | Justification fondée sur les preuves                                           | Écart principal                                                           |
| -------- | --------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `SEC-01` | partielle | Documentation, variables publiques séparées et règles CI existent.             | Aucun scan automatisé de secrets n'est cartographié.                      |
| `SEC-02` | réalisée  | Configuration et documentation limitent `EXPO_PUBLIC_*` aux valeurs publiques. | Maintenir une revue de configuration à chaque nouveau paramètre.          |
| `SEC-03` | réalisée  | Cookies Web, rotation backend et client refresh sont implémentés et testés.    | Recette navigateur de production toujours requise avant livraison.        |
| `SEC-04` | réalisée  | Contrat JSON natif, gateway HTTPS et tests d'API sont présents.                | Refuser toute origine HTTP hors environnements explicitement locaux.      |
| `SEC-05` | réalisée  | SecureStore persiste uniquement le refresh token et possède des tests dédiés.  | Validation appareil réel à maintenir.                                     |
| `SEC-06` | réalisée  | Access token et profil restent en mémoire ; coffre éphémère Web testé.         | Surveiller toute future persistance d'état mobile.                        |
| `SEC-07` | absente   | Aucun cache PWA n'est implémenté.                                              | Définir et tester une politique réseau uniquement pour API/auth.          |
| `SEC-08` | absente   | Aucun écran hors ligne PWA neutre n'est implémenté.                            | Concevoir le repli sans donnée de session précédente.                     |
| `SEC-09` | partielle | Procédures CI/EAS interdisent les credentials dans Git.                        | Ajouter détection automatisée et vérifier l'historique avant publication. |

## Couverture qualité et exploitation

| Exigence  | Statut    | Justification fondée sur les preuves                                             | Écart principal                                                        |
| --------- | --------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `QUAL-01` | partielle | Suites backend, Web et mobile couvrent les domaines déjà développés.             | Plusieurs domaines futurs n'ont logiquement aucun test.                |
| `QUAL-02` | partielle | Navigation, formulaires et responsive Web sont testés ; auth mobile aussi.       | E2E authentifié complet et parcours métier mobile absents.             |
| `QUAL-03` | réalisée  | CI et commandes locales exécutent format, lint, type-check, tests et builds.     | Conserver l'alignement entre documentation et pipeline.                |
| `QUAL-04` | partielle | Backend et mobile sont TypeScript ; mobile utilise le mode strict.               | Frontend Web historique reste majoritairement JavaScript.              |
| `QUAL-05` | partielle | Documentation CI, tests, mobile et traçabilité possède commandes et diagnostics. | Runbooks fonctionnels de plusieurs domaines restent à produire.        |
| `QUAL-06` | partielle | Les couches backend et surtout mobile utilisent ports et adapters.               | Web historique reste fortement couplé à Redux, Axios et composants.    |
| `OPS-01`  | absente   | Aucun service worker versionné n'est cartographié.                               | Définir stratégie d'activation et rollback PWA.                        |
| `OPS-02`  | absente   | Aucun cache de shell PWA n'est cartographié.                                     | Implémenter la liste blanche des seuls assets statiques.               |
| `OPS-03`  | absente   | Aucun test de mise à jour ou rollback PWA n'est cartographié.                    | Ajouter scénarios réseau, invalidation et retour arrière.              |
| `OPS-04`  | réalisée  | Pipeline Web construit un artefact et déploie atomiquement depuis `main`.        | Maintenir la protection de branche et l'environnement production.      |
| `OPS-05`  | réalisée  | Script et pipeline restaurent la release précédente après healthcheck invalide.  | Tester périodiquement le rollback sur une release de recette.          |
| `OPS-06`  | réalisée  | CI mobile valide sans appel automatique à EAS.                                   | Garder les builds distants hors des pipelines ordinaires.              |
| `OPS-07`  | partielle | Profils EAS et procédure manuelle sont documentés et versionnés.                 | Credentials, signatures et quotas doivent être validés extérieurement. |
| `OPS-08`  | absente   | Aucune preuve de recette du binaire exact sur appareil réel.                     | Réaliser et tracer une recette avant chaque soumission.                |
| `OPS-09`  | partielle | Stratégie Linux/Android et EAS/iOS est documentée et configurée.                 | Build iOS réel bloqué par compte Apple et credentials.                 |

## Lecture pour la validation humaine M00-04

Les décisions suivantes ne peuvent pas être déduites du code :

1. quelles exigences `partielle` sont suffisantes pour un MVP ;
2. quelles exigences `absente` doivent entrer dans le MVP ou être reportées ;
3. quels canaux sont obligatoires au lancement : Web, PWA, Android et/ou iOS ;
4. si une exigence doit être explicitement `abandonnée` ou `hors périmètre` ;
5. quelles priorités remplacent les marqueurs `PV` de la matrice.

La validation doit consigner ces cinq arbitrages sans transformer
automatiquement une preuve technique en décision produit.

## Vérification reproductible

Depuis la racine du dépôt frontend :

```bash
grep -E '^\| (FUNC|PLAT|UX|SEC|QUAL|OPS)-' docs/requirements-inventory.md \
  | sed -E 's/^\| ([^ ]+).*/\1/' | sort > /tmp/inventory.ids
grep -E '^\| `(FUNC|PLAT|UX|SEC|QUAL|OPS)-' docs/requirements-coverage.md \
  | sed -E 's/^\| `([^`]+)`.*/\1/' | sort > /tmp/coverage.ids
diff -u /tmp/inventory.ids /tmp/coverage.ids

grep -E '^\| `(FUNC|PLAT|UX|SEC|QUAL|OPS)-' docs/requirements-coverage.md \
  | awk -F '|' '{ status=$3; gsub(/^[[:space:]]+|[[:space:]]+$/, "", status); print status }' \
  | sort | uniq -c
```

Le premier `diff` doit être vide. Le second contrôle doit retourner exactement
`11 absente`, `28 partielle` et `21 réalisée`. Aucun autre statut n'est attendu
avant la validation humaine.

Valider ensuite le dépôt dans Docker :

```bash
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend && npx prettier --check docs/requirements-coverage.md docs/requirements-traceability.md && npm run format && npm run lint && npm run type-check && npm test && npm run build'
```

## Diagnostics et retour arrière

- Compte différent de 60 : ajouter l'exigence manquante ou retirer le doublon.
- Statut sans justification : revenir à la matrice et citer la preuve ou `NM`.
- Désaccord produit : ne pas réécrire silencieusement le statut ; enregistrer
  l'arbitrage `M00-04` et sa justification.
- Nouvelle preuve : mettre à jour la matrice avant de reclasser l'exigence.
- Retour arrière avant commit :
  `git restore docs/requirements-coverage.md docs/requirements-traceability.md`.
- Après commit : créer un commit inverse dédié, sans réécrire l'historique.
