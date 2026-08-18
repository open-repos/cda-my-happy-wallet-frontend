# Opérations ponctuelles sur le Web

## Périmètre

La page protégée `/operations` permet de consulter, créer, modifier et
supprimer les entrées et dépenses ponctuelles de l'utilisateur connecté. Elle
couvre les états chargement, vide, alimenté, succès et erreur ainsi que les
affichages mobile, tablette et bureau.

Les wireframes Figma `403:27943`, `403:27962` et `403:27981` ont été consultés
le 18 août 2026 avec le compte projet `andria.capai@gmail.com`. Ils guident la
hiérarchie, la table, les actions et l'état vide. Le rendu consomme les tokens
du design system local et les icônes versionnées `add.svg` et `edit.svg` ; il
n'embarque aucune URL temporaire Figma.

## Architecture

Les responsabilités sont séparées afin de garder le parcours testable et de
limiter le couplage :

- `oneOffOperationsService` adapte et valide le contrat HTTP ;
- `useOneOffOperations` orchestre l'état, la pagination et les mutations ;
- `OneOffOperationForm` porte la saisie et la validation côté client ;
- `OneOffOperationList` rend la collection sans connaître le transport ;
- `ListeOperations` compose le parcours et ses états.

Cette séparation applique le principe de responsabilité unique et permet de
remplacer l'adaptateur HTTP sans réécrire les composants de présentation. Un
service dédié suffit ici : ajouter une abstraction ou une fabrique sans second
transport créerait une indirection sans besoin réel.

## Contrat, pagination et sécurité

Les listes utilisent le contrat curseur `{ data, meta }`. La première page
charge 20 opérations ; `Afficher la suite` transmet uniquement le curseur
opaque renvoyé par l'API et déduplique les identifiants à l'assemblage. Les
catégories, nécessaires au formulaire, sont parcourues par pages de 100 avec
détection d'un curseur répété.

Le client n'envoie jamais d'identifiant de propriétaire : l'identité vient de
la session authentifiée et l'API contrôle l'appartenance des opérations et des
catégories. Les réponses HTTP sont validées à la frontière, les montants sont
strictement positifs avec deux décimales maximum et les erreurs affichées ne
divulguent aucun détail serveur.

## Accessibilité et responsive

La table conserve ses en-têtes sémantiques sur grand écran et devient une suite
de cartes libellées sous 768 px. Les actions ont une cible tactile d'au moins
44 px, le focus reste visible, les messages utilisent `status` ou `alert`, et
les informations de type associent libellé et couleur. La préférence de
réduction des animations désactive le mouvement du chargeur.

## Vérification

Les tests Vitest couvrent le contrat, les curseurs, la déduplication, les états
d'interface, la validation et les mutations sans donnée de propriétaire. Le
parcours Playwright vérifie le chargement d'une page suivante sans doublon et
les tailles mobile, tablette et bureau. Format, lint, vérification des types,
tests et build sont exécutés dans les conteneurs du projet.
