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
