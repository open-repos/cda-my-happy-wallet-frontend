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

## Édition en ligne (#358)

Dans le tableau (à partir de 64rem), une ligne garde la même géométrie en
lecture et en édition : colonnes en largeur fixe, hauteur de 4,5rem. Chaque
cellule contient un contrôle (2,75rem) et une ligne de message réservée (1rem),
pour une erreur ou un aperçu. Le composant partagé
`src/js/components/CompactOperations/InlineEditing.jsx` (`InlineCell`,
`InlineEditorRow`, `InlineActions`) sert aux opérations ponctuelles et aux
charges et entrées fixes.

- Cellules modifiables : date, libellé, catégorie, type et montant pour une
  opération ; périodicité, libellé, catégorie et montant par échéance pour un
  élément fixe. Le type d’un élément fixe reste verrouillé, et le personnel par
  mois recalculé s’affiche sous le montant.
- Les champs secondaires (devise, rattachement à une enveloppe, part
  personnelle, enveloppe mensuelle, mois d’application) passent par « Plus
  d’options » (⋯). Ce bouton ouvre le formulaire complet en reprenant le
  brouillon. Sans formulaire complet, dans le calendrier, il déplie ces champs
  dans la ligne, qui peut alors grandir. Une erreur sur un champ secondaire
  déplie aussi ces champs dans la ligne, pour montrer l’erreur à côté du champ ;
  le formulaire complet ne l’afficherait qu’après un nouvel enregistrement.
- Erreurs : dans le tableau, la cellule affiche un message court adapté à sa
  largeur (« Invalide, ex. 12,50 ») ; la description accessible du champ garde
  le message complet, affiché en entier sur téléphone. L’erreur renvoyée par
  le serveur s’affiche en entier sous les actions : comme l’échec de chargement
  des catégories, ce n’est pas une erreur de validation et la ligne peut alors
  grandir.
- Clavier : Entrée enregistre depuis un champ de saisie ou une liste native ;
  sur la catégorie (liste à choix enrichi), Entrée ouvre ou valide la liste,
  comme tout combobox. Échap annule
  sans écriture et rend le focus au crayon. Tab suit l’ordre des colonnes, puis
  Enregistrer, Annuler et Plus d’options. Les libellés sont masqués
  visuellement derrière les en-têtes de colonne, mais restent les noms
  accessibles des contrôles.
- Sur téléphone, sous 64rem, l’édition dans la carte est conservée, avec ses
  libellés et tous ses champs.
- En lecture, Supprimer devient une icône nommée dans le tableau, à côté de
  Modifier.
- Une erreur de validation ne fait jamais grandir la ligne. Seuls une erreur
  serveur, l’échec du chargement des catégories (bouton « Réessayer les
  catégories ») et le dépliage des champs secondaires peuvent l’agrandir.

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

### Revue des références de cette refonte

36 captures issues du job CI Web visual regression du commit 563ea6b ont été
revues : opérations dans les trois tailles/deux thèmes, calendriers et Simulation
dans les trois tailles/deux thèmes, et vues authentifiées téléphone avec le
bouton flottant et sa marge de fin. Les références connexion/inscription et les
vues non concernées sur tablette/ordinateur sont conservées. Aucun seuil de
différence, contrôle de contraste ou contrôle de débordement n’a été assoupli.
Les sélecteurs de tableau et le seuil de disposition (1024 px) suivent la
nouvelle liste ; les assertions d’alignement restent actives sur ordinateur.

WebKit a été téléchargé mais ne démarre pas faute de bibliothèques système
(GTK/GStreamer notamment). La recette Safari sur iPhone reste à effectuer.
La pile d’intégration réelle MySQL/Redis n’est pas disponible sans Docker dans
cet environnement ; les parcours locaux utilisent des contrats synthétiques.
