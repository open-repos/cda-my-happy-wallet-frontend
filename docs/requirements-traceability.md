# Matrice de traçabilité multi-plateforme

## Pourquoi cette matrice existe

L'[inventaire des exigences](requirements-inventory.md) répond à la question
« que demande la documentation ? ». Cette matrice ajoute la question « où
peut-on vérifier chaque demande ? » sur les axes backend, Web, mobile natif,
PWA, tests et documentation.

Une preuve est un chemin de code, de test ou de documentation observable. Elle
ne suffit pas à conclure qu'une exigence est réalisée : une page vide, un test
partiel ou un contrat backend sans interface restent des preuves utiles, mais
peuvent conduire à un classement `partielle` ou `absente`. Ce classement est
réservé à `M00-03`.

## Règles de lecture

- `PV` est le marqueur historique « priorité à valider » utilisé lors de la
  construction de la matrice. La décision `M00-04` l'a remplacé par le registre
  P0/P1/P2 de [`mvp-scope-decision.md`](mvp-scope-decision.md), qui fait
  autorité sans dupliquer la qualification dans 60 lignes de preuves.
- `NM` signifie « aucune preuve cartographiée dans le périmètre analysé ». Cela
  ne signifie pas encore « exigence absente ».
- Une cellule contient un ou plusieurs identifiants du catalogue de preuves
  ci-dessous. Elle indique où commencer la vérification, pas que tous les cas
  d'acceptation sont couverts.
- Les dépendances sont des prérequis fonctionnels entre exigences. Elles ne
  remplacent pas les dépendances entre Work Items de la roadmap.
- Les preuves backend utilisent le préfixe `backend:` car elles appartiennent à
  l'autre dépôt et ne sont pas modifiées par cette Work Item frontend.

## Catalogue des preuves

### Backend

| ID            | Preuve vérifiable                                                                  |
| ------------- | ---------------------------------------------------------------------------------- |
| `BE-AUTH`     | `backend:src/routes/user.ts` et `backend:src/modules/user/useCases/`               |
| `BE-NATIVE`   | `backend:src/routes/nativeSession.ts` et `backend:src/modules/auth/nativeSession/` |
| `BE-SESSION`  | `backend:src/modules/auth/refreshSession/`, `renewSession/` et `logout.ts`         |
| `BE-ADMIN`    | Liste protégée et projection minimale dans `backend:src/routes/user.ts`            |
| `BE-BUDGET`   | `backend:src/routes/operationsFixes.ts` et `backend:src/modules/operationsFixes/`  |
| `BE-RAV`      | `backend:src/modules/operationsFixes/services/ResteAVivreCalculator.ts`            |
| `BE-SECURITY` | `backend:src/middlewares/`, configuration CORS, limites HTTP et rate limiters      |

### Web et mobile natif

| ID           | Preuve vérifiable                                                                      |
| ------------ | -------------------------------------------------------------------------------------- |
| `WEB-AUTH`   | `src/js/pages/{Login,Register,ForgotPassword,NewPassword}.jsx`, slice et services auth |
| `WEB-SHELL`  | `src/js/App.jsx`, `ProtectedLayout.jsx`, `SideBar.jsx` et styles associés              |
| `WEB-BUDGET` | Page, slice, hook, service et formulaires sous `OperationsFixes`                       |
| `WEB-RAV`    | `CalculRaV.jsx`, `useResteAVivre.js` et composants Home                                |
| `WEB-PAGES`  | Routes et pages `Calendrier`, `Objectifs`, `ListeOperations` et `Profil`               |
| `MOB-AUTH`   | `mobile/src/features/auth/`, `mobile/src/infrastructure/{auth,http,session}/`          |
| `MOB-SHELL`  | Routes protégées et écrans sous `mobile/app/`                                          |
| `MOB-CONFIG` | `mobile/app.json`, `mobile/eas.json`, configuration d'environnement et SecureStore     |

### Tests et documentation

