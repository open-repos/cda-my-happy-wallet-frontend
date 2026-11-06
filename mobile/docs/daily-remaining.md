# Reste à vivre du jour — #386

Le mode Prévisionnel affiche uniquement `days[].dailyRemaining`, chaîne
monétaire décimale du contrat backend #179 et du Web #379. Le parseur conserve
les valeurs négatives et normalise un champ absent ou nul à `null` ; un champ
malformé produit l’erreur de synthèse existante. Aucun montant mensuel ni
`forecastRemaining` ne remplace une valeur quotidienne manquante. Les cartes
et le résumé mensuel gardent leur contrat et leurs valeurs.

Le détail du jour reprend la valeur exacte et la phrase explicative du Web.
La case annonce « reste à vivre du jour », son contenu et son état sélectionné.
Seul un changement de sélection demandé sur le calendrier actif est annoncé via `announceForAccessibility` sur
appareil et une région live sur Expo Web ; les relectures restent silencieuses. Les montants compacts négatifs gardent
leur signe, y compris sous 0,50 €, sans changer l’arrondi du mode Dépenses.
Les couleurs utilisent `dataIncome` et `dataExpense` du thème courant ; une
case sélectionnée utilise le texte contrasté de l’action sélectionnée.

La grille affiche sept colonnes de largeur égale dans la largeur disponible,
sans défilement horizontal et sans élargissement lié au `fontScale`. Les
montants compacts suivent la police système jusqu’à ×1,3, puis restent à cette
taille (`maxFontSizeMultiplier: 1.3`). Aucune troncature, limitation à une ligne
ou réduction automatique ne leur est appliquée. Le détail du jour continue de
suivre la taille de police complète ; le libellé accessible conserve le montant
exact à toutes les tailles.

Chaque cible conserve une hauteur d’au moins 48 dp. Sept cibles de 48 dp de
large nécessitent au moins 336 dp disponibles, avant les marges du calendrier ;
ce minimum est respecté sur Pixel 5. La largeur réelle d’une case est la largeur
disponible divisée par sept. Sur les petits écrans (environ moins de 378 px avec
les marges actuelles), la décision du propriétaire donne priorité aux sept
colonnes visibles : la largeur des cibles peut donc être inférieure à 48 dp,
notamment à 320 px, tandis que leur hauteur reste d’au moins 48 dp.

Les tests couvrent le parseur, la passerelle HTTP, les valeurs quotidiennes
indépendantes du prévisionnel mensuel, le résumé inchangé, les petits déficits,
le détail et la largeur native avec grandes polices. Les parcours Expo Web
couvrent 320/390/768/1440 px, clair/sombre, texte à ×1, ×1,3 et ×2, sélection au
clavier, annonces et absence de débordement de la page. Expo Web ne simule pas
le `fontScale` système ni `maxFontSizeMultiplier` : le texte rendu est agrandi
dans les tests navigateur, avec le plafond natif partagé appliqué uniquement
aux montants compacts. Le détail est vérifié à la taille système complète.

Le [commentaire du propriétaire](https://github.com/open-repos/cda-my-happy-wallet-frontend/pull/398#issuecomment-6695527598)
documente la recette déjà effectuée sur `a1d7d44` : Pixel 5 / Android 35,
contrat, signes, détail, sélection, annonces et thème sombre conformes. La
nouvelle grille doit être revérifiée sur ce development build à ×1, ×1,3 et ×2.
TalkBack avec la voix et iOS restent à couvrir dans la recette groupée #213.

Le bouton Prévisionnel coupé à ×1,3 et la relecture du mois au retour par
l’onglet sont des défauts antérieurs explicitement hors périmètre ; cette
modification ne change ni le sélecteur de modes ni les hooks de relecture.

Les références visuelles sont produites par la CI puis inspectées et copiées
sans modification. La [revue du calendrier](calendar-visual-review.md) documente
leur provenance, leurs empreintes et les différences attendues avec la grille
précédente à défilement horizontal.
