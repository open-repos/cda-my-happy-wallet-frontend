# Jauge d’objectif Studio sauge — #283

La carte native présente une jauge semi-circulaire ECharts SVG, aux extrémités
arrondies. Elle utilise uniquement le pourcentage de `savedAmount` par rapport
à la cible, plafonné à 100 %. Les versements mensuels prévus et réservations ne
constituent pas une épargne acquise. Le montant déclaré, la cible et le restant
serveur restent disponibles en texte ; un montant déclaré supérieur à la cible
est conservé tel quel.

Le mois d’atteinte est repris de `forecast.estimatedReachMonth`, y compris pour
un objectif en retard. Aucune date ni capacité alternative n’est calculée par
le mobile. Une date inconnue reste « Non calculable » ; l’objectif atteint est
explicite. La date souhaitée et l’effort requis du serveur restent distincts.

La carte utilise les tokens du thème système clair ou sombre, conserve les titres
en entier et garde le rôle accessible `progressbar`, ses valeurs min/max/now et
son nom complet. Le graphique décoratif est caché des lecteurs d’écran. Les
animations restent désactivées. Lorsque le facteur de texte système dépasse 1,3,
le libellé est placé sous l’arc plutôt que dans une zone de hauteur fixe.

Le moteur existant Wuba/SVG et son équivalent d’export Web enregistrent seulement
le type GaugeChart supplémentaire ; aucune dépendance ou entrée Skia ajoutée.
La gestion des objectifs, leurs erreurs, brouillons, invalidations, retours de
focus et l’action « Ajuster le versement » restent inchangées.

## Périmètre

Cette PR livre la jauge et la date native, dans une branche distincte du Web
[#282](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/282).
La courbe comparative et les hypothèses seront traitées dans
[#285](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/285), après
le contrat d’allocation
[backend #131](https://github.com/open-repos/cda-my-happy-wallet-backend/issues/131).
Les maximal/raisonnable ne deviennent pas des statuts et aucune opération n’est
créée par cette présentation. Le parent #281 conserve la suite ouverte.

## Validation

Tests SSR de la vraie jauge ECharts aux pourcentages 0/30/100 dans les deux thèmes,
absence d’animation et réutilisation des dates derrière/en cours/inconnues du
serveur. Les validations du dépôt couvrent format, lint, typage, 240 tests,
Expo Doctor (20/20) et export Web.

Les parcours d’export vérifient l’édition/suppression et l’ajustement depuis la
capacité aux trois formats, plus la jauge et les contrastes à 320/390/768/1440
dans les deux thèmes. Les références existantes du tableau de bord n’ont pas
été régénérées : la jauge globale de l’accueil reste inchangée.

La recette development build Android/iOS reste nécessaire pour les zones sûres,
le rendu SVG Wuba réel, les grandes polices, le toucher et VoiceOver/TalkBack.
L’export Web et les tests SSR ne la remplacent pas. Aucun appareil ni intégration
API/MySQL/Redis disponible dans cet environnement ; les requêtes d’export utilisent
le serveur synthétique du dépôt. Pas de migration ni configuration nouvelle.
