# Navigation mobile protégée

## Parcours

Le groupe Expo Router `(app)` est réservé à une session authentifiée par le
garde `Stack.Protected` du layout racine. Il présente cinq destinations sous
forme d'onglets natifs : tableau de bord, calendrier, objectifs et événements,
opérations ponctuelles et profil.

Cette adaptation reprend la navigation verticale du wireframe Figma
`403:27548`, consulté le 22 août 2026, tout en suivant la convention mobile
Android/iOS. Les écrans métier encore planifiés restent des destinations
explicites et seront remplacés dans leurs Work Items respectives sans changer
le contrat de navigation.

## Architecture

`src/navigation/appDestinations.ts` constitue la source de vérité typée des
routes, libellés accessibles et icônes. Le layout est responsable uniquement
de l'intégration Expo Router. `DestinationScreen` mutualise la structure
accessible des destinations en attente de leur parcours métier.

Les couleurs, espacements, tailles et rayons viennent des tokens générés. Les
icônes Ionicons déjà embarquées évitent toute URL Figma temporaire. Chaque
onglet et action conserve une cible tactile d'au moins 48 px.

## Session et sécurité

Les onglets ne sont montés que pour une session authentifiée ou en cours de
rotation. Une déconnexion réussie ou locale fait basculer automatiquement vers
le groupe `(auth)`. Aucun token, identifiant propriétaire ou secret n'est
transmis par la navigation ; le profil affiche uniquement l'adresse déjà
présente dans l'état de session.

## Validation

La configuration est testée pour garantir l'unicité des routes, leurs libellés
accessibles et leurs états d'icône. Format, lint, type-check, tests, Expo Doctor
et export sont exécutés dans Docker. Le development build Android est ensuite
installé sur l'émulateur et contrôlé pour la navigation, le bouton Retour, la
reprise de session et la déconnexion.