| ID             | Preuve vérifiable                                                              |
| -------------- | ------------------------------------------------------------------------------ |
| `T-BE-AUTH`    | Tests backend `test/modules/auth/`, `user/` et caractérisation API             |
| `T-BE-BUDGET`  | Tests backend `operationsFixes/`, repositories et caractérisation API          |
| `T-WEB-AUTH`   | `test/vitest/authForms.test.jsx`, `protectedRoutes.test.jsx` et refresh token  |
| `T-WEB-BUDGET` | Tests Vitest des opérations fixes, hooks, Home et reste à vivre                |
| `T-WEB-E2E`    | Tests Playwright de navigation publique et responsive                          |
| `T-MOB-AUTH`   | 31 tests mobiles autour des sessions, du coffre, du HTTP et de la présentation |
| `T-CI`         | `.gitlab-ci.yml` : qualité, tests et builds Web/mobile                         |
| `DOC-REQ`      | `docs/requirements-inventory.md` et le présent document                        |
| `DOC-WEB`      | `docs/testing-strategy.md` et `docs/ci-cd.md`                                  |
| `DOC-MOB`      | `mobile/README.md` et `mobile/docs/ci-cd.md`                                   |
| `DOC-ARCH`     | `agent-workspace/docs/agent/ARCHITECTURE.md` et ADR cross-platform             |

## Matrice fonctionnelle

