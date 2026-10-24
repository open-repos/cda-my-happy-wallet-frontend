# Listes compactes et création au budget

Décision produit #273 : une ligne par entrée/dépense, présentation commune aux
opérations ponctuelles et fixes. Le mobile déplie les détails dans la liste en
touchant le libellé. Le signe du montant et le libellé du type complètent la
couleur. Les catégories et icônes personnelles sont conservées.

La recherche (libellé/catégorie) et les filtres Tout, Dépenses/Charges, Entrées
portent uniquement sur les éléments déjà chargés. « Charger plus » poursuit la
pagination de l’API ; les nombres ne prétendent pas représenter toute la base.
Les tris existants des fixes restent disponibles. L’édition désactive les
filtres et fige l’ordre des lignes jusqu’à Enregistrer ou Annuler.

L’éditeur remplace les cellules de la ligne et se déplie dans le même élément
sur téléphone. Aucune sauvegarde au changement ou au flou. Le premier champ
reçoit le focus, puis le crayon le récupère après annulation/enregistrement.
Les validations civiles et monétaires sont partagées avec l’ajout existant.
Une erreur conserve le brouillon. Un verrou synchrone empêche la double
soumission. La corbeille demande une confirmation nommant l’opération ; annuler
n’envoie aucune requête de mutation.

## Un seul accès aux formulaires existants

Le bouton près du calendrier et les actions PlanningActions ouvrent les mêmes
OneOffOperationForm/MonthlyEventForm que le bouton flottant authentifié. Ce
bouton est réservé aux écrans de téléphone Web/PWA (< 768 px), avec marges de
zone sûre. Il disparaît pendant la création et se désactive pendant l’édition.
Les dialogues ne servent qu’à créer ; Échap et Annuler rendent le focus au
bouton d’origine. Aucun changement de route, de mois ou de jour après succès.

| Intention            | Modèle et écriture existants                                 | Effet                                       |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| Opération réelle     | POST /v1/operations, kind DEPENSE ou ENTREE, date/categoryId | Réel                                        |
| Opération fictive    | Événement POTENTIEL à récurrence AUCUNE                      | Simulation seulement                        |
| Événement réel/prévu | POST /v1/events, CONFIRME par défaut                         | Prévision ; le réel change à la réalisation |
| Événement fictif     | POST /v1/events, status POTENTIEL                            | Simulation seulement                        |

L’interface propose donc Dépense, Entrée, Événement confirmé et Événement à
confirmer. Une opération fictive n’est jamais envoyée sur /operations. Le
formulaire d’événement permet les deux sens, sans récurrence par défaut dans
ce parcours. Confirmation, expiration Europe/Paris, récurrence et réalisation
conservent les règles serveur. Aucun calcul financier n’est ajouté.

Audit : backend develop 2f2b43b, docs/budget-simulation.md et contrôleurs
OneOffOperationController/MonthlyEventController. Aucun nouveau statut, route,
champ ou migration nécessaire. La confirmation reste réservée à /events/:id/confirm.

## Diagnostic des dates et largeur

La capture iPhone n’était pas jointe dans l’environnement de développement.
Le dépassement décrit n’a pas été reproduit sous Chromium avec le formulaire
initial aux largeurs 320, 390, 768 et 1440 px. Une reproduction sur Safari iOS
reste nécessaire : ne pas présenter la cause Safari comme confirmée.

Le risque identifié dans le code est l’autominimum des éléments flex/grid,
combiné à la largeur intrinsèque du contrôle natif date et à width:100% avec
padding/bordure. Les règles locales des formulaires d’opération, d’événement
et de planification fixent min-width/min-inline-size:0, max-width:100% et
box-sizing:border-box, y compris dans les parents. Le montant utilise
minmax(0,1fr) à côté de la devise. Le formulaire de création réutilisé depuis
le calendrier reçoit exactement ces contraintes. Aucun overflow-x:hidden ne
masque un champ. Le conteneur global de création enveloppe le contenu pour
respecter le parent flex de la zone authentifiée.

## Écriture et relecture

Une réponse HTTP réussie acquitte l’écriture, même si son DTO ne peut être lu.
L’éditeur se ferme et les vues s’invalident. Une erreur de relecture garde les
données visibles et propose « Réessayer l’actualisation » (GET seulement).
Les pages chargées des opérations sont relues sans perdre la fenêtre paginée.
Ne jamais rejouer le POST/PUT pour réparer une lecture.

## Recette

- Playwright compactOperations : 320/390/768/1440, deux thèmes, texte 200%,
  date bornée, montant/devise, édition, erreur/brouillon, focus, annulation,
  calendrier et POTENTIEL, relecture seule après succès.
- Parcours fixes : tri, catégories/icônes, édition explicite et calculs existants.
- Sur iPhone réel : ouvrir depuis liste/calendrier/FAB, choisir la date native,
  clavier virtuel, texte agrandi, zones sûres, orientation, absence de défilement
  horizontal et lisibilité devise. Safari/WebKit n’est pas couvert par Chromium.
- Les captures de référence ne doivent être remplacées qu’après revue des écarts
  attendus de la nouvelle liste et du bouton flottant.
