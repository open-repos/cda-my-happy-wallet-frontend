# Revue du calendrier natif

Source canonique : [Mobile quality 40553207678](https://github.com/open-repos/cda-my-happy-wallet-frontend/actions/runs/40553207678), commit `7d58c771746a1e7553a4df2c49a81a502d3edc72`, artefact `mobile-visual-failure` 12755677774.

Un seul écart de référence : `calendar-mobile-linux.png`, 360 × 740 avant et après. Les 123 autres scénarios passent. L’ancienne image a été comparée à la nouvelle : l’action Ajouter et le jour sélectionné restent visibles, les marqueurs suivent la nouvelle légende, et la rangée réservée sous le défilement empêche le FAB de couvrir les jours ou le détail. Le focus sur le jour conserve sa position visible par un léger défilement ; aucun contenu n’est supprimé. Le lien Prochains mois utilise le rôle du texte secondaire.

[Avant, base develop](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/12682407ffecee226e31a46bcb8f0e9ae5c51c9c/mobile/test/visual/critical-screens.spec.ts-snapshots/calendar-mobile-linux.png) · [Après](../test/visual/critical-screens.spec.ts-snapshots/calendar-mobile-linux.png).

SHA-256 du PNG canonique adopté : `96b78b337c51078dc544eb01f511f8c8b1c7b392ebc10a6f007fef09f0038532`. Aucune référence locale et aucun assouplissement du seuil existant ne sont utilisés.

Les 24 variantes de jour complet du runner (quatre largeurs, deux thèmes, trois projets) vérifient aussi les nouvelles actions natives, leurs icônes et cibles ≥48 px, le contraste ≥4,5:1 du lien et du libellé Simulation, ainsi que la fin du défilement au-dessus du FAB sur téléphone. Les styles/tokens natifs partagés restent distincts de l’adaptateur Web Sauge. La recette appareil iPhone/Android et VoiceOver/TalkBack n’est pas disponible ici.