| Exigence             | Source         | Priorité | Critère observable minimal                                                                 | Dépendances                    | Backend               | Web        | Mobile   | PWA | Tests                             | Documentation     |
| -------------------- | -------------- | -------- | ------------------------------------------------------------------------------------------ | ------------------------------ | --------------------- | ---------- | -------- | --- | --------------------------------- | ----------------- |
| `FUNC-ACCOUNT-01`    | SRC-02         | PV       | Une inscription valide crée un compte ; une entrée invalide produit une erreur maîtrisée.  | —                              | BE-AUTH               | WEB-AUTH   | NM       | NM  | T-BE-AUTH, T-WEB-AUTH             | DOC-REQ           |
| `FUNC-ACCOUNT-02`    | SRC-02         | PV       | Un lien valide confirme le compte une seule fois ; un lien invalide ou expiré est refusé.  | FUNC-ACCOUNT-01                | BE-AUTH               | WEB-AUTH   | NM       | NM  | T-BE-AUTH                         | DOC-REQ           |
| `FUNC-ACCOUNT-03`    | SRC-02         | PV       | Des identifiants valides ouvrent une session ; les autres reçoivent une réponse générique. | FUNC-ACCOUNT-02                | BE-AUTH, BE-NATIVE    | WEB-AUTH   | MOB-AUTH | NM  | T-BE-AUTH, T-WEB-AUTH, T-MOB-AUTH | DOC-REQ, DOC-MOB  |
| `FUNC-ACCOUNT-04`    | SRC-02, SRC-03 | PV       | Une session renouvelable obtient de nouveaux jetons sans doubler une rotation concurrente. | FUNC-ACCOUNT-03                | BE-SESSION, BE-NATIVE | WEB-AUTH   | MOB-AUTH | NM  | T-BE-AUTH, T-WEB-AUTH, T-MOB-AUTH | DOC-ARCH, DOC-MOB |
| `FUNC-ACCOUNT-05`    | SRC-02, SRC-03 | PV       | La déconnexion révoque la session ciblée et ramène le client à l'état anonyme.             | FUNC-ACCOUNT-03                | BE-SESSION, BE-NATIVE | WEB-AUTH   | MOB-AUTH | NM  | T-BE-AUTH, T-MOB-AUTH             | DOC-ARCH, DOC-MOB |
| `FUNC-ACCOUNT-06`    | SRC-02         | PV       | La demande reste non énumérante ; seul un jeton valide permet de changer le mot de passe.  | FUNC-ACCOUNT-01                | BE-AUTH               | WEB-AUTH   | NM       | NM  | T-BE-AUTH, T-WEB-AUTH             | DOC-REQ           |
| `FUNC-ACCOUNT-07`    | SRC-02         | PV       | Un utilisateur authentifié peut supprimer son propre compte après confirmation.            | FUNC-ACCOUNT-03                | BE-AUTH               | WEB-PAGES  | NM       | NM  | T-BE-AUTH                         | DOC-REQ           |
| `FUNC-ACCOUNT-08`    | SRC-02         | PV       | L'utilisateur consulte et modifie uniquement les données autorisées de son profil.         | FUNC-ACCOUNT-03                | NM                    | WEB-PAGES  | NM       | NM  | NM                                | DOC-REQ           |
| `FUNC-ADMIN-01`      | SRC-02         | PV       | Une route administrative refuse tout utilisateur non administrateur.                       | FUNC-ACCOUNT-03                | BE-ADMIN              | NM         | NM       | NM  | T-BE-AUTH                         | DOC-REQ           |
| `FUNC-ADMIN-02`      | SRC-02         | PV       | Un administrateur autorisé obtient une liste d'utilisateurs paginable et exploitable.      | FUNC-ADMIN-01                  | BE-ADMIN              | NM         | NM       | NM  | T-BE-AUTH                         | DOC-REQ           |
| `FUNC-ADMIN-03`      | SRC-02         | PV       | La réponse admin exclut mot de passe, jetons et données internes sensibles.                | FUNC-ADMIN-02                  | BE-ADMIN              | NM         | NM       | NM  | T-BE-AUTH                         | DOC-REQ           |
| `FUNC-BUDGET-01`     | SRC-02         | PV       | L'utilisateur crée, lit, modifie et supprime uniquement ses charges fixes valides.         | FUNC-ACCOUNT-03                | BE-BUDGET             | WEB-BUDGET | NM       | NM  | T-BE-BUDGET, T-WEB-BUDGET         | DOC-REQ           |
| `FUNC-BUDGET-02`     | SRC-02         | PV       | L'utilisateur crée, lit, modifie et supprime uniquement ses revenus fixes valides.         | FUNC-ACCOUNT-03                | BE-BUDGET             | WEB-BUDGET | NM       | NM  | T-BE-BUDGET, T-WEB-BUDGET         | DOC-REQ           |
| `FUNC-OPERATION-01`  | SRC-02         | PV       | L'utilisateur gère des opérations ponctuelles distinctes des opérations fixes.             | FUNC-ACCOUNT-03                | NM                    | WEB-PAGES  | NM       | NM  | NM                                | DOC-REQ           |
| `FUNC-OPERATION-02`  | SRC-02         | PV       | Chaque opération ponctuelle peut référencer une catégorie valide et filtrable.             | FUNC-OPERATION-01              | NM                    | WEB-PAGES  | NM       | NM  | NM                                | DOC-REQ           |
| `FUNC-CALENDAR-01`   | SRC-02         | PV       | L'utilisateur crée, consulte, modifie et supprime ses événements mensuels.                 | FUNC-ACCOUNT-03                | NM                    | WEB-PAGES  | NM       | NM  | NM                                | DOC-REQ           |
| `FUNC-CALENDAR-02`   | SRC-02         | PV       | Le calendrier affiche les événements à la bonne date et gère les périodes vides.           | FUNC-CALENDAR-01               | NM                    | WEB-PAGES  | NM       | NM  | NM                                | DOC-REQ           |
| `FUNC-GOAL-01`       | SRC-02         | PV       | Un objectif financier possède montant, échéance et progression cohérents.                  | FUNC-ACCOUNT-03                | NM                    | WEB-PAGES  | NM       | NM  | NM                                | DOC-REQ           |
| `FUNC-RAV-01`        | SRC-02, SRC-03 | PV       | Le reste à vivre réel est calculé avec les charges et revenus de la période choisie.       | FUNC-BUDGET-01, FUNC-BUDGET-02 | BE-RAV                | WEB-RAV    | NM       | NM  | T-BE-BUDGET, T-WEB-BUDGET         | DOC-REQ           |
| `FUNC-RAV-02`        | SRC-02, SRC-03 | PV       | Une simulation fictive n'altère pas les données réelles et reste identifiable.             | FUNC-RAV-01                    | BE-RAV                | WEB-RAV    | NM       | NM  | T-BE-BUDGET                       | DOC-REQ           |
| `FUNC-RAV-03`        | SRC-02         | PV       | Les vues jour, semaine et mois produisent des périodes et résultats cohérents.             | FUNC-RAV-01                    | BE-RAV                | WEB-RAV    | NM       | NM  | T-BE-BUDGET, T-WEB-BUDGET         | DOC-REQ           |
| `FUNC-ENGAGEMENT-01` | SRC-02         | PV       | Une notification pertinente est émise une fois, au bon utilisateur et au bon moment.       | FUNC-ACCOUNT-03                | NM                    | NM         | NM       | NM  | NM                                | DOC-REQ           |
| `FUNC-ENGAGEMENT-02` | SRC-02         | PV       | Un encouragement est contextualisé, non trompeur et désactivable.                          | FUNC-RAV-01                    | NM                    | NM         | NM       | NM  | NM                                | DOC-REQ           |
| `FUNC-REPORTING-01`  | SRC-02         | PV       | Les graphiques représentent fidèlement les données et restent lisibles sans données.       | FUNC-RAV-01                    | NM                    | NM         | NM       | NM  | NM                                | DOC-REQ           |

