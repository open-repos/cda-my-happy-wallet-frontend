# Atelier — interface Web/PWA

Issue #328, choix du propriétaire le 29 octobre 2026 après l’audit #326 / PR #327.
Base applicative : Web 1.10.1, develop 038efcd ; formulaires validés de #323.

## Composition commune

`Atelier.css`, chargé après les styles métier, adapte les composants existants
aux rôles Studio Sauge. Les couleurs proviennent de `design-tokens.css` ; aucun
nouveau thème ni nouveau calcul financier. Les feuilles métier conservent les
états, les champs et leurs validations ; la feuille Atelier compose la coque,
les titres, surfaces, listes, barres d’outils, graphiques et actions.

- Navigation explicite dans `SideBar.jsx` / `AtelierNavigation.css` : huit
  destinations avec icônes et libellés, état actif exact et profil/déconnexion.
- Barre latérale de 14 rem à partir de 1200 px ; tiroir en dessous. Les liens
  défilent indépendamment du profil sur écran bas. Le tiroir se ferme à la
  navigation, au redimensionnement et avec Échap ; le contenu devient inerte
  et le focus reste dans les commandes de navigation pendant son ouverture.
- Largeur utile plafonnée à 100 rem, padding adapté au viewport et aux zones
  sûres. Titres sur le canvas avec texte primaire, panneaux opaques et bordures
  sémantiques ; mêmes rôles en clair et sombre.
- Accueil, opérations, fixes, calendrier, prévisions, objectifs/événements,
  analyses, catégories et profil utilisent cette composition. Les pages de
  compte et les états vides adoptent aussi ses surfaces et actions.
- Les enveloppes restent les sections intégrées existantes ; aucune route ou
  dépendance backend ajoutée. Les contrôles date/mois utilisent une largeur
  logique bornée, y compris les filtres d’enveloppes.
- Les prévisions apparaissent après la barre période/horizon/Simulation/Ajouter,
  avant les détails des éléments potentiels et de la méthode. L’ajout passe
  par QuickAdd/FormDialog. Le tableau complet et toutes ses colonnes restent
  disponibles ; les valeurs viennent toujours du serveur.
- Courbe de prévision lissée et monotone, barres arrondies, quadrillage allégé ;
  tableaux et libellés restent les équivalents textuels des graphiques.

## Ajout responsive et saisie

Le rail est une ligne réelle du layout, avec un bouton « + Ajouter » de 48 px
et environ 64 px de hauteur hors safe area. Sa hauteur peut augmenter avec le
texte ; aucune action ne passe derrière. Il fonctionne en portrait et en
paysage étroit, conserve la date du calendrier et disparaît pendant une popup,
la navigation ou une saisie pertinente.

`useVisualKeyboard` observe la hauteur du VisualViewport et le focus éditable,
y compris le retrait du champ lors de la fermeture d’une popup. Les zones de
sécurité restent prises en compte. Le focus retourne au déclencheur visible
après la fermeture ; les champs restent dans la popup et le défilement est
interne. `FormDialog` repositionne les champs éditables, sans déplacer les
boutons pendant leur clic (un déplacement entre pointerdown et pointerup
pouvait annuler le clic dans un viewport réduit).

Les formulaires métier, brouillons Charge/Entrée, validations, contrats API et
édition inline restent ceux de 1.10.1. Aucun calcul ni payload n’a changé.

## Notifications de mutations

`MutationFeedbackProvider` possède l’unique `ToastContainer`, dans un portail
hors du root rendu inerte par FormDialog. `useMutationFeedback` est le point
d’entrée partagé ; `MutationMessage` conserve les erreurs et supprime la copie
locale des succès lorsque le fournisseur commun est installé.

1. Une commande utilisateur possède son verrou de soumission. L’écriture est
   exécutée une fois ; aucun toast de succès dans un effet de rendu/chargement.
2. `acknowledgeMutation` distingue l’écriture refusée d’une réponse HTTP réussie
   mais illisible. Les services d’objectifs et catégories utilisent eux aussi
   `parseAcknowledgedWrite` à cette frontière, sans modifier le contrat API.
3. `useRefreshViews` enregistre les lectures des vues montées. Le coordinateur
   de Simulation attend leurs résultats au lieu de confondre invalidation et
   actualisation réussie. Chaque callback utilise les filtres actuels ; les
   callbacks démontés sont désinscrits. L’invalidation habituelle par révision
   reste disponible pour les retours de focus et changements de contexte.
4. Une confirmation finale française est émise, avec un identifiant unique de
   commande. Les éléments potentiels restent explicitement liés à la Simulation.
   Les chargements, pagination, filtres, changements de thème et relectures
   n’émettent aucune nouvelle confirmation d’écriture.
5. Après un succès suivi d’une relecture échouée, le message conserve le succès
   et précise que les données n’ont pas pu être actualisées. Une commande
   persistante « Recharger les données » reste dans la page, même après fermeture
   du toast. Elle rappelle uniquement les lectures, jamais l’écriture. La
   simulation de trajectoire est un endpoint POST de calcul sans persistance :
   sa relecture ne rejoue aucune commande de création/modification/suppression.
6. Une perte réseau sans réponse serveur produit un résultat incertain, à
   vérifier avant toute nouvelle écriture ; elle ne devient pas un refus certain.
   Les erreurs de champs et refus nécessitant une action restent locaux.

Les confirmations ont un rôle status poli, sans copie LiveMessage. Le toast est
positionné en haut, borné au viewport visible et aux safe areas, et se ferme
avec une commande française accessible de 44 px minimum. Les popups, formulaires
actifs et le clavier diffèrent sa présentation ; le rail d’ajout reste en bas.
Les avis de récupération ne déplacent pas le focus. Aucun résultat financier
ni identifiant de commande n’est stocké durablement.

## Recette et preuves

- Matrice Atelier : neuf pages, 320/390/768/1024/1440/1920 px, clair/sombre,
  texte normal et tailles calculées doublées ; bornes des contrôles inspectées.
- Navigation clavier, Échap, profil/déconnexion, petites hauteurs ; focus visible
  et discret ; vérifications de contraste existantes maintenues.
- Popups, brouillons, éditions inline, champs bornés, clavier simulé et
  restauration de focus ; succès unique et reprise de lecture sans écriture.
- Tests unitaires du fournisseur de notifications : silence au rendu, une seule
  annonce, refus local, écriture reconnue malgré parsing/relecture échoués et
  attente de fermeture du formulaire.
- Tests de régression et comparaison visuelle du dépôt à exécuter sur la tête
  publiée ; conserver les seuils et renouveler uniquement les images justifiées
  par Atelier, avec les fixtures synthétiques.

Les preuves chiffrées finales sont consignées dans la PR. Chromium Linux et
VisualViewport simulé ne remplacent pas WebKit, Safari/PWA, clavier réel,
rotation et VoiceOver sur iPhone physique. La recette physique reste distincte
et suivie en #54. Aucun compte réel ni capture personnelle utilisé pour les
références et tests publics.

## Livraison et retour arrière

Frontend Web/PWA uniquement. Pas de mobile/ Expo, backend, migration, workflow,
configuration de déploiement ou release. Les trois fragments #328 comportent
une ligne user: française. Revue propriétaire requise ; pas de fusion automatique.
Retour arrière par revert de la PR, sans modification des données.
