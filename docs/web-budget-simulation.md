# Simulation budgétaire Web

Le calendrier et la vue Prochains mois proposent trois ajouts : opération réelle,
événement prévu et élément potentiel. La date sélectionnée est préremplie ; les
prochains mois proposent aussi un champ de sélection du jour. Le formulaire et
les validations existants sont réutilisés. Une hypothèse ne peut commencer dans
un mois terminé, mais une date antérieure du mois courant reste autorisée.

## Trois états distincts

Une opération réelle modifie le réalisé. Un événement confirmé est prévu, sans
devenir automatiquement réel. Un potentiel est une hypothèse : seul le mode
Simulation l'ajoute aux prévisions et à la capacité d'épargne. La confirmation
conserve son montant, ses dates, son identité et sa récurrence ; sa réalisation
ultérieure reste l'action normale du calendrier.

L'interrupteur est désactivé à l'entrée de la zone authentifiée et n'est jamais
persisté. Le choix suit la navigation dans cette zone et est perdu en la quittant.
Il ne s'agit pas d'un réglage global du backend : chaque requête de synthèse,
d'occurrences, de prévision et de capacité porte explicitement
`scenario=simulation` lorsque demandé. Les requêtes habituelles conservent leurs
paramètres sans scénario. Les réponses d'un autre scénario ou d'une ancienne
révision ne peuvent remplacer la vue courante ; les anciens montants sont
masqués immédiatement pendant le recalcul.

Le réel reste inchangé. Le calendrier, les prévisions, les allocations et la
capacité d'épargne utilisent les résultats API du scénario sélectionné. Une
comparaison présente le reste prévu habituel et celui avec Simulation pour le
mois affiché. Ses deux lectures doivent avoir les mêmes fenêtre, devise et date
de référence ; sinon une erreur propose de réessayer. Aucun calcul financier ni
seuil de soutenabilité n'est ajouté au frontend.

## Gestion des potentiels

Le panneau Simulation liste les règles obtenues par `GET /v1/events?status=POTENTIEL`,
sur toutes les pages. Les DTO conservent le statut, les champs inconnus sont
retirés et les écritures n'envoient ni propriétaire ni identifiant dans le corps.
Les potentiels ont un contour pointillé et un libellé, ainsi qu'un repère propre
dans la grille lorsque la Simulation est affichée. Ils ne proposent aucune
action de réalisation ou d'annulation d'occurrence avant confirmation.

Confirmer, supprimer et vider demandent une confirmation explicite avec annulation
et Échap. La confirmation utilise exclusivement `POST /v1/events/:id/confirm` ;
la modification conserve le statut. `DELETE /v1/simulation/events` ne supprime
que les potentiels. Les actions sont bloquées pendant l'écriture, les doubles
soumissions sont ignorées et les refus restent affichés en français. Une seule
zone de formulaire/confirmation est active à la fois. Le focus entre dans le
formulaire ou l'annulation de confirmation et revient au déclencheur, ou au
contenu si celui-ci a disparu.

Après une action, les lecteurs concernés sont invalidés : liste des hypothèses,
synthèse, grille, prévision, comparaison et capacité d'épargne. Le retour sur la
fenêtre ou l'onglet recharge aussi les données, notamment pour refléter une
expiration survenue pendant une absence.

## Expiration

L'API supprime définitivement les potentiels expirés avant ses lectures concernées.
Le client affiche le premier jour du mois suivant celui de `startDate`, en accord
avec le mois civil Europe/Paris du backend. Pour une série récurrente, cette date
concerne toute la règle, même si des occurrences futures existent. Le client ne
supprime rien de lui-même sur la base de son horloge. Les confirmés restent
conservés. Le détail du contrat et de la migration additive déjà livrée figure
dans `docs/budget-simulation.md` du backend (#112).

## Vérification et livraison

Les suites unitaires `simulationService`, `budgetSimulation`, `simulationContext`,
`simulationReads` et `simulationPanel` couvrent filtres/scénarios, dates, champs
autorisés, confirmation, vidage, focus et réponses obsolètes. Les parcours
`budgetSimulation.spec.js` vérifient le cycle complet aux trois largeurs et l'effet
sur l'épargne sans modifier le réel. La stack réelle ajoute un compte isolé par
profil pour vérifier création, séparation, capacité, confirmation et vidage via
le vrai backend. MySQL/Redis sont requis par cette dernière validation CI.

Aucune migration, variable ou dépendance frontend supplémentaire. Retour arrière
par revert de la PR frontend ; les règles déjà enregistrées restent gérées par
le backend compatible avec le statut. Ne pas revenir à un backend antérieur à
#112 tant que des potentiels existent, conformément à sa documentation.
