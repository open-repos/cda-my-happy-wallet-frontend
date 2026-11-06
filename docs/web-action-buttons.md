# Actions Web/PWA — Minimal Sauge et ergonomie mobile

Direction A avec zone d'action réservée de C validée par le propriétaire le
27 octobre 2026, après l'audit de v1.8.0 (#316/#317). Le retour supplémentaire
sur le focus demande de supprimer l'écart visuel autour des contrôles.

## Composants et rôles

`Button` ne connaît que présentation, type, ref, icône injectée et états
busy/disabled. `ActionButton` adapte Ajouter, Modifier, Supprimer, Enregistrer,
Annuler, Convertir, Simuler, Appliquer, Réinitialiser et Confirmer à Font Awesome.
Les services, calculs, confirmations et invalidations restent dans les conteneurs.
Le type par défaut reste button ; submit est explicite. Les libellés restent
visibles, les icônes décoratives ne créent pas un second nom accessible.

`FormActions` conserve l'ordre validation puis destruction dans le DOM et dans
l'affichage. `DeleteConfirmation` conserve la confirmation nominative et focalise
Annuler, puis rend le focus au déclencheur. Les actions inline se voient sans
survol. Cibles ≥44 px, texte multilignes et repli avec texte agrandi.

Les rôles `--web-action-*` d'ActionButton.css consomment le contrat partagé sans
changer sa palette native : primaire = textSecondary/textInverse (olive en clair,
sauge en sombre), secondaire = surface/textPrimary, destruction = paire
statusErrorSurface/statusErrorText. Aucun noir implicite sur une surface sombre.
ActionForms.css neutralise notamment le label orange global du fieldset et
spécifie couleur de texte et de remplissage des champs natifs. Les états normal,
survol, pressé, focus, occupé et désactivé sont définis. Le focus clavier utilise
un contour de 2 px, **outline-offset: 0**, au rayon du contrôle, sans halo détaché.
Les animations respectent prefers-reduced-motion.

## Consommateurs

- événements prévus/potentiels et objectifs : formulaires, listes et états vides ;
- opérations ponctuelles et charges/entrées fixes : formulaires, édition inline
  et commandes de liste ;
- calendrier : ajout daté, conversion et annulation d'occurrence ;
- simulation et trajectoires : actions Simuler, Appliquer et Réinitialiser ;
- catégories : commandes et formulaire existant ; ajout rapide : menu et formulaires.

Les graphiques, leurs calculs et les contrats serveur sont conservés.

## FAB, défilement et clavier

Sur mobile (<768 px), la racine occupe le viewport visible. Le contenu protégé
possède une zone de défilement qui se termine **au-dessus** d'une rangée d'ajout
opaque. Le FAB carré arrondi garde son icône, sa date et son menu, avec contour
contrasté et ombre. La rangée inclut la safe area ; elle ne se superpose plus aux
cartes ni à « Simuler avec mon budget ». Desktop et tablette gardent leurs ajouts
contextuels existants. Aucun changement de navigation métier.

La rangée disparaît pendant une création rapide ou une édition d'événement,
objectif, opération, catégorie ou charge fixe ; les boutons d'édition inline restent dans
le contenu. Les confirmations ne réinitialisent pas les champs.
`useViewportBounds` suit resize/scroll de visualViewport (repli sur innerHeight),
puis retire les écouteurs au démontage. Le dialogue défilant utilise la hauteur
et l'origine du viewport visible pour rester au-dessus du clavier. Les actions
restent dans le flux du formulaire, sans nouveau footer fixe. Le retour de focus
attend le nettoyage du formulaire enfant avant de restaurer le déclencheur.

Le correctif d'identifiants de #315 est intégré à la branche de travail pour
éviter la collision entre formulaires. #315 reste une PR indépendante ; fusionner
le correctif radio avant la présente PR permet d'en réduire le diff. L'accès au
FAB est désormais masqué lorsqu'un formulaire de page est ouvert ; le test
navigateur protège ce nouveau comportement, tandis que le test unitaire conserve
la couverture de deux instances indépendantes.

## Validation et preuves

- Commandes Web d'AGENTS.md : format/lint, suites API/RaV/token/release,
  type-check, **628 tests Vitest**, build ; aucune dépendance ajoutée.
- `actionDesign.spec.js` mesure les couleurs calculées du texte contre son
  ancêtre opaque (≥4.5:1) sur les cartes, menus et formulaires, à 320/390/768/1440
  clair/sombre. Il vérifie au clavier le contour de focus de 2 px sans offset,
  la réserve du FAB, les brouillons et le zoom texte 200 %.
- Le redimensionnement de visualViewport est simulé : les actions restent dans
  les bornes visibles et les valeurs sont conservées. Les tests unitaires
  vérifient également le nettoyage des écouteurs et le repli sans visualViewport.
- Parcours conversion, suppression nominative et annulation ; suites existantes
  opérations compactes, édition inline, radios, récurrences, simulation et
  trajectoires d'épargne : **47 parcours Chromium réussis**. La matrice complémentaire
  responsive/catégories/charges/comparaison d'épargne couvre 136 parcours, soit
  183 parcours distincts au total. Les deux écarts initiaux ont été résolus :
  ancrage du radio d'icône dans sa tuile et adaptation du contrôle d'ancien
  bouton icône seule au nouveau libellé visible, avec cible ≥44 px et icône 16 px.
- [Captures avant/après, archivées au tag v1.11.0](https://github.com/open-repos/cda-my-happy-wallet-frontend/blob/v1.11.0/docs/evidence/296/README.md) : mêmes données fictives et
  navigateur à 390/1440 px, clair/sombre, depuis v1.8.0 puis cette branche.

La configuration locale utilise un Chromium disponible hors dépôt : aucun
changement de package, workflow ou configuration d'exécution versionnée.
Les nouvelles captures sont des preuves de revue ; les références canoniques
existantes ne sont pas remplacées par des rendus d'un autre environnement.
La recette Safari iPhone/PWA/VoiceOver et le vrai clavier iOS ne sont pas
accessibles ici ; une simulation de viewport n'est pas une recette appareil.

Retour arrière : revert de la PR, sans migration ni changement de configuration.
Aucune fusion, release ou mise en production dans cette mission.
