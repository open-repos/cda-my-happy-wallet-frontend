# Inventaire UI Web et mobile

## But et périmètre

Cet inventaire constitue le point de départ reproductible de `M02-01`. Il décrit
l'interface présente au 9 août 2026, sans modifier son comportement. Le Web
React/Vite est la référence applicative historique ; le mobile Expo fournit déjà
un socle d'authentification, mais pas encore la parité fonctionnelle.

Les wireframes Figma `403:33767` et le moodboard `353:27068` ont été relus avec
le MCP Figma et le compte `andria.capai@gmail.com`. Ils montrent notamment les
parcours d'authentification, budget fixe, reste à vivre, objectifs, calendrier,
opérations et profil, ainsi que les variantes claires et sombres. Ils orientent
l'inventaire, sans remplacer les règles métier ni les critères d'acceptation.

## Comment reproduire l'inventaire

Prérequis : dépôt propre sur le commit étudié et services de
`docker-compose.agent.yml` démarrés depuis la racine du workspace.

```bash
find src/css -maxdepth 1 -type f | sort
find src/js/pages src/js/components -type f | sort
find mobile/app mobile/src -type f \
  \( -name '*.ts' -o -name '*.tsx' \) | sort
rg -n --glob '*.{css,js,jsx,ts,tsx}' \
  '#[0-9A-Fa-f]{3,8}|rgba?\(|font-family|fontFamily|isLoading|isError|isSuccess|ActivityIndicator|@media' \
  src mobile/app mobile/src
```

À cette date, les sorties attendues sont 16 feuilles CSS, 11 pages Web, 15
composants Web et 5 écrans ou layouts Expo. La recherche brute relève 24
déclarations de propriétés CSS, 36 occurrences de couleurs codées dans le CSS
et 44 dans le TypeScript mobile. Ces nombres sont des indicateurs de migration,
pas des objectifs : commentaires, répétitions et valeurs strictement locales y
sont inclus.

## Catalogue existant

| Zone | Éléments observables | Styles et dépendances |
| --- | --- | --- |
| Shell Web | `App`, `ProtectedLayout`, `SideBar`, `RequireAuth` | `App.css`, styled-components dans `SideBar`, React Router |
| Auth Web | login, inscription, oubli et nouveau mot de passe | `Auth.css` plus quatre feuilles presque dupliquées, Formik/Yup, toast, `Spinner` |
| Budget fixe | formulaires, cartes et listes charges/revenus, calcul RaV | `FormControl.css`, `Operations.css`, Semantic UI Table, Font Awesome |
| Tableau de bord | état initial, RaV, périodes mois/semaine/jour, résumés vides | `Home.css`, `CaseRaV.css`, `SegmentedControl.css` |
| Fonctions à compléter | calendrier, objectifs/événements, opérations ponctuelles, profil | pages et conteneurs présents, contenu encore réduit à un libellé |
| Mobile | bootstrap de session, connexion, tableau de bord/healthcheck | `StyleSheet` local par écran, Expo Router, Ionicons |

Les assets mélangent PNG, SVG et Font Awesome. Plusieurs images n'ont pas de
texte alternatif sur le Web. Aucun composant générique partagé ne formalise
encore bouton, champ, carte, message d'état ou typographie entre les écrans.

## Styles et décisions visuelles

`src/css/App.css` est aujourd'hui la source implicite de la palette Web. Ses
variables portent principalement des noms liés à leur valeur (`--orange`,
`--dark-main-color`) et mélangent couleur, layout et filtres d'icônes. Les
feuilles de page les réutilisent, mais conservent des couleurs, ombres, rayons et
espacements en dur. Les quatre formulaires d'authentification dupliquent leurs
styles interactifs.

La typographie globale Web est `Oswald` sans chargement local identifié, alors
que le moodboard retient Barlow pour les titres et Open Sans pour le contenu et
les actions. Le mobile utilise les polices système et une palette bleue/verte
distincte (`#275DAD`, `#147D64`, fonds `#F5F7FA`). Il ne consomme aucune valeur
du Web.

