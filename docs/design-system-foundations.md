# Fondations du design system

## Objectif

Le design system doit fournir un vocabulaire visuel stable aux interfaces Web
et mobiles sans imposer une technologie de rendu commune. Il commence par des
tokens versionnés et accessibles, puis permet la convergence progressive des
composants. Il ne déclenche pas une réécriture globale de l'interface.

La Work Item `M02-02` porte ces fondations après l'inventaire `M02-01`. Les
interfaces Web nouvelles `M03-05`, `M04-04`, `M04-05` et `M05-05` doivent les
consommer au lieu d'introduire de nouvelles valeurs visuelles isolées.

## Architecture cible

Une source de vérité sérialisable et indépendante de React porte les tokens.
Elle produit ou alimente :

- des propriétés personnalisées CSS pour React/Vite ;
- des objets TypeScript typés pour React Native ;
- une documentation lisible avec rôle, valeur, thème et exemples d'usage.

Le Web ne devient pas la source du mobile et le mobile ne tente pas d'interpréter
des variables CSS. Les deux plateformes consomment le même contrat sémantique
avec des adaptateurs distincts.

## Taxonomie minimale

### Tokens primitifs

- palettes et niveaux de couleur ;
- familles, tailles, graisses et hauteurs de ligne typographiques ;
- grille d'espacement et tailles récurrentes ;
- bordures, rayons et ombres ;
- durées et courbes d'animation ;
- niveaux d'élévation ou de superposition.

### Tokens sémantiques

- fonds, surfaces et bordures ;
- textes principal, secondaire, discret et inversé ;
- actions primaire, secondaire, destructive et désactivée ;
- focus visible ;
- succès, information, avertissement et erreur ;
- données financières et séries de graphiques ;
- navigation, cartes, champs et contrôles.

Les noms décrivent un rôle (`--color-text-primary`) et non une valeur
(`--dark-green`). Les thèmes clair et sombre redéfinissent les tokens
sémantiques sans modifier les composants consommateurs.

Les breakpoints restent des constantes documentées ou des media queries : les
propriétés CSS ne peuvent pas être utilisées de manière fiable comme seuils de
media query. Une dimension unique et locale ne devient un token que si elle
exprime une décision répétée du système.

## Migration progressive

1. inventorier variables CSS, valeurs en dur, composants et états ;
2. rapprocher les valeurs du moodboard Figma et mesurer les contrastes ;
3. définir primitives, rôles sémantiques et thèmes ;
4. fournir les adaptateurs Web et React Native avec types et tests ;
5. migrer un petit parcours de référence et documenter les exceptions ;
6. imposer les tokens aux nouveaux écrans ;
7. résorber l'historique par lots dédiés, sans refactor transversal opportuniste.

Les styles calculés, dimensions dépendantes des données et contraintes propres
à un composant peuvent rester locaux. L'objectif est de centraliser les
décisions de design partagées, pas chaque nombre présent dans le CSS.

## Accessibilité et qualité

- les combinaisons texte/fond et états interactifs respectent au minimum le
  niveau de contraste retenu par l'audit d'accessibilité ;
- le focus reste visible dans chaque thème ;
- une information ne dépend jamais uniquement de la couleur ;
- le zoom, les préférences de réduction des animations et les tailles de texte
  restent utilisables ;
- les tokens générés sont déterministes et couverts par des tests ;
- aucun secret, URL temporaire Figma ou dépendance réseau n'est embarqué.

## Documentation attendue de `M02-02`

Le livrable doit expliquer :

- comment ajouter, renommer, déprécier et supprimer un token ;
- comment choisir entre primitive, token sémantique et style local ;
- comment activer et tester les thèmes ;
- comment consommer les tokens sur chaque plateforme ;
- comment vérifier contraste, format, types, tests et build dans Docker ;
- comment revenir à la version précédente du contrat en cas de régression.

Les références visuelles restent les wireframes et le moodboard recensés dans
[`ux-design-references.md`](ux-design-references.md). Elles orientent les valeurs
et composants, mais l'accessibilité et les critères d'acceptation restent
prioritaires.

