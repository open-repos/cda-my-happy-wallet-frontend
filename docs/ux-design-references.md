# Références UX et identité visuelle

## Sources Figma

Les écrans Web du MVP peuvent s'appuyer sur deux nœuds du fichier Figma
`CDA - Chef d'oeuvre` :

- [wireframes UX](https://www.figma.com/design/H3SgTwXZrsAh9nlp0SsGgV/CDA-Chef-d-oeuvre?node-id=403-33767&m=dev)
  (`403:33767`) ;
- [moodboard](https://www.figma.com/design/H3SgTwXZrsAh9nlp0SsGgV/CDA-Chef-d-oeuvre?node-id=353-27068&m=dev)
  (`353:27068`).

Ces liens sont des sources externes et mutables. Le fichier et les identifiants
de nœuds doivent donc rester cités dans toute Work Item UX qui les utilise. Une
décision fonctionnelle ou visuelle durable doit être décrite dans le dépôt ; un
lien Figma seul ne remplace pas un critère d'acceptation versionné.

## Rôle de chaque référence

Les wireframes guident en priorité les parcours, la hiérarchie de l'information,
la navigation, l'ordre des actions et les états d'écran. Ils ne demandent pas
une reproduction au pixel près et ne créent pas implicitement une nouvelle
règle métier.

Le moodboard guide l'ambiance visuelle : couleurs, typographie, iconographie,
illustrations, densité et ton. Il sert à faire converger l'identité du produit,
mais ses valeurs brutes ne deviennent des tokens de production qu'après leur
formalisation dans le code.

## Contexte vérifié le 9 août 2026

Le MCP Figma a lu les deux nœuds avec le profil personnel disposant d'un siège
`Dev` sur une offre `Pro`.

Le nœud de wireframes regroupe 27 écrans ou variantes Web en 1440 px :

- connexion, inscription et mot de passe oublié ;
- initialisation puis gestion des charges et revenus fixes ;
- reste à vivre mensuel, hebdomadaire et journalier ;
- états vides et alimentés du tableau de bord ;
- ajout, liste et modification des objectifs et événements fictifs ;
- calendrier mensuel, détail d'un jour et opérations associées ;
- liste vide, partielle et alimentée des opérations ponctuelles ;
- profil, préférences de notification et déconnexion.

Les parcours authentifiés partagent une navigation verticale et des actions
explicites d'ajout ou de modification. Les variantes Figma constituent une
source utile pour identifier états initiaux, vides et alimentés. Les libellés et
règles chiffrées visibles restent des hypothèses de conception tant qu'une
exigence métier ou une décision produit ne les confirme pas.

Le moodboard fournit :

- une variante sombre fond vert `#43553A` avec surface `#343625` ;
- une variante claire fond `#F4F9F0` avec accent `#BFE0A5` ;
- un accent principal corail `#EA7C69` et des couleurs sémantiques secondaires ;
- des exemples de navigation, cartes, boutons, graphiques circulaires et barres ;
- Barlow pour certains titres et libellés, Open Sans pour le contenu et les
  actions.

Le Web possède déjà une partie de ces couleurs sous forme de variables dans
`src/css/App.css`, mais utilise actuellement Oswald comme typographie globale.
Le mobile possède une palette différente et plusieurs valeurs en dur. La
convergence des tokens et polices relève donc de `M02-01` puis `M02-02` et ne
doit pas être réalisée implicitement dans une fonctionnalité métier.

La taxonomie, les adaptateurs Web/mobile, la stratégie de thèmes et la migration
progressive attendus sont définis dans
[`design-system-foundations.md`](design-system-foundations.md).

## Correspondance avec les Work Items UX

La cartographie détaillée et les blocs de description réutilisables sont
maintenus dans
`agent-workspace/docs/agent/FIGMA_UX_CONTEXT.md`. Les principales tâches
concernées sont `M02-01` à `M02-07`, `M03-05`, `M04-04`, `M04-05`, `M05-05`,
`M07-04`, `M07-05` et `M07-06`.

## Hiérarchie d'arbitrage

Lorsqu'une référence Figma entre en tension avec une autre contrainte, appliquer
l'ordre suivant :

1. sécurité, confidentialité et règles métier validées ;
2. critères d'acceptation de la Work Item et exigences versionnées ;
3. accessibilité, responsive et composants/tokens déjà établis ;
4. wireframes pour l'organisation de l'expérience ;
5. moodboard pour l'expression visuelle.

Un écart significatif avec les wireframes ou le moodboard doit être expliqué
dans la Work Item ou la documentation associée. Une ambiguïté qui change un
parcours, une donnée ou une action utilisateur exige un arbitrage produit.

## Procédure pour un agent

Avant une modification UX ou UI :

1. ouvrir les nœuds exacts avec le MCP Figma et relever la date de consultation ;
2. comparer les parcours attendus aux critères d'acceptation et au code existant ;
3. réutiliser les composants et tokens du dépôt avant d'en créer de nouveaux ;
4. adapter la proposition au Web responsive du MVP ;
5. tester au minimum les états nominal, vide, chargement, erreur et les largeurs
   pertinentes lorsque ces états appartiennent au périmètre ;
6. consigner toute décision durable dans le dépôt.

Si le MCP ne peut pas lire le fichier lors d'une session future, l'agent
conserve les liens comme sources, signale précisément le problème d'accès et
n'invente aucun détail visuel. Le contexte vérifié ci-dessus reste exploitable,
mais toute recherche de fidélité visuelle doit relire les nœuds mutables.