## Matrice plateformes et expérience

| Exigence  | Source                 | Priorité | Critère observable minimal                                                                   | Dépendances                    | Backend   | Web                  | Mobile                | PWA | Tests                   | Documentation     |
| --------- | ---------------------- | -------- | -------------------------------------------------------------------------------------------- | ------------------------------ | --------- | -------------------- | --------------------- | --- | ----------------------- | ----------------- |
| `PLAT-01` | SRC-03, SRC-04         | PV       | Le build React/Vite reste déployable comme canal Web de référence.                           | —                              | NM        | WEB-SHELL            | NM                    | NM  | T-CI                    | DOC-ARCH, DOC-WEB |
| `PLAT-02` | SRC-02, SRC-04         | PV       | Les parcours Web critiques restent utilisables aux largeurs mobile, tablette et bureau.      | PLAT-01                        | NM        | WEB-SHELL            | NM                    | NM  | T-WEB-E2E               | DOC-ARCH          |
| `PLAT-03` | SRC-02                 | PV       | Le Web est installable et fonctionne en mode standalone sur les trois familles de terminaux. | PLAT-01                        | NM        | NM                   | NM                    | NM  | NM                      | DOC-REQ           |
| `PLAT-04` | SRC-03, SRC-04, SRC-07 | PV       | Le projet Expo produit une application distincte et navigable sur Android/iOS.               | —                              | BE-NATIVE | NM                   | MOB-SHELL, MOB-CONFIG | NM  | T-MOB-AUTH, T-CI        | DOC-ARCH, DOC-MOB |
| `PLAT-05` | SRC-02                 | PV       | Chaque exigence possède une preuve ou `NM` pour Web, PWA et mobile natif.                    | PLAT-01, PLAT-03, PLAT-04      | NM        | NM                   | NM                    | NM  | NM                      | DOC-REQ           |
| `UX-01`   | SRC-02                 | PV       | La navigation reste visible, actionnable et sans débordement selon l'écran.                  | PLAT-02                        | NM        | WEB-SHELL            | MOB-SHELL             | NM  | T-WEB-E2E               | DOC-REQ           |
| `UX-02`   | SRC-02                 | PV       | Toute action asynchrone importante expose chargement, succès ou erreur compréhensible.       | —                              | NM        | WEB-AUTH, WEB-BUDGET | MOB-SHELL             | NM  | T-WEB-AUTH, T-MOB-AUTH  | DOC-REQ           |
| `UX-03`   | SRC-02                 | PV       | Une même situation utilise un libellé cohérent sur les interfaces concernées.                | —                              | NM        | WEB-AUTH             | MOB-SHELL             | NM  | T-WEB-AUTH, T-MOB-AUTH  | DOC-REQ           |
| `UX-04`   | SRC-02                 | PV       | Les formulaires sont utilisables au clavier, nommés et lisibles sans zoom forcé.             | PLAT-02                        | NM        | WEB-AUTH, WEB-BUDGET | MOB-SHELL             | NM  | T-WEB-AUTH, T-WEB-E2E   | DOC-REQ           |
| `UX-05`   | SRC-02                 | PV       | Une action destructive demande une confirmation explicite et permet l'annulation.            | FUNC-ACCOUNT-07                | NM        | WEB-PAGES            | MOB-SHELL             | NM  | NM                      | DOC-REQ           |
| `UX-06`   | SRC-02                 | PV       | Les trois périodes du reste à vivre restent distinguables et lisibles.                       | FUNC-RAV-03                    | NM        | WEB-RAV              | NM                    | NM  | T-WEB-BUDGET, T-WEB-E2E | DOC-REQ           |
| `UX-07`   | SRC-02                 | PV       | Une liste vide explique l'absence de données sans afficher une erreur technique.             | FUNC-BUDGET-01, FUNC-BUDGET-02 | NM        | WEB-BUDGET           | NM                    | NM  | T-WEB-BUDGET            | DOC-REQ           |

