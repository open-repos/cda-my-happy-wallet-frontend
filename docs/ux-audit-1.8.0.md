# Audit Web/PWA et propositions après v1.8.0

Relevé du 27 octobre 2026. Comparaison des tags immuables `v1.7.0` →
`v1.8.0`, puis contrôle de `origin/develop` (`e40de92`). La PR de synchronisation
de release #311 reste ouverte ; develop affiche encore 1.7.0 dans package.json,
mais inclut les mêmes changements fonctionnels que v1.8.0. Aucun merge de cette
PR ni changement de version n'est effectué par cet audit.

## Pourquoi les boutons n'ont pas changé sur iPhone

La release change 65 fichiers : 33 sous `mobile/`, 8 sous `src/`, 24 autres
(tests Web, documentation, preuves, métadonnées de release et CI).
La refonte de boutons livrée par #304 / #297 appartient à React Native/Expo.
Le site installé sur l'écran d'accueil de l'iPhone exécute le bundle React/Vite
du dépôt racine ; il n'importe pas ces composants natifs.

La PR Web #305 / #296 est **ouverte, non fusionnée**, et son code n'appartient
ni à v1.8.0 ni à develop au relevé. Elle contient précisément la primitive
`Actions/Button`, les icônes et le contour/relief du FAB attendus. Il ne s'agit
donc pas de styles d'une refonte Web masqués par un cache. Les notes françaises
de v1.8.0 annoncent les catégories avec icônes et le tableau d'épargne contraint,
pas la refonte des boutons Web. La PR calendrier Web #308 est également ouverte.

## Attendu / implémenté / réellement visible / restant à corriger

| Attendu                                    | Implémenté dans v1.8.0                                        | Réellement visible sur les captures                                                               | Restant à corriger                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Ajouter/Modifier/Supprimer avec icônes     | Composants natifs partagés ; migration Web en PR #305         | Ajouter avec un plus sur certains en-têtes ; autres actions textuelles                            | Valider une direction Web puis intégrer/adapter #305                                               |
| FAB reconnaissable sur olive               | Relief renforcé dans Expo uniquement                          | Capture IMG_3556 : silhouette presque perdue sur le fond                                          | Contour et contraste de surface, élévation testée sur Safari                                       |
| FAB sans masquage                          | Réserve de fin de page Web déjà existante                     | IMG_3557 : recouvre « Simuler avec mon budget » ; IMG_3560 : chevauche un montant                 | Réserver une vraie zone d'action, masquer le FAB pendant l'édition et valider tous les défilements |
| Formulaire compact                         | Aucun changement du formulaire d'événement Web entre les tags | IMG_3558 : champs et actions très hauts ; date déborde de la surface                              | Réduire les espacements, adapter date iOS et largeur ; recette avec clavier                        |
| Annuler/Enregistrer/Supprimer hiérarchisés | Styles Web historiques ; refonte native                       | IMG_3559 : trois gros boutons de même largeur, destruction proche des actions courantes           | Primaire compacte, secondaire discrète, suppression séparée et confirmée                           |
| État vide utile et dense                   | Inchangé côté Web                                             | IMG_3556 : grande carte vide et CTA redondant avec l'en-tête                                      | Un CTA principal, état vide plus court                                                             |
| Choix de catégories avec icônes            | #298 : ChoiceSelect + CategorySelect Web et branchements      | Non évaluables dans ces cinq captures, aucun sélecteur de catégorie ouvert                        | Tester les vrais parcours catégories, ne pas extrapoler aux événements sans catégorie              |
| Objectifs et trajectoires lisibles         | #302 : confinement de largeur du tableau déplié               | IMG_3557 : jauge et date déjà présentes ; pas de changement des boutons                           | Harmoniser les actions ; garder jauge déclarée, courbes et dates serveur                           |
| Calendrier exhaustif                       | Aucun changement de marqueurs Web dans ce diff                | IMG_3560 : ancienne légende et section « Événements à traiter »                                   | Revoir la PR #308 séparément ; ne pas réinventer son contrat                                       |
| Radios réversibles sans perte              | Formulaire contrôlé, identifiants fixes partagés              | IMG_3558/3559 montrent des états différents ; une image seule ne prouve pas la séquence bloquante | Collision de labels corrigée en PR dédiée #312 ; symptôme iPhone à formulaire unique à confirmer   |

