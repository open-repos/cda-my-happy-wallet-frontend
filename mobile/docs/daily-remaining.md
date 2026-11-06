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

La grille garde sept colonnes dans une zone défilante horizontale : aucune
cible ne devient inférieure à 48 dp, même à 320 px. Le mode Prévisionnel
réserve 96 dp par colonne ; la largeur minimale suit le `fontScale` natif.
Les textes ne sont ni tronqués ni réduits automatiquement. Les autres modes
conservent leur affichage, avec la même garantie de cible minimale.

Les tests couvrent le parseur, la passerelle HTTP, les valeurs quotidiennes
indépendantes du prévisionnel mensuel, le résumé inchangé, les petits déficits,
le détail et la largeur native avec grandes polices. Les parcours Expo Web
couvrent 320/390/768/1440 px, clair/sombre, texte agrandi à 200 %, sélection au
clavier, annonces et absence de débordement de la page. Expo Web ne simule pas
le `fontScale` système : le texte rendu est agrandi dans les tests navigateur.

La recette sur development build Android Pixel 5 et iOS, grandes polices et
TalkBack/VoiceOver compris, reste à effectuer dans la recette groupée de fin
de parité #213, conformément au report autorisé.
