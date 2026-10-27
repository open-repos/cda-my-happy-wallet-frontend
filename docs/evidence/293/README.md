# Revue du calendrier Web/PWA

Les six références calendrier hors Simulation proviennent du [run canonique 40550833537](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/40550833537), commit `beaec6c2d0fa74c3939a10c09ed541bf547e35f5`, artefact 12754527783. Elles ont été comparées aux anciennes images aux trois largeurs, en clair et sombre. Les montants de synthèse sont inchangés ; le détail commun remplace les deux anciennes listes. Les opérations fictives d’août ne sont plus montrées dans le mois d’octobre. Les parcours mixtes à 122 opérations couvrent séparément les données du mois et leur pagination.

La première revue a refusé les boutons étirés sur téléphone : le flex est désormais neutralisé dans la colonne et les tests contrôlent 44 à 80 px avant zoom, sans fixer de hauteur maximale en production. Le focus clavier et les annulations sont couverts.

Les six vues Simulation attendent une dernière capture avec le lien de gestion contrasté et sa cible de 44 px. Les références des autres écrans restent inchangées. Aucun seuil visuel ni workflow modifié ; aucune référence générée par le navigateur local. Les captures de CI sont synthétiques et ne remplacent pas une recette iPhone Safari/PWA/VoiceOver.