## Matrice sécurité et confidentialité

| Exigence | Source                 | Priorité | Critère observable minimal                                                        | Dépendances     | Backend     | Web       | Mobile               | PWA | Tests                 | Documentation     |
| -------- | ---------------------- | -------- | --------------------------------------------------------------------------------- | --------------- | ----------- | --------- | -------------------- | --- | --------------------- | ----------------- |
| `SEC-01` | SRC-04, SRC-07, SRC-08 | PV       | Aucun secret réel n'apparaît dans le dépôt, le bundle ou les variables publiques. | —               | BE-SECURITY | WEB-SHELL | MOB-CONFIG           | NM  | T-CI                  | DOC-MOB, DOC-WEB  |
| `SEC-02` | SRC-04, SRC-07, SRC-08 | PV       | Les variables `EXPO_PUBLIC_*` ne contiennent que des valeurs publiables.          | SEC-01          | NM          | NM        | MOB-CONFIG           | NM  | T-CI                  | DOC-MOB           |
| `SEC-03` | SRC-02, SRC-03         | PV       | Le Web renouvelle sa session par cookies sécurisés sans coffre natif.             | FUNC-ACCOUNT-04 | BE-SESSION  | WEB-AUTH  | NM                   | NM  | T-BE-AUTH, T-WEB-AUTH | DOC-ARCH          |
| `SEC-04` | SRC-03                 | PV       | Les sessions natives utilisent le corps HTTPS et jamais un cookie Web implicite.  | FUNC-ACCOUNT-04 | BE-NATIVE   | NM        | MOB-AUTH             | NM  | T-BE-AUTH, T-MOB-AUTH | DOC-ARCH, DOC-MOB |
| `SEC-05` | SRC-03, SRC-07         | PV       | SecureStore persiste uniquement le refresh token sous une clé dédiée.             | SEC-04          | NM          | NM        | MOB-AUTH, MOB-CONFIG | NM  | T-MOB-AUTH            | DOC-MOB           |
| `SEC-06` | SRC-03, SRC-07         | PV       | Access token et profil disparaissent avec le processus mobile.                    | SEC-05          | NM          | NM        | MOB-AUTH             | NM  | T-MOB-AUTH            | DOC-MOB           |
| `SEC-07` | SRC-02                 | PV       | Aucun cache PWA ne stocke réponse API, authentification, jeton ou finance.        | PLAT-03         | NM          | NM        | NM                   | NM  | NM                    | DOC-REQ           |
| `SEC-08` | SRC-02                 | PV       | Hors ligne, aucune donnée d'une session précédente n'est restituée.               | PLAT-03, SEC-07 | NM          | NM        | NM                   | NM  | NM                    | DOC-REQ           |
| `SEC-09` | SRC-06, SRC-08         | PV       | Git ne contient aucune clé, signature ou credential de publication.               | SEC-01          | NM          | NM        | MOB-CONFIG           | NM  | T-CI                  | DOC-WEB, DOC-MOB  |

## Matrice qualité et exploitation