## Composants réellement utilisés par la PWA

`src/main.jsx` → `App.jsx` → routes → `ProtectedLayout` →
`SimulationProvider` et `QuickAddProvider`. Font Awesome est déjà disponible
côté Web ; aucune bibliothèque d'icônes supplémentaire n'est nécessaire.

| Zone                      | Composants et styles Web                                                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ajout rapide / FAB        | `src/js/components/QuickAdd/{QuickAddProvider,QuickAddContext}.jsx`, `src/css/QuickAdd.css`                                                                                              |
| Événement prévu/potentiel | `src/js/components/MonthlyEvents/MonthlyEventForm.jsx`, `src/css/MonthlyEvents.css` ; utilisé dans `Objectifs`, `Calendrier`, `PlanningActions`, `SimulationPanel` et `QuickAddProvider` |
| Calendrier / conversion   | `src/js/pages/Calendrier.jsx`, `BudgetCalendar/{PendingOccurrences,RealizeOccurrenceForm}.jsx`, `src/css/BudgetCalendar.css`                                                             |
| Opérations                | `OneOffOperations/{OneOffOperationForm,OneOffInlineEditor,OneOffOperationList}.jsx`, `CompactOperations/CompactMoneyList.jsx`, `src/css/{Operations,CompactMoneyList}.css`               |
| Objectifs / trajectoires  | `FinancialGoals/{FinancialGoalCard,FinancialGoalForm,FinancialGoalsSection,SavingsTrajectorySimulation}.jsx`, `src/css/FinancialGoals.css`                                               |
| Tokens / héritage         | `design-tokens/tokens.json`, adaptateur généré `src/css/design-tokens.css`, `App.css`, `FormControl.css`                                                                                 |

Le nom de dossier des composants ci-dessus est relatif à
`src/js/components/`. Les fichiers absents du diff ne sont pas des nouveautés de
v1.8.0. L'inventaire complet des 65 fichiers est joint dans
`ux-audit-1.8.0-files.txt`.

## Cascade, breakpoints et clavier

- En clair, `actionPrimaryBackground` et `backgroundShell` résolvent tous deux
  vers `green700` : le bouton d'en-tête paraît sans fond sur la coque ; le FAB
  n'a pas de bordure, son ombre `overlay` existe mais distingue peu sa forme.
  Affirmer que le code ne comporte aucune ombre serait inexact.
- Le style global `label` de `FormControl.css` applique la couleur orange.
  Les labels directs du formulaire la remplacent, mais les labels du fieldset
  radio ne redéfinissent pas cette couleur : c'est l'orange visible sur iPhone.
- `MonthlyEvents.css` utilise 64rem et 48rem, `QuickAdd.css` 47.999rem ; la coque
  utilise 1023px et 767px. À 768px certains formulaires sont encore empilés mais
  le FAB est déjà caché : il faut harmoniser ces bornes après validation.
- Sous 48rem, les actions d'événement passent en `column-reverse` et s'étirent.
  La carte d'état vide garde `min-height:22rem`. Les actions de conversion ont
  une répartition de largeur qui fait grandir les boutons quand le texte revient
  à la ligne. Ce sont des choix du CSS Web livré, pas un transfert du natif.
- Le FAB est fixé au viewport et la réserve de 5.5rem est ajoutée seulement à
  la fin de page. Elle permet de dégager le dernier contenu, pas d'empêcher
  qu'un bouton au milieu de page passe derrière le FAB pendant le défilement.
- Safe area présente sur FAB et overlay ; les surfaces QuickAdd défilent et
  utilisent `100dvh`. Aucune adaptation à `visualViewport` n'est implémentée.
  `dvh` ne constitue pas, à lui seul, une preuve que le clavier logiciel iOS ne
  masque aucune action. Pas de barre fixe nouvelle avant recette clavier.
- Les règles de date limitent déjà les largeurs, mais la capture déborde :
  vérifier Safari avec le build exact avant de choisir un correctif. Un profil
  Chromium iPhone ne reproduit pas la métrique native du sélecteur de date iOS.

## Cache PWA : possible délai, pas cause démontrée

