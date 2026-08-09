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

Si le MCP ne peut pas lire le fichier, l'agent conserve les liens comme sources,
signale précisément le problème d'accès et n'invente aucun détail visuel. Au
9 août 2026, le compte MCP connecté possède un siège Figma `View`, tandis que la
lecture de contexte demandée par le connecteur requiert un accès `Edit` au
fichier. Le contenu graphique de ces nœuds reste donc à auditer après correction
de l'accès.