| Exigence  | Source                         | Priorité | Critère observable minimal                                                                                 | Dépendances    | Backend                | Web                      | Mobile     | PWA | Tests                 | Documentation             |
| --------- | ------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------- | -------------- | ---------------------- | ------------------------ | ---------- | --- | --------------------- | ------------------------- |
| `QUAL-01` | SRC-02, SRC-05                 | PV       | Les règles et parcours critiques ont des tests déterministes proportionnés au risque.                      | —              | T-BE-AUTH, T-BE-BUDGET | T-WEB-AUTH, T-WEB-BUDGET | T-MOB-AUTH | NM  | T-CI                  | DOC-WEB, DOC-MOB          |
| `QUAL-02` | SRC-02, SRC-05                 | PV       | Navigation, formulaires, responsive et parcours principaux sont rejouables automatiquement.                | QUAL-01        | T-BE-AUTH              | T-WEB-AUTH, T-WEB-E2E    | T-MOB-AUTH | NM  | T-CI                  | DOC-WEB                   |
| `QUAL-03` | SRC-02, SRC-05, SRC-06, SRC-08 | PV       | Format, lint, type-check, tests et build bloquent une livraison en cas d'échec.                            | QUAL-01        | NM                     | T-CI                     | T-CI       | NM  | T-CI                  | DOC-WEB, DOC-MOB          |
| `QUAL-04` | SRC-02, SRC-07                 | PV       | Le backend et le mobile compilent strictement ; le Web progresse sans régression.                          | —              | DOC-ARCH               | WEB-SHELL                | MOB-AUTH   | NM  | T-CI                  | DOC-ARCH, DOC-MOB         |
| `QUAL-05` | SRC-01, SRC-06, SRC-08         | PV       | Une personne sans contexte exécute les commandes et diagnostique les erreurs courantes.                    | —              | NM                     | DOC-WEB                  | DOC-MOB    | NM  | NM                    | DOC-REQ, DOC-WEB, DOC-MOB |
| `QUAL-06` | SRC-02, SRC-03                 | PV       | Domaine, application, infrastructure et présentation ont des dépendances orientées vers des ports stables. | —              | DOC-ARCH               | WEB-SHELL                | MOB-AUTH   | NM  | T-BE-AUTH, T-MOB-AUTH | DOC-ARCH                  |
| `OPS-01`  | SRC-02                         | PV       | Un service worker versionné signale et active ses mises à jour de manière contrôlée.                       | PLAT-03        | NM                     | NM                       | NM         | NM  | NM                    | DOC-REQ                   |
| `OPS-02`  | SRC-02                         | PV       | Seuls le shell et les assets statiques versionnés sont disponibles depuis le cache.                        | OPS-01, SEC-07 | NM                     | NM                       | NM         | NM  | NM                    | DOC-REQ                   |
| `OPS-03`  | SRC-02                         | PV       | Mise à jour, retour réseau, invalidation et rollback PWA sont reproductibles.                              | OPS-01, OPS-02 | NM                     | NM                       | NM         | NM  | NM                    | DOC-REQ                   |
| `OPS-04`  | SRC-06                         | PV       | Un artefact Web validé est déployé atomiquement depuis `main`.                                             | QUAL-03        | NM                     | T-CI                     | NM         | NM  | T-CI                  | DOC-WEB                   |
| `OPS-05`  | SRC-06                         | PV       | Un healthcheck invalide restaure automatiquement la release Web précédente.                                | OPS-04         | NM                     | T-CI                     | NM         | NM  | T-CI                  | DOC-WEB                   |
| `OPS-06`  | SRC-08                         | PV       | La CI mobile valide localement sans appeler EAS automatiquement.                                           | QUAL-03        | NM                     | NM                       | T-CI       | NM  | T-CI                  | DOC-MOB                   |
| `OPS-07`  | SRC-08                         | PV       | Les builds et soumissions EAS exigent une action autorisée et des credentials externes.                    | OPS-06         | NM                     | NM                       | MOB-CONFIG | NM  | NM                    | DOC-MOB                   |
| `OPS-08`  | SRC-08                         | PV       | Le binaire exact est validé sur appareil réel avant soumission en store.                                   | OPS-07         | NM                     | NM                       | NM         | NM  | NM                    | DOC-MOB                   |
| `OPS-09`  | SRC-04                         | PV       | Android est constructible sous Linux ; iOS utilise macOS/Xcode ou EAS.                                     | PLAT-04        | NM                     | NM                       | MOB-CONFIG | NM  | NM                    | DOC-ARCH, DOC-MOB         |

