# Comparaison des trajectoires d’épargne Web

Depuis un objectif, « Simuler avec mon budget » ouvre une simulation réversible.
La jauge reste l’épargne déclarée. Le rythme prévu reste disponible sans ouvrir
la simulation ; aucun appel à la nouvelle route n’est nécessaire pour ce mode.

## Source et calculs

La comparaison utilise exclusivement `POST /v1/savings-capacity/trajectories`,
contrat livré dans le backend #132 (code 261df73), requis dès backend **1.6.0**.
React ne calcule ni allocation, capacité, cumul alternatif, date ni statut.
Les trois projections sont distinctes du scénario standard/simulation existant.
La réponse transactionnelle contient les objectifs, réservations, points et dates.
Le mois de référence vient du serveur ; la fenêtre inclut le mois courant et
11 ou 23 versements futurs. Une date non estimable reste explicitement inconnue.

Le mois courant demande uniquement un complément variable **restant** : les
opérations réelles et les événements connus sont déjà comptés. Pour les mois
futurs, l’enveloppe est **supplémentaire** aux dépenses déjà prévues. Aucun montant
historique n’est suggéré automatiquement. La marge est non allouée chaque mois,
ce n’est pas un seuil permanent. Les champs démarrent à zéro ; le bouton
« Appliquer les hypothèses » les transmet sans créer d’opération, d’événement,
d’objectif, de période ou de virement. Un brouillon non appliqué est signalé.
« Réinitialiser » remet ces hypothèses à zéro.

Le solde courant positif reste protégé : il peut déjà contenir l’épargne déclarée.
Les reports négatifs restent à financer. Les engagements des autres objectifs
sont maintenus ; seul le sélectionné reçoit le supplément et aucune somme n’est
réutilisée ou réaffectée automatiquement après atteinte. Les détails affichent
l’allocation de chaque objectif au premier mois futur et les valeurs du mois
courant. Les capacités sont celles du serveur, signées, et peuvent varier selon
le mois ; les montants du premier mois futur sont explicitement datés.

Le graphique distingue les trois courbes par traits et symboles, conserve les
points mensuels, les extrémités arrondies et un lissage léger monotone, sans grille.
Les losanges vides signalent les points non finançables. Une date nominale non
finançable n’est pas présentée comme date d’atteinte estimée. Cible, date souhaitée
et dates finançables dans la fenêtre ont des repères ; les dates restent en texte.

## Cohérence, erreurs et accessibilité

La frontière valide les types, les centimes sûrs, la devise, le scénario, les
hypothèses retournées, les mois, les IDs des allocations et leur cohérence avec
les points. Les champs privés supplémentaires ne sont pas conservés. Un objectif
modifié concurremment n’est pas mélangé à la jauge : un message demande de
recharger les objectifs. La réponse périmée d’un objectif, d’un scénario ou d’une
requête précédente est ignorée. Les invalidations existantes (révision de la
Simulation, focus et visibilité) relancent la lecture. Une erreur réseau garde les
hypothèses et propose une nouvelle tentative. Le chargement cache les anciens
résultats pour ne pas les attribuer à de nouvelles hypothèses.

Tous les réglages et la légende sont accessibles au clavier et au toucher.
Les titres longs sont conservés, les couleurs viennent des tokens existants et
le mouvement réduit désactive les animations. Les trois dates, les capacités,
les allocations et le tableau sont lisibles sans canvas. Le tableau à quatre
colonnes est dans une région de défilement horizontal nommée, focalisable, sans
élargir le document à 320 px ou avec texte agrandi.

## Validation et livraison

Les fixtures de test ont été générées par le service applicatif et le domaine
réels du backend fusionné, avec un adaptateur de données synthétiques. Elles
couvrent deux objectifs, les scénarios, les fenêtres et les hypothèses de
l’exemple d’acceptation. Les tests vérifient aussi les déficits signés, les valeurs
nulles, les contrats invalides, les modifications concurrentes et les réponses
tardives. Les tests navigateur vérifient 320/390/768/1440, les deux thèmes,
200 %, reset/reprise, Simulation et absence d’écriture financière côté client.

L’intégration navigateur locale peut appeler la vraie route Express et les vrais
services backend, alimentés par ces lectures synthétiques. Elle complète la CI
MySQL/Redis du backend ; elle ne remplace pas une recette avec API/MySQL/Redis
entièrement reliés localement. Le parcours ajouté à la stack CI existante couvre
aussi création des objectifs, simulation, allocation et absence de modification
du déclaré via le vrai backend/MySQL/Redis. Son unique référence backend de test
est avancée à df135c2, sans modifier de workflow, de sécurité ou de déploiement.
La recette Safari/iPhone réel reste
à faire sur l’environnement de déploiement.

Web/PWA uniquement ; PR native #288 et ticket de comparaison native #285 séparés.
L’analyse historique #286 reste une deuxième étape. Cette release ne l’annonce pas.
Aucune migration ou nouvelle dépendance. Déployer backend 1.6.0 avant ce frontend.
Retour arrière : revenir au frontend précédent avant de retirer la route backend.
