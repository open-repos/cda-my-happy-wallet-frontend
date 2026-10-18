# Dépendances runtime Web — ticket #64

## Décision et périmètre

L'audit npm du 18 octobre 2026 signalait huit dépendances runtime vulnérables :
quatre modérées et quatre élevées. Le nouvel arbre verrouillé n'en signale aucune
avec `npm audit --omit=dev` à cette date. Ce résultat concerne les avis connus
par npm, sans prétendre prouver l'absence de toute vulnérabilité du produit.
Le correctif Vitest associé ramène aussi l’audit complet à zéro avis connu.

| Bibliothèque                | Avant              | Après           | Raison                                                                                      |
| --------------------------- | ------------------ | --------------- | ------------------------------------------------------------------------------------------- |
| React / React DOM           | 17.0.2             | 18.3.1          | Prérequis du routeur corrigé ; démarrage par createRoot.                                    |
| React Router DOM            | 6.2.2              | 7.18.4          | Correctif de redirection à partir de 7.18, sans correctif v6 publié pour cet avis.          |
| Axios                       | 0.26.1             | 1.20.0          | Correctifs de configuration, en-têtes et transport ; même contrat des services applicatifs. |
| Redux Toolkit / React Redux | 1.8.0 / 7.2.6      | 1.9.7 / 7.2.9   | Compatibilité React 18 sans migration de la gestion d'état.                                 |
| Formik / Semantic UI React  | 2.2.9 / 2.1.2      | 2.4.9 / 2.1.5   | Correctifs compatibles avec les formulaires et React 18.                                    |
| Styled Components / dotenv  | 5.3.5 / 16.0.0     | 5.3.11 / 16.6.1 | Mises à jour compatibles des branches existantes.                                           |
| Vitest                      | 4.1.10             | 4.1.12          | Correctif de sécurité de l’outillage de validation (mocker).                                |
| Testing Library React / DOM | 12.1.5 / transitif | 16.3.3 / 10.4.1 | Outillage nécessaire pour tester le moteur React 18.                                        |

Le lockfile renouvelle aussi les transitives signalées : Babel runtime,
follow-redirects, lodash, lodash-es et picomatch. Les versions directes de Vite, Playwright et Font Awesome restent celles du
socle précédent. Vitest et son mocker reçoivent le correctif de leur branche 4,
pour supprimer les deux avis modérés trouvés dans l’audit complet de l’outillage.
Le catalogue d'icônes et les fichiers mobiles ne sont pas modifiés.

La résolution a été refaite avec des pairs compatibles et vérifiée par `npm ci`,
sans `--force` ni `--legacy-peer-deps`. Les dépendances directes hors périmètre ont
été conservées à leur version verrouillée pendant la résolution. Les versions
modifiées sont exactes dans package.json et reproductibles via le lockfile.
React Router reste utilisé en mode déclaratif (BrowserRouter, Routes, Route) ;
aucun SSR, loader serveur ou nouveau protocole d'authentification n'est introduit.

## Menaces et limites de confiance

- **Chaîne de dépendances** : les paquets npm fournissent du code exécuté dans le
  navigateur ou pendant le build. Le lockfile, l'installation propre et la revue
  du diff encadrent cette frontière. `npm run audit:runtime` bloque la CI dès
  qu'un avis runtime connu de niveau faible ou supérieur est présent ; aucune
  exception ou exclusion d'avis n'est ajoutée.
- **Navigation** : les routes du produit sont locales. Un chemin provenant d'une
  entrée non fiable ne doit pas devenir une navigation externe à cause de
  séparateurs mélangés. Les tests couvrent la normalisation du chemin, le refus
  des navigations externes et une navigation interne ordinaire. La bibliothèque
  ne remplace pas la validation d'URLs externes volontairement proposées par une
  future fonctionnalité.
- **HTTP et session** : l'API, ses réponses et les données saisies sont des
  frontières distinctes. Les services gardent leurs chemins et payloads ; le
  bearer et les cookies suivent l'intercepteur existant. Les tests avec le vrai
  Axios vérifient AxiosHeaders, renouvellement partagé, blocage en cas d'échec,
  conservation des décimales sous forme de chaîne et credentials explicites.
  Les contrats API et les contrôles d'autorisation restent du ressort du backend.
- **Secrets et données privées** : les tests utilisent des sentinelles synthétiques,
  un adapter local ou la stack jetable. Aucun cookie/JWT réel, corps financier
  réel, export de storage ou trace navigateur n'est versionné. L'audit npm ne
  reçoit que l'arbre de dépendances. Les risques XSS et le stockage de session
  préexistant ne sont pas présentés comme résolus par cette mise à jour.
- **Portée des avis** : certains avis Axios concernent son adapter Node ou des
  options non utilisées dans cette SPA ; cela réduit leur exposition directe,
  sans justifier de conserver une branche vulnérable. L'audit runtime ne couvre
  pas les dépendances propres à Expo, les services backend ou la configuration
  de production.

La migration rend explicite le transfert du focus du lien « Aller au contenu
principal ». Son activation évite une transition de hash qui pouvait remonter
un formulaire et perdre le focus avec le nouveau routeur ; les six scénarios
clavier des formulaires publics et le test du lien protègent ce comportement.

## Vérification et livraison

```bash
npm ci
npm run audit:runtime
npm run format
npm run lint
npm run test:api-response
npm run test:api-thunk
npm run test:rav
npm run test:refresh-token
npm run type-check
npm test
npm run build
npm run test:e2e:runner
npm run test:e2e:stack
npm run test:visual
npm run test:e2e
```

`type-check` reste l'alias Vite existant. La CI utilise Node 22 (le routeur exige
Node 20 ou supérieur), le Chromium verrouillé et les références du ticket #62,
sans réécriture automatique des PNG. Les 24 parcours réels vérifient connexion,
erreurs, renouvellement de cookie, opérations et événements. Les validations
mobiles continuent de protéger l'autre application dans son propre arbre.

Aucune variable nouvelle, migration ou modification de données. Déployer reste
une action manuelle distincte. Pour revenir en arrière, révoquer l'ensemble de
la PR (package.json, lockfile, entrée React et tests associés), exécuter npm ci
et toutes les validations ; ce retour réintroduit les avis connus et doit rester
transitoire. Ne pas mélanger l'ancien lockfile avec la nouvelle entrée React.

## Sources primaires

- [Avis du mainteneur React Router GHSA-wrjc-x8rr-h8h6](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6)
- [Correctif des séparateurs React Router](https://github.com/remix-run/react-router/pull/15176)
- [Notes de version Axios 1.20.0](https://github.com/axios/axios/releases/tag/v1.20.0)
- [Avis du mainteneur Vitest GHSA-82fw-gwwq-j7x9](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9)
- [Référence React createRoot](https://react.dev/reference/react-dom/client/createRoot)
- [Installation de Testing Library React](https://github.com/testing-library/react-testing-library#installation)

Les exigences de pairs et de moteur ont aussi été vérifiées dans les métadonnées
npm de React Router DOM 7.18.4, React Redux 7.2.9 et Testing Library React 16.3.3.