## Ce que la matrice met immédiatement en évidence

Sans attribuer encore de statut final, la cartographie distingue trois cas :

1. plusieurs parcours de compte, budget fixe, reste à vivre et session native
   possèdent des preuves croisées de code et de tests ;
2. certaines routes Web existent pour profil, calendrier, objectifs et
   opérations ponctuelles, mais aucune preuve backend ou test associée n'est
   encore cartographiée ;
3. la PWA, les notifications, encouragements et graphiques ne disposent d'aucune
   preuve d'implémentation cartographiée.

Ces observations servent d'entrée à `M00-03`. Elles ne ferment aucune Work Item
et ne valident pas le périmètre MVP, décision réservée à `M00-04`.

La classification technique issue de cette matrice est disponible dans
[`requirements-coverage.md`](requirements-coverage.md) et la décision produit
dans [`mvp-scope-decision.md`](mvp-scope-decision.md). Ces documents conservent
la séparation entre preuves observées, statut de couverture et périmètre.

## Procédure de maintenance et de vérification

### Prérequis

- travailler depuis la racine du dépôt frontend ;
- disposer du dépôt backend voisin pour vérifier les références `backend:` ;
- mettre à jour d'abord `requirements-inventory.md` lorsqu'une exigence change ;
- ne jamais remplacer `PV` ou classer une exigence sans décision traçable.

### Contrôles structurels

```bash
test -f docs/requirements-inventory.md
test -f docs/requirements-traceability.md

grep -E '^\| (FUNC|PLAT|UX|SEC|QUAL|OPS)-' docs/requirements-inventory.md \
  | sed -E 's/^\| ([^ ]+).*/\1/' | sort > /tmp/inventory.ids
grep -E '^\| `(FUNC|PLAT|UX|SEC|QUAL|OPS)-' docs/requirements-traceability.md \
  | sed -E 's/^\| `([^`]+)`.*/\1/' | sort > /tmp/matrix.ids
diff -u /tmp/inventory.ids /tmp/matrix.ids

grep -E '^\| `(BE|WEB|MOB|T|DOC)-' docs/requirements-traceability.md \
  | sed -E 's/^\| `([^`]+)`.*/\1/' | sort -u > /tmp/evidence-catalog.ids
grep -Eo '(BE|WEB|MOB|DOC)-[A-Z][A-Z0-9-]+|T-[A-Z][A-Z0-9-]+' \
  docs/requirements-traceability.md | sort -u > /tmp/evidence-used.ids
diff -u /tmp/evidence-catalog.ids /tmp/evidence-used.ids
```

Les deux sorties `diff` attendues sont vides : les 60 exigences apparaissent
exactement une fois dans les deux documents et les 26 preuves utilisées sont
toutes définies dans le catalogue.

### Validations du dépôt

Depuis la racine du workspace :

```bash
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend && npx prettier --check docs/requirements-traceability.md && npm run format && npm run lint && npm run type-check && npm test && npm run build'
```

La commande doit terminer avec le code `0`. Les tests et le build protègent
contre une régression collatérale, mais ne remplacent pas la revue des preuves.

### Diagnostics usuels

- Identifiant absent du `diff` : ajouter la ligne manquante dans la matrice ou
  corriger l'inventaire avant toute qualification.
- Preuve introuvable : remplacer la cellule par `NM` et ouvrir une action de
  recherche ; ne pas conserver un chemin supposé.
- Preuve ambiguë : conserver plusieurs identifiants et expliquer la limite lors
  du classement `M00-03`.
- Priorité contestée : laisser `PV` jusqu'à la validation produit `M00-04`.
- Dépôt backend indisponible : ne pas modifier les références `backend:` sans
  vérification dans une session disposant des deux dépôts.

### Retour arrière

Avant commit, restaurer uniquement le livrable avec :

```bash
git restore docs/requirements-traceability.md
```

Après commit, utiliser un commit inverse dédié. Une suppression de cette matrice
doit remettre `M00-03` en attente, car son classement dépend des 60 lignes.
