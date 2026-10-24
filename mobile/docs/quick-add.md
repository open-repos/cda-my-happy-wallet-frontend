# Ajout rapide sur téléphone

La tâche #274 ajoute un accès global au budget au-dessus de la barre d’onglets,
avec marges de zone sûre. Le bouton flottant apparaît pour une largeur inférieure
à 768 px et disparaît lorsque le clavier ou son formulaire est ouvert. Le
calendrier propose aussi « Ajouter le… » près de sa grille. La sélection du jour
se transmet aux formulaires sans navigation : mois et jour restent sélectionnés
après enregistrement ou annulation.

Les formulaires existants OperationFormModal et MonthlyEventFormModal sont
réutilisés ; le CRUD natif n’est pas refondu. Les valeurs initiales optionnelles
ne changent pas les valeurs par défaut des autres appels.

| Choix                 | Contrat réutilisé                 | Effet                                          |
| --------------------- | --------------------------------- | ---------------------------------------------- |
| Dépense               | POST /operations, DEPENSE         | Réel                                           |
| Entrée                | POST /operations, ENTREE          | Réel                                           |
| Événement confirmé    | POST /events, CONFIRME par défaut | Prévision ; réalisation explicite pour le réel |
| Événement à confirmer | POST /events, POTENTIEL           | Simulation uniquement                          |

Une intention d’opération fictive correspond à un événement POTENTIEL sans
répétition. Aucune opération fictive ne passe par /operations. Les événements
peuvent être une entrée ou une dépense et commencent sans répétition dans ce
parcours. Les contraintes de date des potentiels (mois Europe/Paris courant ou
futur), l’expiration, la confirmation et la réalisation restent celles du backend.
Aucun nouveau contrat ou calcul financier.

Le verrou synchrone du fournisseur ignore les doubles appuis. Une erreur garde
le formulaire et son brouillon ; le message s’affiche dans la fenêtre. Annuler
ne fait aucune écriture. Une réponse HTTP réussie acquitte la création, même si
son corps ne peut être lu : les lecteurs se rafraîchissent indépendamment, sans
rejouer le POST. L’invalidation partagée actualise le calendrier, les synthèses,
événements, prévisions et opérations. Ces dernières conservent la fenêtre des
pages chargées pendant l’actualisation. Le focus revient au déclencheur.

## Validation

QuickAddWriter.test.ts vérifie les routes, dates, sens, statut POTENTIEL et
l’acquittement HTTP. test/visual/quick-add.spec.ts vérifie le jour sélectionné,
le brouillon en échec, l’annulation, les quatre choix et les largeurs de navigation
sur l’export Web. Les captures historiques ne sont pas remplacées automatiquement.

Recette restant propre aux appareils : development build iOS/Android, toucher,
clavier virtuel, zones sûres et orientation, VoiceOver/TalkBack, grandes polices
et focus après fermeture d’une Modal. L’export Web ne vaut pas recette native.
La coordination avec #161/PR #203 préserve les attributs d’état du calendrier.

Six références ont été revues à partir des captures CI du commit 2dc5b47 :
calendrier téléphone/tablette/ordinateur, accueil et opérations téléphone,
et carte d’objectif téléphone sur laquelle le bouton flottant est visible.
Les autres références et les seuils de comparaison restent inchangés.
La synthèse d’accueil, ses graphiques et les analyses écoutent l’invalidation
partagée ; la relecture conserve l’affichage et ne rejoue aucune écriture.
