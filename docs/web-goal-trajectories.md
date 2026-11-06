# Objectifs Studio sauge — première livraison Web (#282)

Le design Trajectoire / Studio sauge a été validé le 25 octobre 2026 : jauge
semi-circulaire de l’épargne déclarée, date estimée visible, courbe sans
quadrillage et tracés arrondis, dans les deux thèmes. Cette livraison réutilise
les tokens existants plutôt que de modifier l’identité globale de l’application.

## Contrat et limites

La sélection s’appuie sur tous les objectifs déjà chargés par `goalsService`.
Le titre complet est affiché dans la carte même si le contrôle natif le tronque.
La sélection ne déclenche aucune écriture. Un nouvel objectif créé est sélectionné
après relecture ; le choix existant est conservé tant que l’objectif existe.

La jauge présente `savedAmount / targetAmount`, plafonné à 100 %, et distingue
les montants déclarés des versements prévus. Le restant, le statut, le requis
et le mois d’atteinte viennent du `forecast` serveur. Le mois estimé est affiché
même pour un objectif en retard, sans être remplacé par la date souhaitée.

La courbe échantillonne uniquement le versement mensuel enregistré, en centimes
entiers, à partir du montant déclaré et du mois de référence. Le premier versement
futur est celui du mois suivant, sans ajouter la réservation budgétaire du mois
courant. Les points sont plafonnés à la cible et s’arrêtent au nombre de versements
renvoyé par le serveur ou à la fenêtre choisie (12/24 mois). Un objectif atteint
garde son montant déclaré, même supérieur à la cible ; un versement nul ne produit
pas une fausse courbe d’accumulation. Aucun historique antérieur n’est inventé.

Les dates et statuts ne sont jamais recalculés dans React. Un mois estimé hors de
la fenêtre reste affiché comme résultat serveur, avec la mention « non atteint
dans l’horizon affiché ». Une date inconnue reste inconnue. La courbe est une
projection indépendante au rythme enregistré, pas une garantie de financement.
La synthèse de capacité de tous les objectifs et ses gardes de cohérence restent
inchangées ; les montants de devises différentes ne sont jamais additionnés.

## Découpage explicite

Cette unité ne livre pas encore la comparaison maximal/raisonnable ou les
réglages d’enveloppe variable et de marge. Ces résultats demandent le nouveau
calcul serveur suivi par
[backend #131](https://github.com/open-repos/cda-my-happy-wallet-backend/issues/131).
Le contrat doit être précisé et fusionné avant leur branchement. Aucune route
ou valeur de simulation fictive n’est ajoutée au produit en attendant.

Le parent
[#281](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/281)
garde ce périmètre et l’analyse historique future ouverts. L’adaptation native
est isolée dans
[#283](https://github.com/open-repos/cda-my-happy-wallet-frontend/issues/283).
L’incident iPhone #258 n’est pas résolu par cette refonte et reste séparé.

## Accessibilité et validation

Les valeurs principales restent en HTML, la jauge et la courbe ont des noms
accessibles distincts, et un tableau expose chaque point avec son caractère
déclaré ou projeté. Les pointillés distinguent les projections du point initial.
La cible et le mois souhaité sont aussi disponibles en texte. Le mouvement réduit
désactive les animations ; les chargements, erreurs/reprises, invalidations et
retours de focus du formulaire existant restent conservés.

Tests : échantillonnage exact, zéro/atteint/dépassement, date inconnue ou hors
horizon, changement d’objectif/devise et sélection conservée, reprise et édition.
Les parcours ciblés vérifient 320/390/768/1440 px, clair/sombre, texte 200 %,
contraste et largeur des textes, tableau et clavier. Les contrôles applicatifs
passent avec les données synthétiques ; ils ne remplacent pas une recette sur
Safari/iPhone réel ou l’intégration API/MySQL/Redis jetables.

Les six références de la page Objectifs changent intentionnellement. Elles
ont été relues dans l’artefact canonique du run 40195771223, après correction
du cadrage au début de page. Seules ces six images ont été remplacées ; aucune
tolérance, seuil de contraste ou assertion de géométrie n’a été assoupli.

Pas de migration, configuration, dépendance ou formule serveur modifiée.
Retour arrière : revert de la PR frontend, sans modification des données.