Le client conserve volontairement le document ouvert et les saisies pendant
une mise à jour ; activation et rechargement demandent deux actions explicites.
Les fichiers publics utilisent un worker versionné et des assets hashés.
Un ancien document peut donc rester chargé. Sans marqueur de build sur les
captures, impossible d'établir la version effective du document iPhone.
Comparer le marqueur servi avec `pwa-build.json`, le worker contrôleur et les
URLs d'assets lors d'une recette en lecture seule. Aucun vidage de données,
désinstallation ou changement d'infrastructure n'est justifié ici.
Même une PWA fraîchement chargée sur v1.8.0 conserve les défauts décrits : le
code des boutons Web de #305 n'y figure pas.

## Trois directions proposées, aucune appliquée à l'application

| Direction               | Mise en page et interactions                                                                                                                                                     | Avantages                                                                                  | Limites                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Minimal Sauge           | Boutons olive à rayons modérés, icônes fines, secondaire en contour, suppression séparée ; formulaire dans le flux ou dialogue centré ; FAB carré arrondi dans une zone réservée | Continuité Olive Grove, sobriété, moindre densité visuelle, adaptation progressive de #305 | Un carré arrondi évoque moins immédiatement un FAB qu'un cercle ; nécessite un vrai contraste de contour                  |
| Fintech moderne         | Primaire corail sur fond sauge, actions compactes alignées ; panneau latéral desktop, sheet mobile ; FAB rond et menu élevé                                                      | Ajout très identifiable, distinction primaire/secondaire forte, opérations plus denses     | Plus d'élévation et d'accents ; le corail doit garder son sens d'action principale sans être confondu avec la destruction |
| Ergonomie mobile native | Actions proches du contenu, champs groupés ; formulaire en sheet puis panneau sur grand écran ; suppression dans sa propre section ; FAB étendu dans une zone basse réservée     | Compréhension immédiate, cibles confortables, pas de recouvrement du contenu financier     | Change davantage la structure des formulaires ; gestion clavier/safe areas plus exigeante                                 |

Recommandation : **Minimal Sauge** pour le vocabulaire visuel, avec la zone
d'action réservée et la suppression séparée de la direction mobile native.
Cela garde l'identité existante et corrige le masquage au lieu de simplement
renforcer l'ombre. La direction Fintech reste pertinente si le propriétaire
souhaite une rupture visuelle plus marquée.

Les maquettes interactives en conversation couvrent les trois directions,
téléphone/tablette/desktop, clair/sombre, les six actions, FAB fermé/ouvert et
clavier illustré. Le clavier est une simulation de composition, pas une recette
Safari. Les contenus financiers sont fictifs. Les nœuds Figma cités dans
`ux-design-references.md` ne peuvent pas être relus ici : connecteur Figma
indisponible. L'identité reprend le contrat versionné du dépôt, sans prétendre
à une validation du fichier Figma actuel.

## Architecture après choix du propriétaire

Repartir de develop à jour et examiner #305 avant de créer une primitive.
Réutiliser ses composants `Button`, `ActionButton` et `DeleteConfirmation`
après revue, avec icônes Ajouter/Modifier/Supprimer/Enregistrer/Annuler/Convertir.
Éviter de multiplier les sélecteurs de spécificité et les styles par page.
Garder les mutations, confirmations, invalidations et calculs dans leurs
conteneurs/hook/services actuels. Définir les tokens de rôle pour contour et
élévation du FAB, puis générer les adaptateurs ; pas de couleur en dur dans les
composants de production.

Contrat de validation : cibles 44px ; normal/hover/focus/pressed/loading/disabled ;
contrastes texte 4.5:1 et contrôles/focus 3:1 au minimum, sans se reposer sur la
couleur ; réduction des animations ; destruction confirmée avec titre de
l'élément et retour du focus ; dates calendrier préservées ; clavier et zoom
200 % ; 320/390/768/1440, clair/sombre, tests visuels et parcours
ajout/édition/annulation/suppression/conversion ; vérification explicite de
« Simuler avec mon budget » à chaque position de défilement.

Les tests visuels de la refonte et sa recette clavier/FAB restent à faire après
son implémentation autorisée. Ni cet audit ni le correctif radio ne déclarent
ces critères de refonte terminés. Pas de fusion, release ou déploiement.