## Implémentation versionnée

La source de vérité est `design-tokens/tokens.json`. Elle distingue :

- `primitive` pour les valeurs brutes de palette, typographie, grille,
  dimensions, bordures, rayons, ombres, mouvement et superposition ;
- `shared` pour les rôles non colorés communs aux plateformes ;
- `themes.light.color` et `themes.dark.color` pour les rôles sémantiques ;
- `contrastPairs` pour les couples texte/fond contrôlés à la génération ;
- `platform.web.legacyAliases` pour la compatibilité temporaire du Web.

Le script `scripts/generate-design-tokens.mjs` valide les rôles obligatoires,
résout les alias, vérifie les contrastes déclarés, puis génère de façon
déterministe :

- `src/css/design-tokens.css`, adaptateur Web en propriétés personnalisées ;
- `mobile/src/design/tokens.ts`, adaptateur React Native typé et sans unités CSS.

Les fichiers générés portent un avertissement et ne doivent jamais être édités
directement. Ils ne contiennent aucun asset ni URL temporaire Figma.

```bash
# Générer après une modification du contrat
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend && npm run tokens:generate'

# Vérifier sans écrire
docker compose -f docker-compose.agent.yml exec agent-frontend-node \
  bash -lc 'cd my-happy-wallet-frontend && npm run tokens:check'
```

## Consommation

Le Web importe l'adaptateur depuis `App.css`. Un composant doit utiliser un rôle,
par exemple `var(--ds-color-text-primary)`, `var(--ds-space-card)` ou
`var(--ds-radius-control)`. Les anciens noms comme `--orange` restent seulement
des alias de transition : aucun nouveau composant ne doit les employer.

React Native importe les valeurs numériques et thèmes depuis
`mobile/src/design/tokens.ts` :

```ts
import { semantic, themes, type ThemeName } from "@/src/design/tokens";

const themeName: ThemeName = "light";
const backgroundColor = themes[themeName].color.backgroundCanvas;
const padding = semantic.space.card;
```

Les breakpoints ne figurent pas dans les variables CSS. Les seuils documentés
restent tablette `< 1024px` et mobile `< 768px`, utilisables directement dans
les media queries Web ; React Native conserve ses règles de layout propres.

## Thèmes, typographies et pilote

La préférence par défaut est `system`. Le module `src/js/design/theme.js` lit le
contrat, applique `data-theme="light|dark"` pour un choix explicite et persiste
`system`, `light` ou `dark` sous la clé `mhw-theme`. Sans attribut, la media query
`prefers-color-scheme` suit immédiatement le système.

Le sélecteur accessible de la page Profil est le composant pilote. Lui seul et
les fondations globales compatibles consomment les nouveaux rôles ; les écrans
historiques conservent leurs alias pour éviter une migration globale. Les tests
automatisés couvrent le défaut système, la persistance et les deux thèmes.

Barlow est la famille de titre et Open Sans la famille de contenu/action, avec
Arial puis une famille générique en repli. Les fichiers de polices ne sont pas
encore embarqués : leur livraison durable devra accompagner la migration des
écrans, sans dépendre d'un import réseau implicite.

## Évolution et retrait

1. rechercher les consommateurs du token et confirmer qu'il exprime une
   décision répétée ;
2. ajouter d'abord primitive et rôle sémantique dans le contrat ;
3. générer les adaptateurs et ajouter un test de rôle ou de contraste ;
4. migrer les consommateurs dans un lot limité ;
5. pour un renommage, conserver temporairement un alias documenté ;
6. supprimer l'alias seulement lorsqu'une recherche ne trouve plus de
   consommateur et après une version de dépréciation.

Une valeur locale calculée ne devient pas un token. Un changement incompatible
de sens exige un nouveau nom plutôt qu'une réutilisation silencieuse. Pour
revenir en arrière, restaurer ensemble le contrat, le générateur et ses deux
sorties depuis le commit précédent, puis relancer `tokens:check`, les tests et
les builds Web/mobile. Ne jamais restaurer un seul fichier généré isolément.