Les breakpoints Web sont cohérents mais dispersés : tablette sous `1024px` et
mobile sous `768px`. `App.css` centralise les offsets du shell ; plusieurs
feuilles répètent encore directement `@media (max-width: 767px)`. React Native
s'appuie sur des largeurs maximales et le flex, sans contrat de breakpoint.

## États d'interface

| Parcours | Chargement | Vide | Succès/nominal | Erreur |
| --- | --- | --- | --- | --- |
| Auth Web | spinner plein écran | sans objet | navigation, confirmation ou toast | toast, parfois message anglais |
| Budget fixe Web | texte orange dans la liste | tableau absent ; état initial dédié sur Home | tables, cartes et RaV | chaîne brute `Error chargement operations fixes` |
| Home Web | dépend du chargement des opérations | `CaseOpFixeEmpty`, puis messages opérations/objectifs | `CaseShowRaV` et sélecteur de période | pas de panneau d'erreur propre au parcours |
| Pages Web restantes | non implémenté | non implémenté | libellé de page uniquement | non implémenté |
| Session mobile | écran de restauration avec indicateur | sans objet | navigation protégée | écran indisponible et action Réessayer |
| Connexion mobile | bouton désactivé et indicateur | sans objet | accès au groupe authentifié | message avec région live |
| Accueil mobile | healthcheck et déconnexion avec indicateur | pas encore de données budget | service disponible | service indisponible et Réessayer |

Les états existent donc sous plusieurs formes non harmonisées : toast, page
complète, texte libre, absence de rendu ou carte dédiée. L'accessibilité est
mieux explicitée sur le mobile (`accessibilityRole`, région live) que sur le Web.
La future harmonisation devra annoncer les changements asynchrones et ne pas
transmettre succès ou erreur uniquement par la couleur.

## Écarts avec les références et ordre de migration

1. Créer la source de vérité et les adaptateurs de tokens dans `M02-02` ; le
   pilote recommandé est la connexion mobile/Web ou une petite carte d'état.
2. Remplacer les couleurs par rôle et rendre les thèmes clair, sombre et système
   indépendants des composants.
3. Charger Barlow et Open Sans de façon durable, avec piles de repli, puis
   migrer les titres et contenus par parcours.
4. Aligner les écrans mobiles d'authentification, le tableau de bord et la
   navigation dans `M02-03` à `M02-05`.
5. Unifier loading, vide, succès et erreur dans `M02-06`, puis couvrir les vues
   critiques visuellement dans `M02-07`.
6. Traiter séparément les dettes Web observées : images sans alternative,
   erreurs non structurées, contenu placeholder, attribut JSX `class` et styles
   d'authentification dupliqués.

Cette séquence évite une réécriture globale. Une valeur calculée, une dimension
propre à un asset ou une contrainte unique peut rester locale ; toute nouvelle
décision visuelle partagée doit passer par le design system après `M02-02`.

## Vérification, diagnostic et retour arrière

Le document est valide si les chemins existent, si les compteurs peuvent être
rejoués et si chaque état cité est retrouvable avec la commande `rg`. Un écart
de compteur après évolution normale du dépôt impose de dater et mettre à jour
l'inventaire, pas de restaurer artificiellement l'ancien nombre.

Après une modification documentaire, exécuter la chaîne Web dans Docker :

```bash
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend && npm run format && npm run lint && npm run type-check && npm test && npm run build'
```

En cas d'erreur de chemin ou de constat, corriger ce document dans le même
commit. Le retour arrière consiste à annuler uniquement le commit documentaire
de `M02-01` ; aucun état applicatif ni aucune donnée ne sont concernés.

## Références

- [`ux-design-references.md`](ux-design-references.md)
- [`design-system-foundations.md`](design-system-foundations.md)
- `agent-workspace/docs/agent/FIGMA_UX_CONTEXT.md`
