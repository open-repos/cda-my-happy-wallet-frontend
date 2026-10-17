# Accessibilité des parcours Web critiques

L'audit du ticket #58 couvre la connexion, l'inscription, la récupération et le
changement de mot de passe, puis la navigation vers le tableau de bord, les
opérations, le calendrier, les objectifs/événements, les catégories et les analyses.
Il suit les priorités d'accessibilité du contexte UX versionné dans
[ux-design-references.md](ux-design-references.md).

## Constats et corrections

| Constat                                                                            | Correction                                                                                  | Vérification reproductible                                                 |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Le contenu des pages était parfois imbriqué dans un second `main`.                 | Un seul repère `main` par page ; conteneur protégé distinct.                                | Tests navigateur sur les routes publiques et privées.                      |
| Les champs d'authentification utilisaient uniquement un placeholder.               | Libellés persistants associés par `for`/`id` et autocomplete adapté.                        | Tests des quatre formulaires, saisie existante inchangée.                  |
| La navigation clavier commençait par tout le menu.                                 | Premier lien « Aller au contenu principal », visible au focus.                              | Tab puis Entrée, sur chaque profil de navigateur.                          |
| Une transition de route ne nommait pas le nouvel écran.                            | Titres fixes par route et focus du contenu après navigation interne.                        | Tests unitaires et navigateur ; aucune valeur de query dans le titre.      |
| La fermeture d'un formulaire perdait son point de départ.                          | Focus initial du champ et retour au déclencheur, ou au contenu si le déclencheur a disparu. | Tests de démontage et ouverture/Échap d'une opération.                     |
| Des icônes du menu répétaient le texte des liens.                                  | Alternatives vides pour les images décoratives.                                             | Inspection du DOM et navigation par noms accessibles.                      |
| Les liens et certains états des formulaires publics avaient des couleurs héritées. | Couleurs sémantiques existantes, soulignement, focus contrasté.                             | Contrastes calculés sur les styles réellement rendus dans les deux thèmes. |
| Le chargement n'avait pas de nom accessible.                                       | Statut « Chargement en cours », annonce polie, animation désactivée si mouvement réduit.    | Tests des états de chargement.                                             |

## Exécution

```bash
npm test
npm run test:e2e:runner
npm run test:e2e:stack
```

La stack et ses garde-fous sont décrits dans [web-e2e-stack.md](web-e2e-stack.md).
Les scénarios de `test/full-stack/journeys/wallet.spec.js` sont exécutés en
Chromium avec profils téléphone, tablette et bureau, en thème clair et sombre.
Les formulaires publics vérifient un contraste d'au moins 4,5:1 pour leurs textes,
placeholders et actions, et 3:1 pour les anneaux de focus sur leur fond extérieur.
Ils vérifient aussi les commandes au clavier, la largeur de 320 pixels CSS et
l'agrandissement du texte à 200 %, sans couper les champs et actions.
Les parcours privés utilisent une vraie session et l'API de test isolée, sans
mutation financière dans les scénarios d'accessibilité.

Ces contrôles automatisés ciblent les régressions constatées. Ils ne constituent
pas une certification WCAG, un audit exhaustif des graphiques, ni un essai manuel
avec VoiceOver/TalkBack ou un appareil iOS/Android. Le zoom testé agrandit le texte
CSS ; il ne prétend pas reproduire toutes les fonctions de zoom des navigateurs.
L'installation PWA appartient aux tickets dédiés.

## Livraison et retour arrière

Aucune configuration, migration, dépendance ou donnée persistante nouvelle.
Les tokens et les fichiers de l'application mobile restent inchangés.
Pour revenir en arrière, révoquer le commit de la PR puis exécuter les validations
Web et la stack E2E avant une éventuelle livraison manuelle. Les tests isolent
les comportements (titre/focus, libellés, retour du focus) pour signaler leur retrait.
